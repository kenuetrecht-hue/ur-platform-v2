/**
 * Lightweight spoken-language detection for audit copies.
 * Used so foreign-language talk always gets an English file next to the original.
 */

export function inferSpokenLanguage(text: string): string {
  const sample = text.slice(0, 800);
  if (/[\u0400-\u04FF]/.test(sample)) return "Russian";
  if (/[\u0600-\u06FF]/.test(sample)) return "Arabic";
  if (/[\u3040-\u30FF]/.test(sample)) return "Japanese";
  if (/[\u3400-\u9FFF]/.test(sample)) return "Chinese";
  if (/[\uAC00-\uD7AF]/.test(sample)) return "Korean";
  if (/[\u0590-\u05FF]/.test(sample)) return "Hebrew";
  if (/\b(não|você|são|obrigad|olá)\b/i.test(sample)) return "Portuguese";
  if (
    /[ñ¿¡]/i.test(sample) ||
    /\b(hola|gracias|amigo|estás|buenos días|por favor)\b/i.test(sample)
  ) {
    return "Spanish";
  }
  if (/\b(le|la|les|des|une|est|pas|pour)\b/i.test(sample) && /[éèêàç]/i.test(sample)) return "French";
  if (/\b(der|die|das|und|ist|nicht|ein)\b/i.test(sample)) return "German";
  return "English";
}

/** True when the owner needs a separate English copy beside the original. */
export function looksNonEnglish(text: string): boolean {
  return inferSpokenLanguage(text) !== "English";
}
