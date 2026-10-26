interface HighlightedTextProps {
  text: string;
  query: string;
  className?: string;
}

/**
 * Highlight matching query substrings within text
 */
export function HighlightedText({ text, query, className = 'bg-[#6C63FF]/20 text-[#6C63FF] rounded px-0.5' }: HighlightedTextProps) {
  if (!query || !query.trim() || !text) {
    return <>{text}</>;
  }

  // Escape special regex characters
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className={className}>
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}
