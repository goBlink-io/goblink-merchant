import { knowledgeBase } from "./knowledge-base";
import type { KBEntry, MatchResult } from "./types";

const MATCH_THRESHOLD = 0.15;
const MAX_RESULTS = 3;

/** Normalize text: lowercase, strip punctuation, collapse whitespace */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Tokenize into words, removing very short stop words */
function tokenize(text: string): string[] {
  const stopWords = new Set([
    "a", "an", "the", "is", "are", "was", "were", "be", "been",
    "am", "do", "does", "did", "to", "of", "in", "for", "on",
    "at", "by", "it", "i", "me", "my", "we", "us", "or", "and",
    "so", "if", "no", "not", "up", "as", "but", "can", "has",
    "had", "its", "you", "your", "he", "she", "that", "this",
    "with", "from", "they", "them", "what", "will", "would",
  ]);

  return normalize(text)
    .split(" ")
    .filter((w) => w.length > 1 && !stopWords.has(w));
}

/** Score an entry against user input tokens */
function scoreEntry(inputTokens: string[], normalizedInput: string, entry: KBEntry): number {
  let score = 0;

  // 1. Exact keyword match (highest weight — 3 points per keyword)
  for (const keyword of entry.keywords) {
    const normalizedKeyword = normalize(keyword);
    if (normalizedInput.includes(normalizedKeyword)) {
      // Longer keyword matches are worth more (multi-word phrases)
      const wordCount = normalizedKeyword.split(" ").length;
      score += 3 * wordCount;
    }
  }

  // 2. Partial keyword match (medium weight — 1 point per token overlap)
  const keywordTokens = entry.keywords.flatMap((kw) => tokenize(kw));
  const uniqueKeywordTokens = [...new Set(keywordTokens)];
  for (const token of inputTokens) {
    for (const kwToken of uniqueKeywordTokens) {
      if (kwToken === token) {
        score += 1;
      } else if (kwToken.length > 3 && token.length > 3) {
        // Fuzzy: check if one contains the other (stem-like matching)
        if (kwToken.startsWith(token) || token.startsWith(kwToken)) {
          score += 0.5;
        }
      }
    }
  }

  // 3. Question text overlap (lower weight — 0.3 per matching word)
  const questionTokens = tokenize(entry.question);
  for (const token of inputTokens) {
    if (questionTokens.includes(token)) {
      score += 0.3;
    }
  }

  // Normalize score by input length to prevent bias toward long inputs
  const maxPossible = Math.max(inputTokens.length, 1) * 5;
  return score / maxPossible;
}

/** Find the best matching knowledge base entries for user input */
export function findBestMatch(input: string): MatchResult[] {
  const normalizedInput = normalize(input);
  const inputTokens = tokenize(input);

  if (inputTokens.length === 0) {
    return [];
  }

  const scored: MatchResult[] = knowledgeBase
    .map((entry) => ({
      entry,
      score: scoreEntry(inputTokens, normalizedInput, entry),
    }))
    .filter((m) => m.score >= MATCH_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS);

  return scored;
}

/** Get a list of categories with representative questions for "no match" suggestions */
export function getCategorySuggestions(): string[] {
  const seen = new Set<string>();
  const suggestions: string[] = [];

  for (const entry of knowledgeBase) {
    if (!seen.has(entry.category)) {
      seen.add(entry.category);
      suggestions.push(entry.question);
    }
  }

  return suggestions.slice(0, 6);
}
