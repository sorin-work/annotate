import { splitMatches } from '../lib/matches';

/** Text with the search query marked wherever it appears. */
export default function Matched({ text, query }: { text: string; query?: string }) {
  if (!query) return <>{text}</>;
  return (
    <>
      {splitMatches(text, query).map((part, i) =>
        part.match ? (
          <mark key={i} className="match">
            {part.text}
          </mark>
        ) : (
          part.text
        ),
      )}
    </>
  );
}
