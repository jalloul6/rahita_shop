// Minimal CSV builder. Quotes fields and neutralizes spreadsheet formula injection
// (customer-supplied text such as "=HYPERLINK(...)" must not run when opened in Excel).

export function csvCell(value: string | number | null | undefined, opts?: { phone?: boolean }) {
  let s = value == null ? "" : String(value);
  // Phones legitimately start with "+", so only guard the always-dangerous leaders there.
  const risky = opts?.phone ? /^[=@\t\r]/ : /^[=+\-@\t\r]/;
  if (typeof value === "string" && risky.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][], phoneCols: number[] = []) {
  const lines = [headers.map((h) => csvCell(h)).join(",")];
  for (const row of rows) {
    lines.push(row.map((v, i) => csvCell(v, { phone: phoneCols.includes(i) })).join(","));
  }
  // BOM so Excel detects UTF-8 (Arabic/French names); CRLF per RFC 4180.
  return "﻿" + lines.join("\r\n") + "\r\n";
}
