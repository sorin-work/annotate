interface Props {
  value: number;
  label: string;
}

/** A thin reading progress bar; `value` goes from 0 to 1. */
export default function ProgressBar({ value, label }: Props) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div
      className="progress"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      title={`${percent}% read`}
    >
      <span style={{ width: `${percent}%` }} />
    </div>
  );
}
