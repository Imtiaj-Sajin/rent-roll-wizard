import pdfplumber
import re
from collections import defaultdict
from typing import Dict, List, Any


# ── CONFIG ────────────────────────────────────────────────────
BLUE_COLOR     = (0.776, 0.867, 1.0)
COLOR_TOL      = 0.05
MIN_RECT_WIDTH = 400
Y_TOL          = 4
LINE1_SPLIT_GAP  = 5
LINE2_SUBUNIT_X  = 62

HEADER_COLS = {
    "unit_tenant_name": (25,  235),
    "sqft":             (235, 270),
    "base_rent":        (270, 350),
    "electric":         (350, 410),
    "taxes":            (410, 470),
    "other_recovery":   (470, 535),
    "other_revenue":    (535, 600),
    "total":            (600, 670),
    "base_recoveries":  (670, 900),
}


def colors_match(c1, c2, tol=COLOR_TOL):
    if not (isinstance(c1, (list, tuple)) and isinstance(c2, (list, tuple))):
        return False
    if len(c1) != 3 or len(c2) != 3:
        return False
    return all(abs(a - b) <= tol for a, b in zip(c1, c2))


def group_by_y(words, tol=Y_TOL):
    clusters = {}
    for w in words:
        y = w["top"]
        matched = next((k for k in clusters if abs(y - k) <= tol), None)
        if matched is None:
            clusters[y] = []
            matched = y
        clusters[matched].append(w)
    return sorted(clusters.items())


def words_in_y_band(words, y0, y1):
    return [w for w in words if y0 - 2 <= w["top"] < y1]


def col_for(x0, x1):
    if 20 <= x0 < 200:
        return "unit_tenant_name"
    for name, (lo, hi) in HEADER_COLS.items():
        if name == "unit_tenant_name":
            continue
        if lo <= x1 < hi:
            return name
    return "overflow"


def strip_num(s):
    return s.replace(",", "").strip()


def looks_like_note(text):
    return bool(re.search(r"TAX|OPEX|\bOP\b|%\s*RENT|Escalation|Maintenance", text, re.I))


def parse_blue_block(words):
    rec = {
        "unit_id": "", "sub_unit": "", "tenant_type": "", "tenant_name": "",
        "sqft": "",
        "base_rent": "", "base_rent_psf": "",
        "electric": "", "electric_psf": "",
        "taxes": "", "taxes_psf": "",
        "other_recovery": "", "other_recovery_psf": "",
        "other_revenue": "", "other_revenue_psf": "",
        "total": "", "total_psf": "",
        "base_recoveries": "", "base_recoveries_psf": "",
        "recovery_notes": "",
    }
    for line_num, (_, row_words) in enumerate(group_by_y(words)):
        sorted_row = sorted(row_words, key=lambda w: w["x0"])
        name_col_words = [w for w in sorted_row if col_for(w["x0"], w["x1"]) == "unit_tenant_name"]
        other_words = [w for w in sorted_row if col_for(w["x0"], w["x1"]) != "unit_tenant_name"]

        if line_num >= 2:
            note_text = " ".join(w["text"] for w in sorted_row).strip()
            if note_text:
                rec["recovery_notes"] = (rec["recovery_notes"] + " | " + note_text
                                         if rec["recovery_notes"] else note_text)
            continue

        for w in other_words:
            col = col_for(w["x0"], w["x1"])
            text = w["text"]
            if col == "base_recoveries" or col == "overflow":
                rec["recovery_notes"] = (rec["recovery_notes"] + " " + text).strip()
                continue
            if line_num == 0:
                if col == "sqft":             rec["sqft"] = strip_num(text)
                elif col == "base_rent":      rec["base_rent"] = strip_num(text)
                elif col == "electric":       rec["electric"] = strip_num(text)
                elif col == "taxes":          rec["taxes"] = strip_num(text)
                elif col == "other_recovery": rec["other_recovery"] = strip_num(text)
                elif col == "other_revenue":  rec["other_revenue"] = strip_num(text)
                elif col == "total":          rec["total"] = strip_num(text)
            else:
                if col == "base_rent":        rec["base_rent_psf"] = strip_num(text)
                elif col == "electric":       rec["electric_psf"] = strip_num(text)
                elif col == "taxes":          rec["taxes_psf"] = strip_num(text)
                elif col == "other_recovery": rec["other_recovery_psf"] = strip_num(text)
                elif col == "other_revenue":  rec["other_revenue_psf"] = strip_num(text)
                elif col == "total":          rec["total_psf"] = strip_num(text)

        if name_col_words:
            if line_num == 0:
                sw = sorted(name_col_words, key=lambda w: w["x0"])
                split_at = len(sw)
                max_gap = LINE1_SPLIT_GAP
                for i in range(1, len(sw)):
                    gap = sw[i]["x0"] - sw[i - 1]["x1"]
                    if gap > max_gap:
                        max_gap = gap
                        split_at = i
                rec["unit_id"] = " ".join(w["text"] for w in sw[:split_at]).strip()
                rec["tenant_name"] = " ".join(w["text"] for w in sw[split_at:]).strip()
            else:
                sub_words = [w for w in name_col_words if w["x0"] < LINE2_SUBUNIT_X]
                type_words = [w for w in name_col_words if w["x0"] >= LINE2_SUBUNIT_X]
                rec["sub_unit"] = " ".join(w["text"] for w in sorted(sub_words, key=lambda w: w["x0"])).strip()
                rec["tenant_type"] = " ".join(w["text"] for w in sorted(type_words, key=lambda w: w["x0"])).strip()

    rec["recovery_notes"] = rec["recovery_notes"].strip()
    return rec


