import React from "react";
import { MARKER_TYPES, type TraceryParams } from "../../../shared/tracery-types";
import { Section, SelectField, SliderField, ToggleField } from "../components/fields";

const LABELS: Record<string, string> = {
  none: "None",
  dot: "Dot",
  plus: "Plus",
  cross: "Cross",
  polygon: "Polygon",
};

export const MarkersTab: React.FC<{
  params: TraceryParams;
  set: <K extends keyof TraceryParams>(key: K, value: TraceryParams[K]) => void;
}> = ({ params, set }) => (
  <div className="tab-panel">
    <Section title="Marker Type">
      <SelectField
        label="Type"
        value={params.markerType}
        options={MARKER_TYPES}
        labels={LABELS}
        onChange={(v) => set("markerType", v)}
      />
      <SliderField
        label="Size"
        value={params.markerSize}
        min={2}
        max={200}
        onChange={(v) => set("markerSize", v)}
      />
      {params.markerType === "polygon" && (
        <SliderField
          label="Sides"
          value={params.markerSides}
          min={3}
          max={12}
          onChange={(v) => set("markerSides", Math.round(v))}
        />
      )}
      <ToggleField
        label="Filled"
        value={params.markerFilled}
        onChange={(v) => set("markerFilled", v)}
      />
      {(params.markerType === "plus" || params.markerType === "cross") && (
        <ToggleField
          label="Stretch Edge-to-Edge"
          value={params.markerStretch}
          onChange={(v) => set("markerStretch", v)}
        />
      )}
    </Section>

    <Section title="Rotation">
      <SliderField
        label="Rotation Speed"
        value={params.markerRotationSpeed}
        min={-360}
        max={360}
        unit="°/s"
        onChange={(v) => set("markerRotationSpeed", v)}
      />
      <p className="note">Set to 0 for a static marker, or drive a continuous 360° spin.</p>
    </Section>
  </div>
);
