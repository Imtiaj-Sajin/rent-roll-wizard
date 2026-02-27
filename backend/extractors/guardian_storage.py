import pdfplumber
import re
from collections import defaultdict
from typing import Dict, List, Any


def get_table_top(page, min_line_width=400):
    """
    Returns the `top` of the first wide horizontal line on the page.
    Everything ABOVE this top value is metadata (title, address, date, etc.)
    """
    h_lines = [
        e for e in page.edges
        if e['orientation'] == 'h' and e['width'] >= min_line_width
    ]
    if not h_lines:
        return 0
    return min(e['top'] for e in h_lines)


def extract_column_definitions(page):
    table_top = get_table_top(page)

    words = page.extract_words(keep_blank_chars=True)
    if not words:
        return []

    # Only keep words AT OR BELOW the first horizontal rule
    words = [w for w in words if w['top'] >= table_top]
    words.sort(key=lambda w: w['top'])

    # Group into lines (5px vertical tolerance)
    lines = []
    current_line = []
    current_top = None
    for w in words:
        if current_top is None:
            current_top = w['top']
            current_line.append(w)
        elif abs(w['top'] - current_top) < 5:
            current_line.append(w)
        else:
            lines.append(current_line)
            current_top = w['top']
            current_line = [w]
    if current_line:
        lines.append(current_line)

    # Find where data rows start (first line whose first word is a unit number)
    data_start_idx = None
    for i, line in enumerate(lines):
        line.sort(key=lambda w: w['x0'])
        if line and re.match(r'^\d{3,4}$', line[0]['text'].strip()):
            data_start_idx = i
            break

    if data_start_idx is None:
        return []

    # Header lines = everything before data rows
    header_lines = lines[:data_start_idx]
    if not header_lines:
        return []

    # Flatten all header words
    all_header_words = []
    for line in header_lines:
        for w in line:
            text = w['text'].strip()
            if text:
                all_header_words.append({
                    'text': text,
                    'x0': w['x0'],
                    'x1': w['x1'],
                    'x_mid': (w['x0'] + w['x1']) / 2,
                })

    # Cluster by x_mid proximity -> same column
    all_header_words.sort(key=lambda w: w['x_mid'])
    SAME_COL_THRESHOLD = 20
    columns = []
    current_col = [all_header_words[0]]
    for hw in all_header_words[1:]:
        if abs(hw['x_mid'] - current_col[0]['x_mid']) <= SAME_COL_THRESHOLD:
            current_col.append(hw)
        else:
            columns.append(current_col)
            current_col = [hw]
    columns.append(current_col)

    col_definitions = []
    for col_words in columns:
        col_words_sorted = sorted(col_words, key=lambda w: w['x0'])
        name = ' '.join(w['text'] for w in col_words_sorted)
        name = re.sub(r'^\(\*\)\s*', '', name).strip()
        x_anchor = sum(w['x_mid'] for w in col_words) / len(col_words)
        col_definitions.append((name, x_anchor))

    return col_definitions


def assign_column(word, col_centers):
    x_mid = (word['x0'] + word['x1']) / 2
    distances = [abs(x_mid - center) for center in col_centers]
    return distances.index(min(distances))


def extract_rent_roll(pdf_path: str) -> Dict[str, Any]:
    """
    Guardian Storage (Seven Fields) extraction.
    Uses dynamic column detection from header words and nearest-column assignment.
    """
    with pdfplumber.open(pdf_path) as pdf:
        # Get column layout from page 0
        col_definitions = extract_column_definitions(pdf.pages[0])
        if not col_definitions:
            raise ValueError("Could not detect column headers in the PDF")

        col_names = [c[0] for c in col_definitions]
        col_centers = [c[1] for c in col_definitions]

        # Extract data rows from all pages
        all_rows = []
        for page in pdf.pages:
            table_top = get_table_top(page)

            words = page.extract_words(keep_blank_chars=True)
            if not words:
                continue

            # Trim metadata above the first horizontal rule
            words = [w for w in words if w['top'] >= table_top]
            words.sort(key=lambda w: w['top'])

            # Group into lines
            lines = []
            current_line = []
            current_top = None
            for w in words:
                if current_top is None:
                    current_top = w['top']
                    current_line.append(w)
                elif abs(w['top'] - current_top) < 5:
                    current_line.append(w)
                else:
                    lines.append(current_line)
                    current_top = w['top']
                    current_line = [w]
            if current_line:
                lines.append(current_line)

            for line in lines:
                line.sort(key=lambda w: w['x0'])
                if not line:
                    continue
                if re.match(r'^\d{3,4}$', line[0]['text'].strip()):
                    row_data = [""] * len(col_names)
                    for w in line:
                        col_idx = assign_column(w, col_centers)
                        text = w['text'].strip()
                        if row_data[col_idx] == "":
                            row_data[col_idx] = text
                        else:
                            row_data[col_idx] += " " + text
                    all_rows.append(row_data)

        # Build result
        rows_as_dicts = []
        for row in all_rows:
            row_dict = {}
            for i, col_name in enumerate(col_names):
                row_dict[col_name] = row[i] if i < len(row) else ""
            rows_as_dicts.append(row_dict)

        return {
            "columns": col_names,
            "rows": rows_as_dicts,
            "meta": {
                "pages": len(pdf.pages),
                "total_rows": len(all_rows),
            }
        }
