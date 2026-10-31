/**
 * Form controls for the settings window: slider, toggle, segmented picker,
 * and the ? tooltip that carries every explanation. Purely presentational;
 * parents own the values.
 */

import { CircleHelp } from "lucide-react";
import { useId, useState } from "react";
import { t } from "../../i18n";

/** Explanation behind a ? icon: shown on hover, keyboard focus and click. */
export function HelpTip({ text }: { text: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <span className="help-tip" data-open={open}>
      <button
        type="button"
        className="help-tip-button"
        aria-label={t.common.help}
        aria-describedby={id}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
      >
        <CircleHelp size={14} aria-hidden />
      </button>
      <span id={id} role="tooltip" className="help-tip-text">
        {text}
      </span>
    </span>
  );
}

/** A row label, with its explanation beside it when it has one. */
export function CtlLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <span className="ctl-label">
      {label}
      {hint && <HelpTip text={hint} />}
    </span>
  );
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}

export function AeroSlider({ label, value, min, max, step = 0.01, format, onChange }: SliderProps) {
  const id = useId();
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="ctl-row">
      <label className="ctl-label ctl-label-fixed" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="ctl-slider"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ "--fill": `${pct}%` } as React.CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="ctl-value">{format ? format(value) : value.toFixed(2)}</span>
    </div>
  );
}

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}

export function AeroToggle({ label, checked, onChange, hint }: ToggleProps) {
  return (
    <div className="ctl-row">
      <CtlLabel label={label} hint={hint} />
      <button
        className="ctl-toggle"
        role="switch"
        aria-label={label}
        aria-checked={checked}
        data-on={checked}
        onClick={() => onChange(!checked)}
      >
        <span className="ctl-toggle-thumb" />
      </button>
    </div>
  );
}

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}

export function AeroSegmented<T extends string>({ label, value, options, onChange }: SegmentedProps<T>) {
  return (
    <div className="ctl-row">
      <span className="ctl-label">{label}</span>
      <div className="ctl-segmented" role="radiogroup" aria-label={label}>
        {options.map((opt) => (
          <button
            key={opt.value}
            role="radio"
            aria-checked={opt.value === value}
            data-active={opt.value === value}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
