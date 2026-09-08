import React from "react";
import { FONT_CHOICES, LABEL_TYPES, type TraceryParams } from "../../../shared/tracery-types";
import { Section, SelectField, SliderField } from "../components/fields";

const LABELS: Record<string, string> = {
  none: "None",
  coordinates: "Coordinates",
  dimensions: "Dimensions",
  area: "Area (px)",
  nodeId: "Node / ID",
  hex: "Hex",
  percent: "Percent",
  matrix: "Matrix",
};

export const LabelsTab: React.FC<{
  params: TraceryParams;
  set: <K extends keyof TraceryParams>(key: K, value: TraceryParams[K]) => void;
}> = ({ params, set }) => (
  <div className="tab-panel">
    <Section title="Data Labels">
      <SelectField
        label="Label Type"
        value={params.labelType}
        options={LABEL_TYPES}
        labels={LABELS}
        onChange={(v) => set("labelType", v)}
      />
      <SliderField
        label="Font Size"
        value={params.labelFontSize}
        min={6}
        max={48}
        onChange={(v) => set("labelFontSize", v)}
      />
      <SelectField
        label="Font"
        value={params.labelFontFamily}
        options={FONT_CHOICES}
        onChange={(v) => set("labelFontFamily", v)}
      />
      <p className="note">
        Fonts are picked from a curated HUD-readable list rather than the full system font list (a CEP panel can't
        enumerate installed fonts the way a native plugin can).
      </p>
    </Section>
  </div>
);
