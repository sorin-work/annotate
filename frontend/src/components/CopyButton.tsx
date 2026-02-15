import { useEffect, useState } from 'react';

interface Props {
  text: string;
  label?: string;
}

type Status = 'idle' | 'copied' | 'failed';

export default function CopyButton({ text, label = 'Copy' }: Props) {
  const [status, setStatus] = useState<Status>('idle');

  useEffect(() => {
    if (status === 'idle') return;
    const timer = window.setTimeout(() => setStatus('idle'), 2000);
    return () => window.clearTimeout(timer);
  }, [status]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setStatus('copied');
    } catch {
      setStatus('failed');
    }
  }

  return (
    <button type="button" className="button-link small" onClick={copy} aria-live="polite">
      {status === 'copied' ? 'Copied' : status === 'failed' ? 'Copy failed' : label}
    </button>
  );
}
