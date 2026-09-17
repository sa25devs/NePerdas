/**
 * Parse raw OCR text into a likely product name and expiration date.
 * Runs entirely on-device; corrects common OCR digit mistakes and packed dates.
 */

export type OcrLine = {
  text: string;
  y: number;
  height: number;
  width: number;
};

const EXPIRY_KEYWORDS =
  /(?:best\s*before|use\s*by|exp(?:iry|ires|iration)?\.?|mhd|bbd|tht|scadenza|scad\.?|caducidad|caducitat|consumir\s*(?:preferentemente\s*|preferentment\s*)?(?:antes(?:\s*de)?|preferente)|vence|vencimiento|validade|data\s*de\s*validade|consumir\s*(?:de\s*)?prefer[eê]ncia|à\s*consommer\s*(?:de\s*)?préférence|mindesthaltbar(?:keitsdatum)?|verbrauchen\s*bis|bäst\s*före|parasta\s*ennen|viimeinen\s*käyttö|bedst\s*før|son\s*kullanma|skt|賞味期限|消費期限|保质期|有效期|유통기한|λήξη|ημερομηνία\s*λήξης|ανάλωση|تاريخ\s*الانتهاء|صالح\s*حتى|يفضل\s*الاستهلاك|الصلاحية|data\s*ważności|termin\s*ważności|spożyć\s*do|najlepiej\s*spożyć|przydatn(?:ość|y)|годен\s*до|срок\s*годности|употребить\s*до)/i;

const PACKED_KEYWORDS =
  /(?:pack(?:ed)?(?:\s*on)?|packed\s*date|\bpd\b|produced|production|manufactured|mfg|lot|lote|batch|envasado|fabricado|hergestellt|gepakt|emballé|confezionato)/i;

const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  ene: 1,
  enero: 1,
  janv: 1,
  janvier: 1,
  januar: 1,
  gen: 1,
  gennaio: 1,
  sty: 1,
  янв: 1,
  feb: 2,
  february: 2,
  fev: 2,
  fév: 2,
  février: 2,
  febrero: 2,
  februar: 2,
  febbr: 2,
  lut: 2,
  фев: 2,
  mar: 3,
  march: 3,
  marzo: 3,
  mrt: 3,
  mär: 3,
  mars: 3,
  marzec: 3,
  мар: 3,
  apr: 4,
  april: 4,
  abr: 4,
  abril: 4,
  avr: 4,
  avril: 4,
  kwi: 4,
  апр: 4,
  may: 5,
  mayo: 5,
  mai: 5,
  maggio: 5,
  mei: 5,
  maj: 5,
  май: 5,
  jun: 6,
  june: 6,
  junio: 6,
  juin: 6,
  juni: 6,
  giugno: 6,
  cze: 6,
  июн: 6,
  jul: 7,
  july: 7,
  julio: 7,
  juil: 7,
  juillet: 7,
  juli: 7,
  luglio: 7,
  lip: 7,
  июл: 7,
  aug: 8,
  august: 8,
  ago: 8,
  agosto: 8,
  août: 8,
  aout: 8,
  augst: 8,
  sie: 8,
  авг: 8,
  sep: 9,
  sept: 9,
  september: 9,
  septiembre: 9,
  settembre: 9,
  wrz: 9,
  сен: 9,
  oct: 10,
  october: 10,
  octubre: 10,
  okt: 10,
  oktober: 10,
  ottobre: 10,
  paź: 10,
  paz: 10,
  окт: 10,
  nov: 11,
  november: 11,
  noviembre: 11,
  novembre: 11,
  lis: 11,
  ноя: 11,
  dec: 12,
  december: 12,
  dic: 12,
  diciembre: 12,
  décembre: 12,
  dez: 12,
  dicembre: 12,
  gru: 12,
  дек: 12,
};

type DateHit = {
  iso: string;
  score: number;
  /** 3 = day+month+year, 2 = month+year */
  precision: 2 | 3;
};

function isValidYMD(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const date = new Date(y, m - 1, d);
  return (
    date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
  );
}

function toISO(y: number, m: number, d: number): string | null {
  if (!isValidYMD(y, m, d)) return null;
  return `${y.toString().padStart(4, '0')}-${m.toString().padStart(2, '0')}-${d
    .toString()
    .padStart(2, '0')}`;
}

function lastDayOfMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate();
}

function expandYear(yy: number): number {
  return yy >= 70 ? 1900 + yy : 2000 + yy;
}

function plausibleYear(iso: string): boolean {
  const year = Number(iso.slice(0, 4));
  const now = new Date().getFullYear();
  return year >= now - 1 && year <= now + 5;
}

function futureBonus(iso: string): number {
  return iso >= todayISO() ? 2 : 0;
}

