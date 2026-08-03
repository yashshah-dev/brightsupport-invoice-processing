#!/usr/bin/env python3
import json
import os
import re
import openpyxl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXCEL_PATH = os.path.join(ROOT, 'NDIS Support Catalogue 2024-25 v1.2 (1).xlsx')

TARGET_FILES = [
    os.path.join(ROOT, 'data', 'services-2024-25.json'),
    os.path.join(ROOT, 'public', 'data', 'services-2024-25.json'),
]

def parse_rate(val):
    if val is None:
        return None
    cleaned = re.sub(r'[$,\s]', '', str(val))
    if not cleaned:
        return None
    try:
        n = float(cleaned)
        return round(n, 2)
    except ValueError:
        return None

def get_preferred_rate(row, headers):
    candidates = ['VIC', 'National', 'NSW', 'ACT', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'Remote', 'Very Remote']
    for col in candidates:
        if col in headers:
            idx = headers.index(col)
            rate = parse_rate(row[idx])
            if rate is not None:
                return rate
    return None

def infer_category(code, name):
    text = f"{code} {name}".lower()
    if '_799_' in code or 'travel' in text:
        return 'travel'
    if 'public holiday' in text:
        return 'publicHoliday'
    if 'sunday' in text:
        return 'sunday'
    if 'saturday' in text:
        return 'saturday'
    if 'weekday evening' in text:
        return 'weekday_evening'
    if 'weekday night' in text or 'night-time' in text or 'night time' in text:
        return 'weekday_night'
    return 'weekday'

def main():
    if not os.path.exists(EXCEL_PATH):
        raise FileNotFoundError(f"Excel file not found: {EXCEL_PATH}")

    wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True)
    ws = wb['Current Support Items']
    rows = list(ws.iter_rows(values_only=True))

    if len(rows) < 2:
        raise ValueError("Sheet Current Support Items appears empty")

    headers = [str(h or '').strip() for h in rows[0]]

    code_idx = headers.index('Support Item Number')
    name_idx = headers.index('Support Item Name')
    group_no_idx = headers.index('Registration Group Number')
    group_name_idx = headers.index('Registration Group Name')

    id_usage = {}
    service_items = []

    for r in rows[1:]:
        code = str(r[code_idx] or '').strip()
        if not code:
            continue

        name = str(r[name_idx] or '').strip()
        group_no = str(r[group_no_idx] or '').strip()
        group_name = str(r[group_name_idx] or '').strip()
        rate = get_preferred_rate(r, headers)

        base_id = code
        seen = id_usage.get(base_id, 0) + 1
        id_usage[base_id] = seen
        unique_id = base_id if seen == 1 else f"{base_id}__{seen}"

        service_items.append({
            "id": unique_id,
            "category": infer_category(code, name),
            "registrationGroupNumber": group_no,
            "registrationGroupName": group_name,
            "code": code,
            "description": name,
            "rate": rate if rate is not None else 0,
            "active": True
        })

    for target_path in TARGET_FILES:
        os.makedirs(os.path.dirname(target_path), exist_ok=True)
        with open(target_path, 'w', encoding='utf-8') as f:
            json.dump(service_items, f, indent=2)
            f.write('\n')
        print(f"Wrote {len(service_items)} items to {os.path.relpath(target_path, ROOT)}")

    print("Successfully synced 2024-25 NDIS catalog!")

if __name__ == '__main__':
    main()
