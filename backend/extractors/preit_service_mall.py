"""
PREIT Service (Mall) rent roll extractor.
Positional column parsing with rent step detection and section tracking.
"""
import pdfplumber
import re


# Known flags underneath Tenant Name
KNOWN_FLAGS = ["Holdover", "Short Term", "Month to Month", "M2M"]

# Keywords to skip headers, footers, divider text
SKIP_KEYWORDS = [
    "PREIT Services", "Report Date", "Page :", "Property Specific",
    "Unit Type", "/SF", "Merch", "Tenant", "I_____", "_____I",
    "Minimum Rent", "CAM", "Gross Rent", "Information Date:"
]


def parse_currency(val):
    if not val:
        return 0.0
    try:
        return float(val.replace(',', '').replace('$', '').strip())
    except ValueError:
        return 0.0


def parse_line_to_columns(line_words):
    cols = {i: "" for i in range(17)}
    for w in line_words:
        x = w['x0']
        if x < 130:   cols[0] += w['text'] + " "
        elif x < 180:  cols[1] += w['text'] + " "
        elif x < 230:  cols[2] += w['text'] + " "
        elif x < 285:  cols[3] += w['text'] + " "
        elif x < 330:  cols[4] += w['text'] + " "
        elif x < 400:  cols[5] += w['text'] + " "
        elif x < 470:  cols[6] += w['text'] + " "
        elif x < 530:  cols[7] += w['text'] + " "
        elif x < 590:  cols[8] += w['text'] + " "
        elif x < 650:  cols[9] += w['text'] + " "
        elif x < 710:  cols[10] += w['text'] + " "
        elif x < 760:  cols[11] += w['text'] + " "
        elif x < 815:  cols[12] += w['text'] + " "
        elif x < 865:  cols[13] += w['text'] + " "
        elif x < 915:  cols[14] += w['text'] + " "
        elif x < 965:  cols[15] += w['text'] + " "
        else:          cols[16] += w['text'] + " "
    return {k: v.strip() for k, v in cols.items()}


def finalize_row(row_dict):
    cam_psf = parse_currency(row_dict.get("CAM PSF/Year", ""))
    fc_cam_psf = parse_currency(row_dict.get("FC CAM PSF/Year", ""))
    cam_yr = parse_currency(row_dict.get("CAM Year", ""))
    fc_cam_yr = parse_currency(row_dict.get("FC CAM Year", ""))

    row_dict["Total CAM PSF/Year"] = f"{(cam_psf + fc_cam_psf):.2f}" if (cam_psf + fc_cam_psf) > 0 else "0.00"
    row_dict["Total CAM Year"] = f"{int(cam_yr + fc_cam_yr):,}" if (cam_yr + fc_cam_yr) > 0 else "0"

    steps = row_dict.pop("rent_steps_raw", [])
    for i in range(1, 6):
        if i <= len(steps):
            row_dict[f"Step Date {i}"] = steps[i - 1][0]
            row_dict[f"Step Rent {i}"] = steps[i - 1][1]
        else:
            row_dict[f"Step Date {i}"] = ""
            row_dict[f"Step Rent {i}"] = ""
    return row_dict


