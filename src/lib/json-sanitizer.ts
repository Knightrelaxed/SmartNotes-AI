/**
 * Evaluates and extracts a valid JSON object or array from a string.
 * This handles common LLM quirks, such as wrapping the output in markdown codeblocks
 * or adding conversational filler text before/after the JSON.
 */
export function extractSafeJSON<T = any>(fallbackString: string): T {
  let text = fallbackString.trim();

  // 1. Strip markdown codeblocks if they exist
  // Matches ```json or just ``` wrapping the content
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)```/i;
  const match = text.match(codeBlockRegex);
  if (match && match[1]) {
    text = match[1].trim();
  }

  // 2. Fallback to extracting everything from the first '{' or '[' to the last '}' or ']'
  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');
  const lastBrace = text.lastIndexOf('}');
  const lastBracket = text.lastIndexOf(']');

  let startIndex = -1;
  let endIndex = -1;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIndex = firstBrace;
    endIndex = lastBrace;
  } else if (firstBracket !== -1) {
    startIndex = firstBracket;
    endIndex = lastBracket;
  }

  if (startIndex !== -1 && endIndex !== -1 && endIndex >= startIndex) {
    text = text.slice(startIndex, endIndex + 1);
  }

  // 3. Attempt parsing
  return JSON.parse(text) as T;
}