def parse_white_block(words):
    detail = {
        "lease_begins": "", "lease_ends": "",
        "letter_of_credit": "", "letter_of_credit_expiry": "",
        "step_rents": [],
        "free_rent_note": "",
        "meter_note": "",
        "work_note": "",
        "pct_rent_note": "",
    }
    left_words = [w for w in words if w["x0"] < 140]
    right_words = [w for w in words if w["x0"] >= 140]

    for _, row in group_by_y(left_words):
        full = " ".join(w["text"] for w in sorted(row, key=lambda w: w["x0"]))
        if re.search(r"Lease\s*begins", full, re.I):
            m = re.search(r"\d{1,2}/\d{1,2}/\d{4}", full)
            if m: detail["lease_begins"] = m.group()
        elif re.search(r"Lease\s*ends", full, re.I):
            m = re.search(r"\d{1,2}/\d{1,2}/\d{4}", full)
            if m: detail["lease_ends"] = m.group()
        elif re.search(r"Letter\s*of\s*Credit", full, re.I):
            nums = re.findall(r"[\d,]+(?:\.\d+)?", full)
            dates = re.findall(r"\d{1,2}/\d{1,2}/\d{4}", full)
            if nums: detail["letter_of_credit"] = nums[0].replace(",", "")
            if dates: detail["letter_of_credit_expiry"] = dates[0]

    step_buf = []

    def flush(period, annual, psf=""):
        if period or annual:
            detail["step_rents"].append({"period": period, "annual_amount": annual, "psf": psf})

    for _, row in group_by_y(right_words):
        sorted_row = sorted(row, key=lambda w: w["x0"])
        texts = [w["text"] for w in sorted_row]
        full = " ".join(texts)

        if re.search(r"\bFREE\b", full, re.I):
            note = " ".join(w["text"] for w in sorted_row if w["x0"] > 190)
            detail["free_rent_note"] = (detail["free_rent_note"] + " | " + note
                                        if detail["free_rent_note"] else note).strip()
            continue
        if re.search(r"\bMETER\b", full, re.I):
            note = " ".join(w["text"] for w in sorted_row if w["x0"] > 190)
            detail["meter_note"] = (detail["meter_note"] + " | " + note
                                    if detail["meter_note"] else note).strip()
            continue
        if re.search(r"\bWORK\b", full, re.I):
            note = " ".join(w["text"] for w in sorted_row if w["x0"] > 190)
            detail["work_note"] = (detail["work_note"] + " | " + note
                                   if detail["work_note"] else note).strip()
            continue
        if re.search(r"%\s*RENT", full, re.I):
            note = " ".join(w["text"] for w in sorted_row if w["x0"] > 190)
            detail["pct_rent_note"] = note.strip()
            continue

        periods = [w for w in sorted_row if re.match(r"^\d{2}/\d{2}$", w["text"])]
        big_ints = [w for w in sorted_row if re.match(r"^[\d,]{5,}$", w["text"])]
        psf_floats = [w for w in sorted_row if re.match(r"^\d{2,}\.\d{2}$", w["text"])]

        if (periods or big_ints) and not psf_floats:
            if step_buf:
                flush(step_buf[0], step_buf[1], "")
            period = periods[0]["text"] if periods else ""
            annual = strip_num(big_ints[0]["text"]) if big_ints else ""
            step_buf = [period, annual]
        elif psf_floats and not (periods or big_ints):
            if step_buf:
                flush(step_buf[0], step_buf[1], psf_floats[0]["text"])
                step_buf = []
        elif psf_floats and (periods or big_ints):
            if step_buf:
                flush(step_buf[0], step_buf[1], "")
            flush(
                periods[0]["text"] if periods else "",
                strip_num(big_ints[0]["text"]) if big_ints else "",
                psf_floats[0]["text"]
            )
            step_buf = []

    if step_buf:
        flush(step_buf[0], step_buf[1], "")

    return detail


