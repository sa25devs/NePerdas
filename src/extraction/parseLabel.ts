/**
 * Parse raw OCR text into a likely product name and expiration date.
 * Supports MHD / EXP / Best before / Use by / Caducidad / Caducitat / Validade / Λήξη / تاريخ الانتهاء / Data ważności / Годен до and common date formats.
 */

const EXPIRY_KEYWORDS =
  /(?:best\s*before|use\s*by|exp(?:iry|ires|iration)?\.?|mhd|bbd|caducidad|caducitat|consumir\s*(?:preferentemente\s*|preferentment\s*)?(?:antes(?:\s*de)?|preferente)|vence|vencimiento|validade|data\s*de\s*validade|consumir\s*(?:de\s*)?prefer[eê]ncia|à\s*consommer\s*(?:de\s*)?préférence|mindesthaltbar(?:keitsdatum)?|verbrauchen\s*bis|λήξη|ημερομηνία\s*λήξης|ανάλωση|تاريخ\s*الانتهاء|صالح\s*حتى|يفضل\s*الاستهلاك|الصلاحية|data\s*ważności|termin\s*ważności|spożyć\s*do|najlepiej\s*spożyć|przydatn(?:ość|y)|годен\s*до|срок\s*годности|употребить\s*до)/i;

const DATE_PATTERNS: RegExp[] = [
  // YYYY-MM-DD
  /\b(20\d{2})[./-](\d{1,2})[./-](\d{1,2})\b/,
  // DD.MM.YYYY or DD/MM/YYYY or DD-MM-YYYY
  /\b(\d{1,2})[./-](\d{1,2})[./-](20\d{2})\b/,
  // DD.MM.YY or DD/MM/YY
  /\b(\d{1,2})[./-](\d{1,2})[./-](\d{2})\b/,
];

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

function expandYear(yy: number): number {
  return yy >= 70 ? 1900 + yy : 2000 + yy;
}

function parseDateMatch(match: RegExpMatchArray): string | null {
  const a = Number(match[1]);
  const b = Number(match[2]);
  const c = Number(match[3]);

  // YYYY-MM-DD style (first group is 20xx)
  if (match[1].length === 4) {
    return toISO(a, b, c);
  }

  // DD.MM.YYYY
  if (match[3].length === 4) {
    return toISO(c, b, a);
  }

  // DD.MM.YY — prefer day/month/year (European)
  if (match[3].length === 2) {
    const year = expandYear(c);
    // If first > 12, must be DD/MM
    if (a > 12) return toISO(year, b, a);
    // If second > 12, must be MM/DD (US) — treat as MM/DD
    if (b > 12) return toISO(year, a, b);
    // Default European DD/MM
    return toISO(year, b, a);
  }

  return null;
}

function findDateNearKeywords(text: string): string | null {
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (EXPIRY_KEYWORDS.test(line)) {
      for (const pattern of DATE_PATTERNS) {
        const m = line.match(pattern);
        if (m) {
          const iso = parseDateMatch(m);
          if (iso) return iso;
        }
      }
      // Check next line
      if (i + 1 < lines.length) {
        for (const pattern of DATE_PATTERNS) {
          const m = lines[i + 1].match(pattern);
          if (m) {
            const iso = parseDateMatch(m);
            if (iso) return iso;
          }
        }
      }
    }
  }
  return null;
}

function findAnyDate(text: string): string | null {
  for (const pattern of DATE_PATTERNS) {
    const global = new RegExp(pattern.source, 'g');
    let m: RegExpExecArray | null;
    while ((m = global.exec(text)) !== null) {
      const iso = parseDateMatch(m);
      if (iso) {
        // Prefer future or recent dates over ancient ones
        const year = Number(iso.slice(0, 4));
        const now = new Date().getFullYear();
        if (year >= now - 1 && year <= now + 5) return iso;
      }
    }
  }
  return null;
}

const SKIP_NAME =
  /^(?:\d+[%g]?|kcal|kj|fat|protein|carb|salt|sugar|netto|net\s*wt|ingredients?|ingredientes|zutaten|e\s*\d+|lot|lote|www\.|http)/i;

const BARCODE_LIKE = /^\d{8,14}$/;
const DATE_LIKE =
  /\b\d{1,2}[./-]\d{1,2}[./-](?:\d{2}|\d{4})\b|\b20\d{2}[./-]\d{1,2}[./-]\d{1,2}\b/;

function guessName(text: string): string | null {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 2);

  const candidates: string[] = [];
  for (const line of lines) {
    if (EXPIRY_KEYWORDS.test(line)) continue;
    if (DATE_LIKE.test(line) && line.replace(DATE_LIKE, '').trim().length < 3)
      continue;
    if (BARCODE_LIKE.test(line.replace(/\s/g, ''))) continue;
    if (SKIP_NAME.test(line)) continue;
    if (/^[\d\s./%-]+$/.test(line)) continue;
    if (line.length > 60) continue;
    candidates.push(line);
  }

  if (candidates.length === 0) return null;

  // Prefer shorter title-like lines near the top
  candidates.sort((a, b) => {
    const score = (s: string) => {
      let n = 0;
      if (s.length >= 3 && s.length <= 35) n += 2;
      if (/^[A-ZÁÉÍÓÚÑÄÖÜ]/.test(s)) n += 1;
      if (!/\d/.test(s)) n += 1;
      return n;
    };
    return score(b) - score(a);
  });

  return candidates[0];
}

export function parseLabelText(rawText: string): {
  name: string | null;
  expirationDate: string | null;
} {
  const normalized = rawText.replace(/\u00a0/g, ' ');
  const expirationDate =
    findDateNearKeywords(normalized) ?? findAnyDate(normalized);
  const name = guessName(normalized);
  return { name, expirationDate };
}
