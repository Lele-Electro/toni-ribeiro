/**
 * The promotional email's rules. The API applies the same ones
 * (backend/services/promotional-email.js); checking here first explains problems as the
 * owner types.
 */
export const MAX_RECIPIENTS = 20;
export const NAME_MAX = 100;
export const MESSAGE_MAX = 3000;

const LOCAL_PART = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/;
const DOMAIN = /^(?=.{4,253}$)([A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/;

/** A plain address (no display name, spaces or line breaks). */
export function isEmail(value: string): boolean {
  if (value.length > 254) return false;
  const at = value.lastIndexOf('@');
  if (at < 1) return false;
  const local = value.slice(0, at);
  return local.length <= 64 && LOCAL_PART.test(local) && DOMAIN.test(value.slice(at + 1));
}

export interface ParsedRecipients {
  /** Valid, each once, in the order typed. */
  recipients: string[];
  invalid: string[];
  /** How many repeats were dropped (ignoring case). */
  duplicates: number;
}

/** Addresses separated by commas, semicolons, spaces or new lines. */
export function parseRecipients(text: string): ParsedRecipients {
  const recipients: string[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();
  let duplicates = 0;
  for (const email of text.split(/[\s,;]+/).filter(Boolean)) {
    const key = email.toLowerCase();
    if (seen.has(key)) {
      duplicates++;
      continue;
    }
    seen.add(key);
    (isEmail(email) ? recipients : invalid).push(email);
  }
  return { recipients, invalid, duplicates };
}

export type PromotionalField = 'recipients' | 'name' | 'message';
export type PromotionalErrors = Partial<Record<PromotionalField, string>>;

export function recipientsError(parsed: ParsedRecipients): string | undefined {
  if (parsed.invalid.length)
    return `${parsed.invalid.length === 1 ? 'This is not a valid address' : 'These are not valid addresses'}: ${parsed.invalid.join(', ')}.`;
  if (!parsed.recipients.length) return 'Add at least one recipient email address.';
  if (parsed.recipients.length > MAX_RECIPIENTS)
    return `Send to at most ${MAX_RECIPIENTS} recipients at a time.`;
  return undefined;
}

/** The greeting name and the introduction; recipients are checked separately. */
export function messageErrors(name: string, message: string): PromotionalErrors {
  const errors: PromotionalErrors = {};
  if (!name.trim()) errors.name = 'Enter the name of the person or business you are writing to.';
  else if (name.trim().length > NAME_MAX) errors.name = `Keep the name to ${NAME_MAX} characters.`;
  if (!message.trim()) errors.message = 'Write an introductory message.';
  else if (message.trim().length > MESSAGE_MAX)
    errors.message = `Keep the introduction to ${MESSAGE_MAX} characters.`;
  return errors;
}

/** Identifies one press of Send, so the API can ignore a repeat of it. */
export function newSendId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
  );
}
