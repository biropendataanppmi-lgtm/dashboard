// Parser CSV RFC 4180 kecil tanpa dependensi: tanda kutip, koma/CRLF di dalam kutip, BOM UTF-8.
// Semua nilai dikembalikan sebagai string apa adanya (ID, paspor, telepon tetap teks, §4.3).

export interface ParsedCsv {
  headers: string[];
  /** Baris data; rowNumber adalah nomor baris di file (header = baris 1). */
  rows: { rowNumber: number; cells: string[] }[];
}

export class CsvError extends Error {}

export function parseCsv(input: string): ParsedCsv {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const records: { line: number; cells: string[] }[] = [];
  let cells: string[] = [];
  let field = '';
  let inQuotes = false;
  let line = 1;
  let recordStart = 1;
  let i = 0;

  const endField = () => {
    cells.push(field);
    field = '';
  };
  const endRecord = () => {
    endField();
    records.push({ line: recordStart, cells });
    cells = [];
  };

  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      if (ch === '\n') line++;
      field += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      if (field.length > 0) throw new CsvError(`Tanda kutip tidak valid di baris ${line}.`);
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ',') {
      endField();
      i++;
      continue;
    }
    if (ch === '\r' || ch === '\n') {
      endRecord();
      if (ch === '\r' && text[i + 1] === '\n') i++;
      i++;
      line++;
      recordStart = line;
      continue;
    }
    field += ch;
    i++;
  }
  if (inQuotes) throw new CsvError('File berakhir di dalam tanda kutip yang belum ditutup.');
  if (field.length > 0 || cells.length > 0) endRecord();

  // Baris yang benar-benar kosong diabaikan (misalnya baris kosong di akhir file).
  const nonEmpty = records.filter((r) => !(r.cells.length === 1 && r.cells[0].trim() === ''));
  if (nonEmpty.length === 0) return { headers: [], rows: [] };
  const [head, ...body] = nonEmpty;
  return {
    headers: head.cells.map((h) => h.trim()),
    rows: body.map((r) => ({ rowNumber: r.line, cells: r.cells })),
  };
}
