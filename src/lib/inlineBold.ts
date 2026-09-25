export interface TextSegment {
  text: string;
  bold: boolean;
}

// Splits a Learn paragraph into plain/bold runs. The BE only allows `**bold**` markers inside
// block text (no other markdown), so this is deliberately tiny instead of pulling a markdown
// renderer: an unmatched `**` is kept as literal text rather than bolding the rest of the line.
export function parseBoldSegments(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const boldPattern = /\*\*(.+?)\*\*/g;
  let cursor = 0;
  for (const match of text.matchAll(boldPattern)) {
    const start = match.index ?? 0;
    if (start > cursor) {
      segments.push({ text: text.slice(cursor, start), bold: false });
    }
    segments.push({ text: match[1], bold: true });
    cursor = start + match[0].length;
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), bold: false });
  }
  return segments;
}
