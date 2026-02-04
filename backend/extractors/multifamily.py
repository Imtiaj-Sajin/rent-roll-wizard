import pdfplumber
import pandas as pd
from typing import Dict, List, Any


def extract_rent_roll(pdf_path: str) -> Dict[str, Any]:
    """
    Multifamily rent roll extraction using grid-based detection.
    Uses PDF edges/lines to detect cell boundaries.
    """
    
    pdf = pdfplumber.open(pdf_path)
    
    # ==========================================
    # PHASE 1: Define Master Columns (From Page 0)
    # ==========================================
    p0 = pdf.pages[0]
    v_lines = [e for e in p0.edges if e['orientation'] == 'v']
    header_v_lines = [line for line in v_lines if 90 <= line['top'] <= 95]
    
    x_coords = sorted([line['x0'] for line in header_v_lines])
    unique_x = []
    if x_coords:
        unique_x.append(x_coords[0])
        for x in x_coords[1:]:
            if x - unique_x[-1] > 5:
                unique_x.append(x)

    all_pages_data = []

    # ==========================================
    # PHASE 2: Iterate All Pages & Extract Raw Data
    # ==========================================
    for i, page in enumerate(pdf.pages):
        # Detect Rows for THIS specific page
        h_lines = [e for e in page.edges if e['orientation'] == 'h']
        row_lines = [line for line in h_lines if line['width'] > 600]
        y_coords = sorted([line['top'] for line in row_lines])
        
        unique_y = []
        if y_coords:
            unique_y.append(y_coords[0])
            for y in y_coords[1:]:
                if y - unique_y[-1] > 5:
                    unique_y.append(y)

        if len(unique_y) < 2:
            continue

        # Extract Grid
        for r in range(len(unique_y) - 1):
            row_data = []
            for c in range(len(unique_x) - 1):
                cell_box = (unique_x[c], unique_y[r], unique_x[c+1], unique_y[r+1])
                try:
                    text = page.crop(cell_box).extract_text()
                    clean_text = text.replace('\n', ' ').strip() if text else ""
                except:
                    clean_text = ""
                row_data.append(clean_text)
            
            all_pages_data.append(row_data)

    pdf.close()

    # ==========================================
    # PHASE 3: Clean and Merge Rows
    # ==========================================
    final_data = clean_and_merge_rows(all_pages_data)
    
    if not final_data:
        return {
            "columns": [],
            "rows": [],
            "meta": {
                "pages": len(pdf.pages) if pdf else 0,
                "total_rows": 0
            }
        }
    
    # First row is header
    column_names = final_data[0]
    data_rows = final_data[1:]
    
    # Convert to list of dicts for JSON
    rows_as_dicts = []
    for row in data_rows:
        row_dict = {}
        for i, col_name in enumerate(column_names):
            row_dict[col_name] = row[i] if i < len(row) else ""
        rows_as_dicts.append(row_dict)
    
    return {
        "columns": column_names,
        "rows": rows_as_dicts,
        "meta": {
            "pages": len(pdf.pages) if hasattr(pdf, 'pages') else 0,
            "total_rows": len(rows_as_dicts)
        }
    }


def clean_and_merge_rows(raw_data: List[List[str]]) -> List[List[str]]:
    """
    Fixes the issue where data spills over to the next page/row.
    Logic: If a row has an EMPTY 'Unit' (Col 0) but has data elsewhere,
    it is merged into the previous row.
    """
    if not raw_data:
        return []

    # 1. Separate Header from Data
    header = raw_data[0]
    data_rows = raw_data[1:]

    # 2. Filter out repeated headers (from multiple pages)
    # We assume Column 0 is "Unit". We remove rows where Col 0 says "Unit"
    cleaned_rows = [row for row in data_rows if row[0] != "Unit"]

    merged_data = []
    if not cleaned_rows:
        return [header]

    # Start with the first data row
    current_primary_row = cleaned_rows[0]

    for i in range(1, len(cleaned_rows)):
        next_row = cleaned_rows[i]
        
        # CHECK: Is this a "Spillover" row?
        # Condition: Unit (Col 0) is Empty AND it has some content in other columns
        has_no_unit = (next_row[0] == "")
        has_content = any(cell != "" for cell in next_row)
        
        if has_no_unit and has_content:
            # === MERGE LOGIC ===
            # Combine next_row into current_primary_row
            new_merged_row = []
            for k in range(len(current_primary_row)):
                val_main = current_primary_row[k]
                val_spill = next_row[k]
                
                # Join with space if both exist, otherwise take whichever exists
                if val_main and val_spill:
                    new_merged_row.append(f"{val_main} {val_spill}")
                else:
                    new_merged_row.append(val_main + val_spill)
            
            # Update the primary row with the merged result
            current_primary_row = new_merged_row
        else:
            # It's a normal new row. Save the finished primary row and start a new one.
            merged_data.append(current_primary_row)
            current_primary_row = next_row

    # Append the final processing row
    merged_data.append(current_primary_row)

    # Return Header + Merged Data
    return [header] + merged_data
