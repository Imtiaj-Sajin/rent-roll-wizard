# backend/extractors/silvercup_studios.py
import pdfplumber
from collections import defaultdict
from typing import Dict, Any, List


def extract_rent_roll(pdf_path: str) -> Dict[str, Any]:
    all_extracted_data = []

    with pdfplumber.open(pdf_path) as pdf:
        page1 = pdf.pages[0]

        # STEP 1: FIND X-BOUNDARIES (FENCES) USING PAGE 1
        header_word_p1 = None
        for w in page1.extract_words():
            if w['text'].strip() == 'Unit(s)':
                header_word_p1 = w
                break

        if not header_word_p1:
            raise ValueError("Could not find the anchor header 'Unit(s)' on Page 1.")

        h_top_p1 = header_word_p1['top'] - 10
        h_bottom_p1 = header_word_p1['bottom'] + 10

        v_lines = []
        for r in page1.rects:
            if r['width'] < 5 and r['top'] <= (h_top_p1 + h_bottom_p1) / 2 <= r['bottom']:
                v_lines.append(r['x0'])
        for e in page1.edges:
            if e['orientation'] == 'v' and e['top'] <= (h_top_p1 + h_bottom_p1) / 2 <= e['bottom']:
                v_lines.append(e['x0'])

        v_lines = sorted(list(set(round(x, 1) for x in v_lines)))
        merged_v_lines = []
        for x in v_lines:
            if not merged_v_lines or x - merged_v_lines[-1] > 5:
                merged_v_lines.append(x)

        # STEP 2: EXTRACT MAIN HEADERS
        page1_words = page1.extract_words(keep_blank_chars=True)
        main_cols = []

        for i in range(len(merged_v_lines) - 1):
            x_left = merged_v_lines[i]
            x_right = merged_v_lines[i + 1]

            box_words = [w for w in page1_words
                         if x_left <= (w['x0'] + w['x1']) / 2 <= x_right
                         and h_top_p1 <= (w['top'] + w['bottom']) / 2 <= h_bottom_p1]

            box_words.sort(key=lambda w: (w['top'], w['x0']))
            header_text = " ".join([w['text'] for w in box_words]).strip()
            header_text = " ".join(header_text.split())

            main_cols.append({'x_left': x_left, 'x_right': x_right, 'header': header_text})

        # STEP 3: "THE MAGIC SPLIT" (Detect hidden % columns)
        data_words_p1 = [w for w in page1.extract_words(keep_blank_chars=False) if w['top'] > h_bottom_p1 + 2]
        final_cols = []

        for col in main_cols:
            x_left = col['x_left']
            x_right = col['x_right']

            col_words = [w for w in data_words_p1 if x_left <= (w['x0'] + w['x1']) / 2 <= x_right]
            pct_words = [w for w in col_words if '%' in w['text']]
            non_pct_words = [w for w in col_words if '%' not in w['text'] and w['text'].strip() != '$']

            if pct_words and non_pct_words:
                max_non_pct_x1 = max(w['x1'] for w in non_pct_words)
                min_pct_x0 = min(w['x0'] for w in pct_words)

                if min_pct_x0 > max_non_pct_x1:
                    split_x = (max_non_pct_x1 + min_pct_x0) / 2
                    final_cols.append({'x_left': x_left, 'x_right': split_x, 'header': col['header']})
                    final_cols.append({'x_left': split_x, 'x_right': x_right, 'header': f"{col['header']} (%)"})
                    continue

            final_cols.append(col)

        # Generous right-side buffer to the final column
        final_cols[-1]['x_right'] += 100

        csv_headers = [c['header'] for c in final_cols]

        # STEP 4: EXTRACT ALL PAGES DYNAMICALLY
        for page in pdf.pages:
            words = page.extract_words(keep_blank_chars=True)

            # Find THIS PAGE'S exact header line
            page_h_bottom = 0
            for w in words:
                if w['text'].strip() == 'Unit(s)':
                    page_h_bottom = w['bottom']
                    break

            if page_h_bottom == 0:
                page_h_bottom = h_bottom_p1

            valid_words = [w for w in words if w['top'] > page_h_bottom + 2]
            valid_words.sort(key=lambda w: w['top'])

            # Group words into rows using vertical overlap
            rows = []
            current_row = []
            row_top = None
            row_bottom = None

            for w in valid_words:
                if row_top is None:
                    row_top = w['top']
                    row_bottom = w['bottom']
                    current_row.append(w)
                else:
                    mid_y = (w['top'] + w['bottom']) / 2
                    if row_top - 3 <= mid_y <= row_bottom + 3:
                        current_row.append(w)
                        row_top = min(row_top, w['top'])
                        row_bottom = max(row_bottom, w['bottom'])
                    else:
                        rows.append(current_row)
                        current_row = [w]
                        row_top = w['top']
                        row_bottom = w['bottom']
            if current_row:
                rows.append(current_row)

            # Assign words to columns
            for row_words in rows:
                row_data = [""] * len(final_cols)

                for w in row_words:
                    mid_x = (w['x0'] + w['x1']) / 2
                    for i, col in enumerate(final_cols):
                        if col['x_left'] <= mid_x <= col['x_right']:
                            row_data[i] = (row_data[i] + " " + w['text']).strip()
                            break

                row_text = " ".join(row_data).strip()

                if not row_text:
                    continue
                if "SUB-TOTAL" in row_text.upper() or "TOTAL" in row_text.upper():
                    continue
                if "Page " in row_text and " of " in row_text:
                    continue
                if "Unit(s)" in row_data[0] and "Tenant" in row_data[1]:
                    continue

                all_extracted_data.append(row_data)

    # Build result
    rows_as_dicts = []
    for row in all_extracted_data:
        row_dict = {}
        for i, header in enumerate(csv_headers):
            row_dict[header] = row[i] if i < len(row) else ""
        rows_as_dicts.append(row_dict)

    return {
        "columns": csv_headers,
        "rows": rows_as_dicts,
        "meta": {
            "pages": len(pdf.pages) if 'pdf' in dir() else 0,
            "debug": {
                "column_defs": [f"{c['header']}: {c['x_left']:.1f}-{c['x_right']:.1f}" for c in final_cols],
            },
        },
    }
