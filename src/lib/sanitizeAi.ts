// Sanitize AI-generated text fields — hide fallback/error messages from display

const ERROR_PATTERNS = [
  /insufficient data/i,
  /no (?:data|market data|indicator|technical) (?:data )?(?:available|provided)/i,
  /no technical indicator data/i,
  /cannot (?:determine|assess)/i,
  /cannot perform/i,
  /cannot analyze/i,
  /unable to (?:analyze|determine)/i,
  /unavailable/i,
  /missing data/i,
  /lacks all required technical indicators/i,
  /contains only html/i,
  /html markup/i,
  /html (?:page|authentication)/i,
  /authentication page/i,
  /n\/a/i,
  /no (?:clear |valid )?(?:zone|trade|setup)/i,
  /impossible without/i,
  /requires? proper/i,
  /requires? current market session information/i,
  /timestamp not available/i,
  /no market timestamp available/i,
  /await proper data/i,
  /awaiting data/i,
  /no trade (?:setup|executed)/i,
  /analysis cannot be (?:completed|performed)/i,
  /divergence(?:s)? .* cannot/i,
];

/**
 * Returns the text if it's valid analysis content, or a fallback string.
 * If no fallback is provided, returns empty string (hides the text).
 */
export function sanitizeAiText(value: unknown, fallback = ""): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "-" || trimmed === "—") return fallback;
  if (ERROR_PATTERNS.some(p => p.test(trimmed))) return fallback;
  return trimmed;
}

/**
 * Returns true if the AI text is valid (not an error/fallback message)
 */
export function isValidAiText(value: unknown): value is string {
  return sanitizeAiText(value) !== "";
}
