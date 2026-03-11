"""
Shopping Mall rent roll extractor.
Dynamically detects header rectangles and column boundaries from page 1,
then extracts data rows across all pages.
"""
import pdfplumber
from collections import defaultdict


def extract_rent_roll(pdf_path: str) -> dict:
    all_rows = []

    with pdfplumber.open(pdf_path) as pdf:
        # STEP 1: Detect header rectangles from page 1
        page1 = pdf.pages[0]
        page1_words = page1.extract_words(keep_blank_chars=True)

        rects_by_top = defaultdict(list)
        for r in page1.rects:
            rects_by_top[round(r["top"], 1)].append(r)

        if not rects_by_top:
            raise ValueError("Could not detect any rectangles in the PDF.")

        header_top_key = max(rects_by_top, key=lambda k: len(rects_by_top[k]))
        header_rects = sorted(rects_by_top[header_top_key], key=lambda r: r["x0"])

        if not header_rects:
            raise ValueError("Could not detect header rectangles in the PDF.")

        header_top_y = min(r["top"] for r in header_rects)
        header_bottom_y = max(r["bottom"] for r in header_rects)

        # STEP 2: Extract header text
        col_names = []
        col_bounds = []

        for rect in header_rects:
            rx0, rx1 = rect["x0"], rect["x1"]
            rtop, rbottom = rect["top"], rect["bottom"]
            col_bounds.append((rx0, rx1))

            words_in_rect = []
            for w in page1_words:
                w_mid_x = (w["x0"] + w["x1"]) / 2
                w_mid_y = (w["top"] + w["bottom"]) / 2
                if rx0 <= w_mid_x <= rx1 and rtop <= w_mid_y <= rbottom:
                    words_in_rect.append(w)

            words_in_rect.sort(key=lambda w: (w["top"], w["x0"]))
            header_text = " ".join(w["text"] for w in words_in_rect).strip()
            header_text = " ".join(header_text.split())
            col_names.append(header_text)

        # STEP 3: Extract data from all pages
        for page in pdf.pages:
            words = page.extract_words(keep_blank_chars=True)
            valid_words = [w for w in words if w["top"] > (header_bottom_y + 2)]
            valid_words.sort(key=lambda w: w["top"])

            rows = []
            current_row = []
            current_top = None

            for w in valid_words:
                if current_top is None:
                    current_top = w["top"]
                    current_row.append(w)
                elif abs(w["top"] - current_top) < 4:
                    current_row.append(w)
                else:
                    rows.append(current_row)
                    current_row = [w]
                    current_top = w["top"]
            if current_row:
                rows.append(current_row)

            for row in rows:
                row_data = [""] * len(col_bounds)

                for w in row:
                    w_mid_x = (w["x0"] + w["x1"]) / 2
                    for i, (b_x0, b_x1) in enumerate(col_bounds):
                        if (b_x0 - 2) <= w_mid_x <= (b_x1 + 2):
                            if row_data[i]:
                                row_data[i] += " " + w["text"]
                            else:
                                row_data[i] = w["text"]
                            break

                row_text = " ".join(row_data).strip()
                if not row_text:
                    continue
                if "Total for" in row_text:
                    continue
                if "THIS DOCUMENT CONTAINS" in row_text:
                    break
                if "Property Summary" in row_text:
                    break
                # Skip repeated headers
                if len(col_names) > 3 and col_names[3] in row_data:
                    continue

                row_dict = {col_names[i]: row_data[i].strip() for i in range(len(col_names))}
                all_rows.append(row_dict)

    return {
        "columns": col_names,
        "rows": all_rows,
        "meta": {
            "pages": len(pdfplumber.open(pdf_path).pages),
        },
    }
