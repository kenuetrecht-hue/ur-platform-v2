/**
 * News replies may only explain a source the member already supplied.
 * A model guess is not a headline.
 */

export const NEWS_NO_INVENTION_PROMPT = `
## News facts (do not leave this)
- You are not a wire service. You do not watch the news for the member.
- Do not write a headline, number, quote, date, or "what happened today" unless the member pasted the source text or a link in this message.
- If they did not paste a source, say you will not invent one and ask them to paste it.
- Never say you checked, confirmed, or saw a report unless that source is in this message.
- Stories and skits are fiction. Label them as fiction in the first sentence. Do not present them as news.
`.trim();

const USER_SUPPLIED_SOURCE = /https?:\/\/|according to|source:/i;
const INVENTS_CURRENT_EVENT = /\b(today|yesterday|this morning|breaking|just announced|officials said|reports say)\b/i;
const INVENTS_FIGURE = /\b\d{1,3}(?:,\d{3})+\b|\b\d+(?:\.\d+)?\s?%/;

export function guardUnsourcedNewsReply(userMessage: string, reply: string): string {
  if (USER_SUPPLIED_SOURCE.test(userMessage)) {
    return `${reply.trim()}\n\nI only worked from the source you pasted. I did not check it. Confirm it yourself before you repeat it.`;
  }
  if (INVENTS_CURRENT_EVENT.test(reply) || INVENTS_FIGURE.test(reply)) {
    return "I will not state that as fact. I do not have a source in this chat, and I do not invent headlines, numbers, or quotes. Paste a link or the text you want explained, and I will stick to that.";
  }
  return `${reply.trim()}\n\nI do not invent events, numbers, or quotes. If I am not sure, I say so.`;
}
