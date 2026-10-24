/** CSV helpers. Cells that start with = + - @ are prefixed with ' so spreadsheets don't run them as formulas. */
export const csvCell = (v) => {
  let s = v === null || v === undefined ? '' : (v instanceof Date ? v.toISOString() : String(v));
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const toCsv = (header, rows) => [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
export const sendCsv = (res, filename, header, rows) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(`\ufeff${toCsv(header, rows)}`);
};
