// lib/scoreNews.ts

const KEYWORDS = {
  MAJOR_DEAL: [
    "acquisition","acquire","merger","buyout","joint venture","mou","partnership"
  ],
  CONTRACT: [
    "contract","deal","agreement","award","tender","order","signed"
  ],
  EARNINGS: [
    "earnings","results","profit","revenue","guidance","outlook"
  ],
  CAPITAL: [
    "buyback","repurchase","dividend","capital increase","share issue"
  ],
  DEFENSE: [
    "defense","navy","warship","frigate","corvette","missile","military","dod","pentagon"
  ],
  NEGATIVE: [
    "investigation","lawsuit","sec","fraud","bankruptcy","default","penalty"
  ],
  ANALYST_NOISE: [
    "price target","downgrade","upgrade","rating","analyst","coverage"
  ]
};

function hasAny(text: string, words: string[]) {
  const t = text.toLowerCase();
  return words.some(w => t.includes(w));
}

export function scoreNews(item: {
  headline: string;
  source?: string;
  datetime: number;
  tickers?: string[];
}) {
  let score = 0;
  const h = item.headline || "";
  const tickers = item.tickers ?? [];

  // A) Ticker
  if (tickers.length > 0) score += 20;

  // B) İçerik
  if (hasAny(h, KEYWORDS.MAJOR_DEAL)) score += 40;
  if (hasAny(h, KEYWORDS.CONTRACT)) score += 35;
  if (hasAny(h, KEYWORDS.EARNINGS)) score += 30;
  if (hasAny(h, KEYWORDS.CAPITAL)) score += 25;
  if (hasAny(h, KEYWORDS.DEFENSE)) score += 35;
  if (hasAny(h, KEYWORDS.NEGATIVE)) score += 30;

  // C) Analist spam cezası
  if (hasAny(h, KEYWORDS.ANALYST_NOISE)) score -= 20;

  // D) Kaynak
  if (item.source?.toUpperCase() === "KAP") score += 30;
  if (["REUTERS","BLOOMBERG","WSJ"].includes(item.source?.toUpperCase() || "")) score += 10;

  // E) Zaman
  const ageMin = (Date.now() - item.datetime * 1000) / 60000;
  if (ageMin <= 120) score += 15;
  else if (ageMin <= 1440) score += 8;

  const level =
    score >= 80 ? "HIGH" :
    score >= 60 ? "MID" :
    "LOW";

  return { score, level };
}