import { useRef } from 'react';
export interface TabOption {
  value: string;
  label: string;
}
export function Tabs({
  options,
  value,
  onChange,
  label,
}: {
  options: TabOption[];
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div ref={ref} className="tabs" role="tablist" aria-label={label}>
      {options.map((option, index) => (
        <button
          type="button"
          role="tab"
          aria-selected={value === option.value}
          tabIndex={value === option.value ? 0 : -1}
          key={option.value}
          onClick={() => onChange(option.value)}
          onKeyDown={(event) => {
            let next: number | undefined;
            if (event.key === 'ArrowRight') next = (index + 1) % options.length;
            if (event.key === 'ArrowLeft') next = (index - 1 + options.length) % options.length;
            if (event.key === 'Home') next = 0;
            if (event.key === 'End') next = options.length - 1;
            if (next === undefined) return;
            event.preventDefault();
            onChange(options[next].value);
            ref.current?.querySelectorAll<HTMLButtonElement>('[role=tab]')[next].focus();
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
