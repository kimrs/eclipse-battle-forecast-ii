interface StepperProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  accentColor?: 'blue' | 'purple';
}

export function Stepper({ value, min, max, onChange, accentColor = 'blue' }: StepperProps) {
  const ring = accentColor === 'purple' ? 'focus-visible:ring-purple-400' : 'focus-visible:ring-blue-400';

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded bg-gray-700 border border-gray-600 text-white text-lg font-bold disabled:opacity-30 disabled:cursor-not-allowed active:bg-gray-600 transition-colors ${ring} focus-visible:outline-none focus-visible:ring-2`}
      >
        −
      </button>
      <span className="min-w-[2rem] text-center text-white text-sm font-medium tabular-nums">
        {value}
      </span>
      <button
        type="button"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded bg-gray-700 border border-gray-600 text-white text-lg font-bold disabled:opacity-30 disabled:cursor-not-allowed active:bg-gray-600 transition-colors ${ring} focus-visible:outline-none focus-visible:ring-2`}
      >
        +
      </button>
    </div>
  );
}
