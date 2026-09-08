import React from "react";
import { LINE_STYLES, type TraceryParams } from "../../../shared/tracery-types";
import { Section, SelectField, SliderField } from "../components/fields";

const LABELS: Record<string, string> = {
  none: "None",
  spline: "Spline",
  pcbTraces: "PCB Traces",
  smoothBend: "Smooth Bend",
  stepBend: "Step Bend",
};

export const LinesTab: React.FC<{
  params: TraceryParams;
  set: <K extends keyof TraceryParams>(key: K, value: TraceryParams[K]) => void;
}> = ({ params, set }) => (
  <div className="tab-panel">
    <Section title="Connection Lines">
      <SelectField
        label="Style"
        value={params.lineStyle}
        options={LINE_STYLES}
        labels={LABELS}
        onChange={(v) => set("lineStyle", v)}
      />
      <SliderField
        label="Stroke Width"
        value={params.lineStrokeWidth}
        min={0.5}
        max={10}
        step={0.5}
        onChange={(v) => set("lineStrokeWidth", v)}
      />
      {(params.lineStyle === "spline" || params.lineStyle === "smoothBend") && (
        <SliderField
          label="Bend Amount"
          value={params.lineBendAmount}
          min={0}
          max={100}
          unit="%"
          onChange={(v) => set("lineBendAmount", v)}
        />
      )}
      {params.lineStyle === "smoothBend" && (
        <SliderField
          label="Bend Balance"
          value={params.lineBendBalance}
          min={-100}
          max={100}
          onChange={(v) => set("lineBendBalance", v)}
        />
      )}
      {(params.lineStyle === "pcbTraces" || params.lineStyle === "stepBend") && (
        <SliderField
          label="Corner Position"
          value={params.lineCornerPosition}
          min={0}
          max={100}
          unit="%"
          onChange={(v) => set("lineCornerPosition", v)}
        />
      )}
      <p className="note">Lines connect active nodes in index order, skipping any node with no current detection.</p>
    </Section>
  </div>
);