def blue_rect_ranges(page):
    ranges = []
    for r in page.rects:
        if r["width"] >= MIN_RECT_WIDTH and colors_match(r["non_stroking_color"], BLUE_COLOR):
            ranges.append((r["top"], r["bottom"]))
    return sorted(ranges)


def parse_page(page):
    all_words = page.extract_words(keep_blank_chars=False)
    blue_ranges = blue_rect_ranges(page)
    page_h = page.height

    header_y = None
    for w in all_words:
        if w["text"] in ("Unit/Tenant", "Sqft", "BaseRent"):
            header_y = w["top"]
            break

    data_top = (header_y + 10) if header_y else 130

    if not blue_ranges:
        cont = [w for w in all_words if w["top"] >= data_top]
        return cont, []

    first_blue_top = blue_ranges[0][0]
    continuation_words = [w for w in all_words if data_top <= w["top"] < first_blue_top]

    tenants = []
    for idx, (b_top, b_bot) in enumerate(blue_ranges):
        w_top = b_bot
        w_bot = blue_ranges[idx + 1][0] if idx + 1 < len(blue_ranges) else page_h - 25
        blue_data = parse_blue_block(words_in_y_band(all_words, b_top, b_bot))
        white_data = parse_white_block(words_in_y_band(all_words, w_top, w_bot))
        if not blue_data["sqft"]:
            continue
        tenants.append({**blue_data, **white_data})

    return continuation_words, tenants


def merge_continuation(tenant, cont_words):
    if not cont_words:
        return
    extra = parse_white_block(cont_words)
    tenant["step_rents"].extend(extra["step_rents"])
    for key in ("free_rent_note", "meter_note", "work_note", "pct_rent_note"):
        if extra[key]:
            existing = tenant.get(key, "")
            tenant[key] = (existing + " | " + extra[key] if existing else extra[key]).strip()


def extract_rent_roll(pdf_path: str) -> Dict[str, Any]:
    """
    Extract rent roll from American Storage PDF.
    Returns standard {columns, rows, meta} format.
    """
    all_tenants = []
    last_tenant = None

    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages, start=1):
            cont_words, tenants = parse_page(page)
            if cont_words and last_tenant is not None:
                merge_continuation(last_tenant, cont_words)
            if tenants:
                all_tenants.extend(tenants)
                last_tenant = tenants[-1]

        # Convert tenant dicts to standard columns/rows format
        # Flatten step_rents into inline columns
        max_steps = max((len(t.get("step_rents", [])) for t in all_tenants), default=0)

        base_columns = [
            "Unit ID", "Sub Unit", "Type", "Tenant Name", "Sqft",
            "Base Rent ($)", "Base Rent (PSF)",
            "Electric ($)", "Electric (PSF)",
            "Taxes ($)", "Taxes (PSF)",
            "Other Recovery ($)", "Other Recovery (PSF)",
            "Other Revenue ($)", "Other Revenue (PSF)",
            "Total ($)", "Total (PSF)",
            "Recovery Notes",
            "Lease Begins", "Lease Ends",
            "Letter of Credit ($)", "LOC Expiry",
            "Free Rent Note", "Meter Note", "Work Note", "% Rent Note",
        ]

        step_columns = []
        for s in range(max_steps):
            n = s + 1
            step_columns.extend([f"Step {n} Period", f"Step {n} Amt ($)", f"Step {n} PSF"])

        columns = base_columns + step_columns

        field_map = [
            "unit_id", "sub_unit", "tenant_type", "tenant_name", "sqft",
            "base_rent", "base_rent_psf",
            "electric", "electric_psf",
            "taxes", "taxes_psf",
            "other_recovery", "other_recovery_psf",
            "other_revenue", "other_revenue_psf",
            "total", "total_psf",
            "recovery_notes",
            "lease_begins", "lease_ends",
            "letter_of_credit", "letter_of_credit_expiry",
            "free_rent_note", "meter_note", "work_note", "pct_rent_note",
        ]

        rows = []
        for t in all_tenants:
            row = {}
            for col_name, field in zip(base_columns, field_map):
                row[col_name] = t.get(field, "")
            # Add step rent columns
            steps = t.get("step_rents", [])
            for s in range(max_steps):
                n = s + 1
                if s < len(steps):
                    row[f"Step {n} Period"] = steps[s].get("period", "")
                    row[f"Step {n} Amt ($)"] = steps[s].get("annual_amount", "")
                    row[f"Step {n} PSF"] = steps[s].get("psf", "")
                else:
                    row[f"Step {n} Period"] = ""
                    row[f"Step {n} Amt ($)"] = ""
                    row[f"Step {n} PSF"] = ""
            rows.append(row)

        return {
            "columns": columns,
            "rows": rows,
            "meta": {
                "pages": len(pdf.pages),
                "total_rows": len(rows),
            }
        }
