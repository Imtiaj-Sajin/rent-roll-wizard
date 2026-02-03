import pdfplumber
import pandas as pd
from collections import defaultdict
from typing import Dict, List, Any


def extract_rent_roll(pdf_path: str) -> Dict[str, Any]:
    """
    FINAL ROBUST EXTRACTION using wall-based column boundaries.
    
    Key improvements:
    1. Walls are calculated as midpoints between header end and next header start
    2. First column: 0 to first wall
    3. Middle columns: wall-to-wall
    4. Last column: last wall to page width
    """
    
    with pdfplumber.open(pdf_path) as pdf:
        # --- STEP 1: ANALYZE HEADER AND CALCULATE WALLS ---
        analysis_page = pdf.pages[2]  # Page 3 has good structure
        words = analysis_page.extract_words(keep_blank_chars=False)
        
        # Find header row
        header_anchor = next((w for w in words if "Occupant" in w['text']), None)
        if not header_anchor:
            raise ValueError("ERROR: Header row not found")
        
        header_top = header_anchor['top']
        header_bottom = header_anchor['bottom']
        
        # Get all header words, sorted left to right
        header_words = [w for w in words if abs(w['top'] - header_top) < 3]
        header_words.sort(key=lambda x: x['x0'])
        
        # --- STEP 2: CALCULATE WALLS (COLUMN BOUNDARIES) ---
        walls = []
        
        # Calculate walls between adjacent headers
        for i in range(len(header_words) - 1):
            curr_header = header_words[i]
            next_header = header_words[i+1]
            
            # Wall = midpoint between current header end and next header start
            wall = (curr_header['x1'] + next_header['x0']) / 2
            walls.append(wall)
        
        # --- STEP 3: DEFINE COLUMN BOUNDARIES ---
        column_defs = []
        
        for i, hw in enumerate(header_words):
            col_name = hw['text']
            
            # Determine column start and end based on walls
            if i == 0:
                # First column: from page start (0) to first wall
                col_start = 0
                col_end = walls[0]
            elif i == len(header_words) - 1:
                # Last column: from last wall to page end
                col_start = walls[-1]
                col_end = analysis_page.width  # or 800
            else:
                # Middle columns: from previous wall to next wall
                col_start = walls[i-1]
                col_end = walls[i]
            
            column_defs.append({
                'name': col_name,
                'x_start': col_start,
                'x_end': col_end
            })
        
        # --- STEP 4: EXTRACT DATA FROM ALL PAGES ---
        all_rows = []
        
        for page_num, page in enumerate(pdf.pages):
            page_words = page.extract_words(keep_blank_chars=False)
            
            # Get words below header
            data_words = [w for w in page_words if w['top'] > header_bottom + 5]
            
            # Group words by Y-position (rows)
            rows_dict = defaultdict(list)
            for word in data_words:
                y_key = round(word['top'])
                rows_dict[y_key].append(word)
            
            # Process each row
            for y_pos in sorted(rows_dict.keys()):
                row_words = rows_dict[y_pos]
                row_words.sort(key=lambda x: x['x0'])
                
                # Initialize empty row
                row_data = [""] * len(column_defs)
                
                # Assign each word to its column based on walls
                for word in row_words:
                    word_x = word['x0']
                    word_text = word['text']
                    
                    # Find which column this word belongs to
                    assigned = False
                    for col_idx, col_def in enumerate(column_defs):
                        if col_def['x_start'] <= word_x < col_def['x_end']:
                            # Add to column (handle multiple words per cell)
                            if row_data[col_idx]:
                                row_data[col_idx] += " " + word_text
                            else:
                                row_data[col_idx] = word_text
                            assigned = True
                            break
                
                # --- FILTERS ---
                if not any(row_data):
                    continue
                
                first_cell = row_data[0].lower().replace(" ", "")
                if any(keyword in first_cell for keyword in [
                    'page', 
                    'database',    
                ]):
                    continue
                
                all_rows.append(row_data)
        
        # --- STEP 5: BUILD RESULT ---
        column_names = [cd['name'] for cd in column_defs]
        
        # Convert to list of dicts for JSON
        rows_as_dicts = []
        for row in all_rows:
            row_dict = {}
            for i, col_name in enumerate(column_names):
                row_dict[col_name] = row[i] if i < len(row) else ""
            rows_as_dicts.append(row_dict)
        
        return {
            "columns": column_names,
            "rows": rows_as_dicts,
            "meta": {
                "pages": len(pdf.pages),
                "total_rows": len(all_rows),
                "debug": {
                    "header_words": [
                        f"{hw['text']} [x0:{hw['x0']:.1f}, x1:{hw['x1']:.1f}]" 
                        for hw in header_words
                    ],
                    "walls": [f"{w:.1f}" for w in walls],
                    "column_defs": [
                        f"{cd['name']}: {cd['x_start']:.1f}-{cd['x_end']:.1f}" 
                        for cd in column_defs
                    ]
                }
            }
        }