def extract_rent_roll(pdf_path: str) -> dict:
    data = []
    type_ranks = {}
    current_type = ""
    current_row = None

    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages, 1):
            words = page.extract_words(keep_blank_chars=True)
            words = sorted(words, key=lambda w: (w['top'], w['x0']))

            # Group into lines (5px tolerance)
            lines = []
            curr_line = []
            curr_y = None
            for w in words:
                if curr_y is None:
                    curr_y = w['top']
                    curr_line.append(w)
                elif abs(w['top'] - curr_y) < 5:
                    curr_line.append(w)
                else:
                    lines.append(curr_line)
                    curr_line = [w]
                    curr_y = w['top']
            if curr_line:
                lines.append(curr_line)

            for line_words in lines:
                line_words = sorted(line_words, key=lambda w: w['x0'])
                text_full = " ".join([w['text'] for w in line_words]).strip()

                if not text_full or any(k in text_full for k in SKIP_KEYWORDS):
                    continue

                if "Section Summary" in text_full:
                    if current_row:
                        data.append(finalize_row(current_row))
                        current_row = None
                    continue

                cols = parse_line_to_columns(line_words)
                is_pure_left_text = cols[0] != "" and all(cols[i] == "" for i in range(1, 17))

                if is_pure_left_text:
                    if current_row is None:
                        if current_type.endswith("-"):
                            current_type += " " + text_full
                        else:
                            current_type = text_full
                        if current_type not in type_ranks:
                            type_ranks[current_type] = len(type_ranks) + 1
                    else:
                        if any(f.lower() in text_full.lower() for f in KNOWN_FLAGS):
                            current_row["Flag"] = text_full
                        else:
                            current_row["Input Tenant"] += " " + text_full
                    continue

                is_line_1 = cols[1] != "" and any(c.isdigit() for c in cols[2])

                if is_line_1:
                    if current_row:
                        data.append(finalize_row(current_row))

                    current_row = {
                        "Type Rank": type_ranks.get(current_type, ""),
                        "Page": f"Page {page_num}",
                        "Type": current_type,
                        "Input Tenant": cols[0],
                        "Flag": "",
                        "Unit": cols[1],
                        "Lease": "",
                        "Size": cols[2],
                        "Cat": "",
                        "Lease Start": cols[3],
                        "Lease End": "",
                        "Unit Type": cols[4],
                        "Options": "",
                        "Min Rent PSF/Year": cols[5] if cols[5] != "Rent Steps:" else "",
                        "Min Rent Year": cols[6],
                        "CAM PSF/Year": cols[7],
                        "CAM Year": cols[8],
                        "FC CAM PSF/Year": cols[9],
                        "FC CAM Year": cols[10],
                        "RE PSF/Year": cols[11],
                        "RE Year": cols[12],
                        "Marketing PSF/Year": cols[13],
                        "Marketing Year": cols[14],
                        "Gross Rent PSF/Year": cols[15],
                        "Gross Rent Year": cols[16],
                        "Total CAM PSF/Year": "",
                        "Total CAM Year": "",
                        "rent_steps_raw": []
                    }

                elif current_row:
                    is_line_2 = cols[1] != "" and not any(c.isdigit() for c in cols[2])

                    if is_line_2:
                        current_row["Lease"] = cols[1]
                        current_row["Cat"] = cols[2]
                        current_row["Lease End"] = cols[3]
                        current_row["Options"] = cols[4]

                        if cols[0]:
                            if any(f.lower() in cols[0].lower() for f in KNOWN_FLAGS):
                                current_row["Flag"] = cols[0]
                            else:
                                current_row["Input Tenant"] += " " + cols[0]

                    steps = re.findall(r"(\d{1,2}/\d{1,2}/\d{4})\s*:\s*([\d\.,]+)", text_full)
                    if steps:
                        current_row["rent_steps_raw"].extend(steps)

    if current_row:
        data.append(finalize_row(current_row))

    # Build standard API response
    if not data:
        return {"columns": [], "rows": [], "meta": {"pages": 0}}

    columns = [
        "Type Rank", "Page", "Type", "Input Tenant", "Flag", "Unit", "Lease",
        "Size", "Cat", "Lease Start", "Lease End", "Unit Type", "Options",
        "Min Rent PSF/Year", "Min Rent Year",
        "CAM PSF/Year", "CAM Year", "FC CAM PSF/Year", "FC CAM Year",
        "RE PSF/Year", "RE Year", "Marketing PSF/Year", "Marketing Year",
        "Gross Rent PSF/Year", "Gross Rent Year",
        "Total CAM PSF/Year", "Total CAM Year",
        "Step Date 1", "Step Rent 1", "Step Date 2", "Step Rent 2",
        "Step Date 3", "Step Rent 3", "Step Date 4", "Step Rent 4",
        "Step Date 5", "Step Rent 5",
    ]

    rows = []
    for d in data:
        row = {}
        for col in columns:
            row[col] = d.get(col, "")
        rows.append(row)

    return {
        "columns": columns,
        "rows": rows,
        "meta": {
            "pages": len(pdfplumber.open(pdf_path).pages),
            "total_rows": len(rows),
        }
    }
