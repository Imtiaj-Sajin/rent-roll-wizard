"""
GA Portfolio rent roll extractor.
Uses strict x-coordinate column bins and horizontal border detection.
"""
import re
import pdfplumber
from collections import defaultdict

ROW_Y_TOLERANCE = 3.0

COLUMN_BINS = [
    ("Unit",               0,   58),
    ("Tenant Name",       58,  145),
    ("Room Count",       145,  175),
    ("BR Count",         175,  215),
    ("BA Ct",            215,  250),
    ("Monthly Rent",     250,  284),
    ("Annual Rent",      284,  322),
    ("Lease Start",      322,  370),
    ("Lease Expiration", 370,  999),
]


def get_border_lines(page):
    min_width = page.width * 0.4
    borders = []
    for r in page.rects:
        if r["width"] >= min_width and r["height"] < 3:
            borders.append(round(r["top"], 2))
    return sorted(set(borders))


def group_words_into_rows(words, top_min, top_max):
    in_range = [w for w in words if top_min < w["top"] < top_max]
    rows_dict = defaultdict(list)
    for w in in_range:
        key = round(w["top"] / ROW_Y_TOLERANCE) * ROW_Y_TOLERANCE
        rows_dict[key].append(w)
    return [sorted(rows_dict[k], key=lambda w: w["x0"]) for k in sorted(rows_dict)]


def assign_word_to_column(word):
    x0 = word["x0"]
    for col_name, x_min, x_max in COLUMN_BINS:
        if x_min <= x0 < x_max:
            return col_name
    return None


def should_skip_row(row_dict):
    unit_val = str(row_dict.get("Unit", "")).strip()
    if not unit_val:
        return True
    if re.match(r"^\d+[\.,]?\d*$", unit_val):
        return True
    return False


def extract_tables_from_page(page):
    words = page.extract_words(
        use_text_flow=False,
        keep_blank_chars=False,
        x_tolerance=3,
        y_tolerance=ROW_Y_TOLERANCE,
    )

    borders = get_border_lines(page)
    if len(borders) < 2:
        return []

    border_pairs = []
    i = 0
    while i < len(borders) - 1:
        top_b, bot_b = borders[i], borders[i + 1]
        if bot_b - top_b > 20:
            border_pairs.append((top_b, bot_b))
            i += 2
        else:
            i += 1

    records = []
    for top_b, bot_b in border_pairs:
        data_rows = group_words_into_rows(words, top_b, bot_b)
        for row in data_rows:
            row_dict = defaultdict(list)
            for word in row:
                col = assign_word_to_column(word)
                if col:
                    row_dict[col].append(word["text"].strip())

            row_record = {col: " ".join(row_dict[col]) for col, _, _ in COLUMN_BINS}
            if not should_skip_row(row_record):
                records.append(row_record)

    return records


def extract_rent_roll(pdf_path: str) -> dict:
    col_names = [c[0] for c in COLUMN_BINS]
    all_rows = []

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            all_rows.extend(extract_tables_from_page(page))

    rows_out = []
    for row in all_rows:
        clean = {col: str(row.get(col, "")).strip() for col in col_names}
        if any(v for v in clean.values()):
            rows_out.append(clean)

    return {
        "columns": col_names,
        "rows": rows_out,
        "meta": {
            "pages": len(pdfplumber.open(pdf_path).pages),
        },
    }
