import React from "react";

export const Field: React.FC<{ label: string; children: React.ReactNode; hint?: string }> = ({
  label,
  children,
  hint,
}) => (
  <div className="field">
    <div className="field-label-row">
      <label>{label}</label>
      {hint && <span className="field-hint">{hint}</span>}
    </div>
    {children}
  </div>
);

export const SliderField: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}> = ({ label, value, min, max, step = 1, unit = "", onChange }) => (
  <Field label={label} hint={`${value}${unit}`}>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
    />
  </Field>
);

export const SelectField = <T extends string,>(props: {
  label: string;
  value: T;
  options: readonly T[];
  labels?: Record<string, string>;
  onChange: (v: T) => void;
}) => (
  <Field label={props.label}>
    <select
      value={props.value}
      onChange={(e) => props.onChange(e.target.value as T)}
    >
      {props.options.map((opt) => (
        <option key={opt} value={opt}>
          {props.labels?.[opt] ?? opt}
        </option>
      ))}
    </select>
  </Field>
);

export const ToggleField: React.FC<{
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, value, onChange }) => (
  <div className="field toggle-field">
    <label>{label}</label>
    <button
      className={`toggle ${value ? "on" : "off"}`}
      onClick={() => onChange(!value)}
      type="button"
    >
      {value ? "ON" : "OFF"}
    </button>
  </div>
);

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

const rgbToHex = (rgb: [number, number, number]) => {
  const c = (v: number) =>
    Math.round(clamp01(v) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${c(rgb[0])}${c(rgb[1])}${c(rgb[2])}`;
};

const hexToRgb = (hex: string): [number, number, number] => {
  const m = hex.replace("#", "");
  const r = parseInt(m.substring(0, 2), 16) / 255;
  const g = parseInt(m.substring(2, 4), 16) / 255;
  const b = parseInt(m.substring(4, 6), 16) / 255;
  return [r || 0, g || 0, b || 0];
};

export const ColorField: React.FC<{
  label: string;
  value: [number, number, number];
  onChange: (v: [number, number, number]) => void;
}> = ({ label, value, onChange }) => (
  <Field label={label}>
    <input
      type="color"
      value={rgbToHex(value)}
      onChange={(e) => onChange(hexToRgb(e.target.value))}
    />
  </Field>
);

export const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <div className="section">
    <div className="section-title">{title}</div>
    {children}
  </div>
);
