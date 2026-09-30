import { interestMatchScore } from "./member-interests";

/**
 * Lead with what the member asked for, then keep other posts in the mix.
 * Three matches, then one other item, repeating.
 */
export function rankForMemberInterests<T>(
  items: readonly T[],
  interests: readonly string[],
  textOf: (item: T) => string,
  isVideo?: (item: T) => boolean,
): T[] {
  if (interests.length === 0 || items.length < 2) return [...items];

  const matched: T[] = [];
  const rest: T[] = [];
  for (const item of items) {
    const textScore = interestMatchScore(textOf(item), interests);
    const videoBonus = isVideo?.(item) ? 8 : 0;
    if (textScore + videoBonus > 0 && textScore > 0) matched.push(item);
    else rest.push(item);
  }
  if (matched.length === 0) return [...items];

  const out: T[] = [];
  let m = 0;
  let r = 0;
  while (m < matched.length || r < rest.length) {
    for (let i = 0; i < 3 && m < matched.length; i += 1) out.push(matched[m++]!);
    if (r < rest.length) out.push(rest[r++]!);
  }
  return out;
}
