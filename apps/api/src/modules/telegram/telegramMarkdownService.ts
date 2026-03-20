/**
 * Telegram MarkdownV2 formatting service
 * Converts standard markdown to Telegram's MarkdownV2 format
 */

const SPECIAL_CHARS = /([_*\[\]()~`>#+\-=|{}.!\\])/g;

function escapeMarkdownV2(text: string): string {
  return text.replace(SPECIAL_CHARS, '\\$1');
}

function convertToMarkdownV2(input: string): string {
  const codeBlocks: string[] = [];

  // Extract code blocks first (protect from escaping)
  let text = input.replace(/```(\w*)\n?([\s\S]*?)```/g, (_match, lang, code) => {
    const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push(`\`\`\`${lang}\n${code}\`\`\``);
    return placeholder;
  });

  // Extract inline code
  const inlineCodes: string[] = [];
  text = text.replace(/`([^`]+)`/g, (_match, code) => {
    const placeholder = `__INLINE_CODE_${inlineCodes.length}__`;
    inlineCodes.push(`\`${code}\``);
    return placeholder;
  });

  // Convert **bold** to *bold* (Telegram uses single asterisk)
  const boldSegments: string[] = [];
  text = text.replace(/\*\*(.+?)\*\*/g, (_match, content) => {
    const placeholder = `__BOLD_${boldSegments.length}__`;
    boldSegments.push(content);
    return placeholder;
  });

  // Convert ## Headers to bold text
  const headerSegments: string[] = [];
  text = text.replace(/^#{1,6}\s+(.+)$/gm, (_match, content) => {
    const placeholder = `__HEADER_${headerSegments.length}__`;
    headerSegments.push(content);
    return placeholder;
  });

  // Escape all remaining special chars
  text = escapeMarkdownV2(text);

  // Restore bold (placeholders were escaped)
  boldSegments.forEach((content, i) => {
    text = text.replace(`\\_\\_BOLD\\_${i}\\_\\_`, `*${escapeMarkdownV2(content)}*`);
  });

  headerSegments.forEach((content, i) => {
    text = text.replace(`\\_\\_HEADER\\_${i}\\_\\_`, `*${escapeMarkdownV2(content)}*`);
  });

  inlineCodes.forEach((code, i) => {
    text = text.replace(`\\_\\_INLINE\\_CODE\\_${i}\\_\\_`, code);
  });

  codeBlocks.forEach((block, i) => {
    text = text.replace(`\\_\\_CODE\\_BLOCK\\_${i}\\_\\_`, block);
  });

  return text;
}

function splitMessage(text: string, maxLen: number = 4096): string[] {
  if (text.length <= maxLen) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > maxLen) {
    let splitIndex = remaining.lastIndexOf('\n\n', maxLen);
    if (splitIndex <= 0) splitIndex = remaining.lastIndexOf('\n', maxLen);
    if (splitIndex <= 0) splitIndex = remaining.lastIndexOf(' ', maxLen);
    if (splitIndex <= 0) splitIndex = maxLen;

    chunks.push(remaining.slice(0, splitIndex));
    remaining = remaining.slice(splitIndex).trimStart();
  }

  if (remaining.length > 0) chunks.push(remaining);
  return chunks;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/```\w*\n?([\s\S]*?)```/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
}

export const telegramMarkdownService = {
  convertToMarkdownV2,
  splitMessage,
  stripMarkdown,
  escapeMarkdownV2,
};
