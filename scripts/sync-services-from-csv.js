#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const csvPath = process.argv[2]
  ? path.resolve(root, process.argv[2])
  : path.resolve(root, 'NDIS-Support Catalogue-2025-26 -v1.1.csv');

const targetFiles = [
  path.resolve(root, 'data/services.json'),
  path.resolve(root, 'public/data/services.json'),
];

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let i = 0;
  let inQuotes = false;

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (ch === '\r') {
      // ignore CR, LF handles line end
    } else {
      field += ch;
    }

    i += 1;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function parseRate(raw) {
  if (!raw) return null;
  const cleaned = String(raw).replace(/[$,\s]/g, '');
  if (!cleaned) return null;
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? Number(n.toFixed(2)) : null;
}

function getPreferredRate(row, headers) {
  const candidates = ['NSW', 'ACT', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'Remote', 'Very Remote'];
  for (const col of candidates) {
    const idx = headers.indexOf(col);
    if (idx < 0) continue;
    const rate = parseRate(row[idx]);
    if (rate !== null) return rate;
  }
  return null;
}

function inferCategory(code, name) {
  const text = `${code} ${name}`.toLowerCase();
  if (code.includes('_799_') || text.includes('travel')) return 'travel';
  if (text.includes('public holiday')) return 'publicHoliday';
  if (text.includes('sunday')) return 'sunday';
  if (text.includes('saturday')) return 'saturday';
  if (text.includes('weekday evening')) return 'weekday_evening';
  if (text.includes('weekday night') || text.includes('night-time') || text.includes('night time')) return 'weekday_night';
  return 'weekday';
}

function loadCsvRows(filePath) {
  const csvText = fs.readFileSync(filePath, 'utf8');
  const parsed = parseCsv(csvText);
  if (parsed.length < 2) throw new Error('CSV appears empty');

  const headers = parsed[0].map((h, idx) => {
    const value = String(h || '').trim();
    return idx === 0 ? value.replace(/^\uFEFF/, '') : value;
  });
  const codeIdx = headers.indexOf('Support Item Number');
  const nameIdx = headers.indexOf('Support Item Name');
  const groupNoIdx = headers.indexOf('Registration Group Number');
  const groupNameIdx = headers.indexOf('Registration Group Name');

  if ([codeIdx, nameIdx, groupNoIdx, groupNameIdx].some((x) => x < 0)) {
    throw new Error('CSV header missing required columns');
  }

  const rows = [];
  for (let r = 1; r < parsed.length; r += 1) {
    const row = parsed[r];
    const code = (row[codeIdx] || '').trim();
    if (!code) continue;

    rows.push({
      code,
      name: (row[nameIdx] || '').trim(),
      registrationGroupNumber: (row[groupNoIdx] || '').trim(),
      registrationGroupName: (row[groupNameIdx] || '').trim(),
      rate: getPreferredRate(row, headers),
    });
  }

  return rows;
}

function syncServicesFile(filePath, csvRows, existingByCode) {
  const idUsage = new Map();
  const next = csvRows.map((row) => {
    const existing = existingByCode.get(row.code);
    const baseId = existing?.id || row.code;
    const seen = (idUsage.get(baseId) || 0) + 1;
    idUsage.set(baseId, seen);
    const uniqueId = seen === 1 ? baseId : `${baseId}__${seen}`;

    return {
      id: uniqueId,
      category: existing?.category || inferCategory(row.code, row.name),
      registrationGroupNumber: row.registrationGroupNumber || existing?.registrationGroupNumber || '',
      registrationGroupName: row.registrationGroupName || existing?.registrationGroupName || '',
      code: row.code,
      description: row.name || existing?.description || '',
      rate: row.rate !== null ? row.rate : (existing?.rate ?? 0),
      // Ensure every CSV catalog row is selectable in the app.
      active: true,
    };
  });

  fs.writeFileSync(filePath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  return { total: next.length };
}

function main() {
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found: ${csvPath}`);
  }

  const csvRows = loadCsvRows(csvPath);

  const baseFile = targetFiles[0];
  const existingBase = JSON.parse(fs.readFileSync(baseFile, 'utf8'));
  const existingByCode = new Map(existingBase.map((item) => [item.code, item]));

  for (const filePath of targetFiles) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Target file not found: ${filePath}`);
    }

    const result = syncServicesFile(filePath, csvRows, existingByCode);
    console.log(`${path.relative(root, filePath)}: rebuilt with ${result.total} services from CSV`);
  }

  console.log(`services.json files now include every CSV service row (${csvRows.length} total).`);
}

try {
  main();
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}
