interface QuoteOptions {
  title?: string | null;
  note?: string | null;
}

/** A highlight as a Markdown blockquote, ready to paste into notes or a post. */
export function quoteAsMarkdown(quote: string, { title, note }: QuoteOptions = {}): string {
  const lines = quote
    .trim()
    .split('\n')
    .map((line) => `> ${line}`.trimEnd());
  if (title) lines.push('>', `> — ${title}`);
  const body = lines.join('\n');
  return note?.trim() ? `${body}\n\n${note.trim()}` : body;
}
