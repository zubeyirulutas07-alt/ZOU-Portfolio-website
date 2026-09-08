import React from "react";
import { type TraceryParams, VALUE_MODES, VIEW_MODES } from "../../../shared/tracery-types";
import { Section, SelectField, SliderField, ToggleField } from "../components/fields";

const VIEW_LABELS: Record<string, string> = { edge: "Edge (top-left origin)", cartesian: "Cartesian (center origin)" };
const VALUE_LABELS: Record<string, string> = { pixels: "Pixels", percent: "Percent" };

export const GridTab: React.FC<{
  params: TraceryParams;
  set: <K extends keyof TraceryParams>(key: K, value: TraceryParams[K]) => void;
}> = ({ params, set }) => (
  <div className="tab-panel">
    <Section title="Grid Overlay">
      <ToggleField label="Show Grid" value={params.showGrid} onChange={(v) => set("showGrid", v)} />
      <SliderField
        label="Grid Density"
        value={params.gridDensity}
        min={2}
        max={32}
        onChange={(v) => set("gridDensity", Math.round(v))}
      />
      <p className="note">
        Grid line count is baked in when the rig is built — change it, then use "Update Rig" to regenerate.
      </p>
    </Section>

    <Section title="Coordinate Display">
      <SelectField
        label="View Mode"
        value={params.viewMode}
        options={VIEW_MODES}
        labels={VIEW_LABELS}
        onChange={(v) => set("viewMode", v)}
      />
      <SelectField
        label="Scale / Value Mode"
        value={params.valueMode}
        options={VALUE_MODES}
        labels={VALUE_LABELS}
        onChange={(v) => set("valueMode", v)}
      />
    </Section>
  </div>
);