function todayISO(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(
    n.getDate(),
  ).padStart(2, '0')}`;
}

/**
 * Rewrite OCR lookalikes only in digit-like tokens (O→0, I/l→1, S→5, …).
 */
export function normalizeForDates(text: string): string {
  return text.replace(/[A-Za-z0-9|]+/g, (token) => {
    if (!/^[0-9OoIlSBZsg|]+$/.test(token)) return token;
    return token
      .replace(/[Oo]/g, '0')
      .replace(/[Il|]/g, '1')
      .replace(/Z/g, '2')
      .replace(/[Ss]/g, '5')
      .replace(/B/g, '8')
      .replace(/g/g, '9');
  });
}

function parseYmdParts(a: string, b: string, c: string): string | null {
  const n1 = Number(a);
  const n2 = Number(b);
  const n3 = Number(c);

  if (a.length === 4) return toISO(n1, n2, n3);
  if (c.length === 4) return toISO(n3, n2, n1);
  if (c.length === 2) {
    const year = expandYear(n3);
    if (n1 > 12) return toISO(year, n2, n1);
    if (n2 > 12) return toISO(year, n1, n2);
    return toISO(year, n2, n1);
  }
  return null;
}

function monthFromName(raw: string): number | null {
  const key = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-zа-я]/g, '')
    .slice(0, 4);
  if (!key) return null;
  if (MONTHS[key] != null) return MONTHS[key];
  const three = key.slice(0, 3);
  return MONTHS[three] ?? null;
}

function collectFromLine(
  normalized: string,
): Array<{ iso: string; precision: 2 | 3 }> {
  const found: Array<{ iso: string; precision: 2 | 3 }> = [];
  const add = (iso: string | null, precision: 2 | 3) => {
    if (iso && plausibleYear(iso)) found.push({ iso, precision });
  };

  const run = (
    re: RegExp,
    parse: (m: RegExpMatchArray) => string | null,
    precision: 2 | 3,
  ) => {
    const global = new RegExp(
      re.source,
      re.flags.includes('g') ? re.flags : `${re.flags}g`,
    );
    let m: RegExpExecArray | null;
    while ((m = global.exec(normalized)) !== null) {
      add(parse(m), precision);
    }
  };

  run(
    /\b(20\d{2})[./\- ](\d{1,2})[./\- ](\d{1,2})\b/,
    (m) => parseYmdParts(m[1], m[2], m[3]),
    3,
  );
  run(
    /\b(\d{1,2})[./\- ](\d{1,2})[./\- ](20\d{2}|\d{2})\b/,
    (m) => parseYmdParts(m[1], m[2], m[3]),
    3,
  );
  run(/\b(20\d{2})(\d{2})(\d{2})\b/, (m) => parseYmdParts(m[1], m[2], m[3]), 3);
  run(/\b(\d{2})(\d{2})(20\d{2})\b/, (m) => parseYmdParts(m[1], m[2], m[3]), 3);
  run(
    /(?<!\d[./\-])\b(\d{1,2})[./\-](20\d{2})\b(?![./\-]\d)/,
    (m) => {
      const month = Number(m[1]);
      const year = Number(m[2]);
      return toISO(year, month, lastDayOfMonth(year, month));
    },
    2,
  );
  run(
    /\b(\d{1,2})\s*[-/.]\s*([A-Za-zÀ-ÿА-я]{3,})\s*[-/.]?\s*(20\d{2}|\d{2})\b/,
    (m) => {
      const day = Number(m[1]);
      const month = monthFromName(m[2]);
      if (month == null) return null;
      const year = m[3].length === 4 ? Number(m[3]) : expandYear(Number(m[3]));
      return toISO(year, month, day);
    },
    3,
  );
  run(
    /\b(\d{1,2})\s+([A-Za-zÀ-ÿА-я]{3,})\s+(20\d{2}|\d{2})\b/,
    (m) => {
      const day = Number(m[1]);
      const month = monthFromName(m[2]);
      if (month == null) return null;
      const year = m[3].length === 4 ? Number(m[3]) : expandYear(Number(m[3]));
      return toISO(year, month, day);
    },
    3,
  );
  run(
    /\b([A-Za-zÀ-ÿА-я]{3,})\s+(\d{1,2})\s*[,.\-/]\s*(20\d{2}|\d{2})\b/,
    (m) => {
      const month = monthFromName(m[1]);
      if (month == null) return null;
      const year = m[3].length === 4 ? Number(m[3]) : expandYear(Number(m[3]));
      const day = Number(m[2]);
      return toISO(year, month, day);
    },
    3,
  );
  run(
    /\b([A-Za-zÀ-ÿА-я]{3,})\s+(\d{1,2})\s+(20\d{2})\b/,
    (m) => {
      const month = monthFromName(m[1]);
      if (month == null) return null;
      return toISO(Number(m[3]), month, Number(m[2]));
    },
    3,
  );
  run(
    /(?<!\d{1,2}\s)\b([A-Za-zÀ-ÿА-я]{3,})\s*[.\-/]?\s*(20\d{2})\b/,
    (m) => {
      const month = monthFromName(m[1]);
      if (month == null) return null;
      const year = Number(m[2]);
      return toISO(year, month, lastDayOfMonth(year, month));
    },
    2,
  );

  return found;
}

function lineContextScore(line: string, prev?: string, next?: string): number {
  let score = 0;
  if (EXPIRY_KEYWORDS.test(line)) score += 8;
  else if (prev && EXPIRY_KEYWORDS.test(prev)) score += 6;
  else if (next && EXPIRY_KEYWORDS.test(next)) score += 5;
  if (PACKED_KEYWORDS.test(line) || (prev && PACKED_KEYWORDS.test(prev))) {
    score -= 6;
  }
  return score;
}

function pickDate(hits: DateHit[]): string | null {
  if (hits.length === 0) return null;
  hits.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.precision !== a.precision) return b.precision - a.precision;
    return a.iso < b.iso ? 1 : a.iso > b.iso ? -1 : 0;
  });
  return hits[0]?.iso ?? null;
}

function datesFromLines(lines: OcrLine[]): DateHit[] {
  const hits: DateHit[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const prev = lines[i - 1]?.text;
    const next = lines[i + 1]?.text;
    const context = lineContextScore(line.text, prev, next);
    const sizeBonus = Math.min(3, Math.round(line.height / 24));
    for (const hit of collectFromLine(normalizeForDates(line.text))) {
      hits.push({
        iso: hit.iso,
        precision: hit.precision,
        score:
          context +
          sizeBonus +
          futureBonus(hit.iso) +
          (hit.precision === 3 ? 3 : 0),
      });
    }
  }
  return hits;
}

function datesFromText(text: string): DateHit[] {
  const lines = text.split(/\r?\n/).map((text, y) => ({
    text,
    y,
    height: 0,
    width: 0,
  }));
  return datesFromLines(lines);
}

const SKIP_NAME =
  /^(?:\d+[%g]?|kcal|kj|fat|protein|carb|salt|sugar|netto|net\s*wt|ingredients?|ingredientes|zutaten|e\s*\d+|lot|lote|www\.|http)/i;

const BARCODE_LIKE = /^\d{8,14}$/;
const DATE_LIKE =
  /\b\d{1,2}[./-]\d{1,2}[./-](?:\d{2}|\d{4})\b|\b20\d{2}[./-]\d{1,2}[./-]\d{1,2}\b/;

function guessName(text: string, lines?: OcrLine[]): string | null {
  const source = lines?.length
    ? lines
    : text
        .split(/\r?\n/)
        .map((l, y) => ({ text: l.trim(), y, height: 0, width: 0 }));

  const candidates: OcrLine[] = [];
  for (const line of source) {
    const trimmed = line.text.trim();
    if (trimmed.length < 2) continue;
    if (EXPIRY_KEYWORDS.test(trimmed)) continue;
    if (PACKED_KEYWORDS.test(trimmed)) continue;
    if (DATE_LIKE.test(trimmed) && trimmed.replace(DATE_LIKE, '').trim().length < 3)
      continue;
    if (BARCODE_LIKE.test(trimmed.replace(/\s/g, ''))) continue;
    if (SKIP_NAME.test(trimmed)) continue;
    if (/^[\d\s./%-]+$/.test(trimmed)) continue;
    if (trimmed.length > 60) continue;
    candidates.push({ ...line, text: trimmed });
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    const score = (s: OcrLine) => {
      let n = 0;
      if (s.text.length >= 3 && s.text.length <= 35) n += 2;
      if (/^[A-ZÁÉÍÓÚÑÄÖÜ]/.test(s.text)) n += 1;
      if (!/\d/.test(s.text)) n += 1;
      if (s.height >= 28) n += 3;
      else if (s.height >= 18) n += 1;
      if (s.y > 0 && s.y < 400) n += 1;
      return n;
    };
    return score(b) - score(a);
  });

  return candidates[0]?.text ?? null;
}

export function parseLabelText(
  rawText: string,
  lines?: OcrLine[],
): {
  name: string | null;
  expirationDate: string | null;
} {
  const normalized = rawText.replace(/\u00a0/g, ' ');
  const hits = lines?.length ? datesFromLines(lines) : datesFromText(normalized);
  const expirationDate = pickDate(hits);
  const name = guessName(normalized, lines);
  return { name, expirationDate };
}
