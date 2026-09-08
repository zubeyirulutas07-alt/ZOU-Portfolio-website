import React from "react";
import { type TraceryParams, DETECTION_MODES } from "../../../shared/tracery-types";
import { ColorField, Section, SelectField, SliderField, ToggleField } from "../components/fields";

const LABELS: Record<string, string> = {
  color: "Key Color",
  motion: "Motion Detection",
};

export const DetectionTab: React.FC<{
  params: TraceryParams;
  set: <K extends keyof TraceryParams>(key: K, value: TraceryParams[K]) => void;
}> = ({ params, set }) => (
  <div className="tab-panel">
    <Section title="Detection Method">
      <SelectField
        label="Mode"
        value={params.detectionMode}
        options={DETECTION_MODES}
        labels={LABELS}
        onChange={(v) => set("detectionMode", v)}
      />
      {params.detectionMode === "color" ? (
        <>
          <ColorField label="Key Color" value={params.keyColor} onChange={(v) => set("keyColor", v)} />
          <SliderField
            label="Tolerance"
            value={params.keyTolerance}
            min={1}
            max={100}
            onChange={(v) => set("keyTolerance", v)}
          />
          <SliderField
            label="Edge Softness"
            value={params.keyEdgeSoftness}
            min={0}
            max={100}
            onChange={(v) => set("keyEdgeSoftness", v)}
          />
        </>
      ) : (
        <>
          <SliderField
            label="Motion Threshold"
            value={params.motionThreshold}
            min={1}
            max={100}
            onChange={(v) => set("motionThreshold", v)}
          />
          <SliderField
            label="Motion Sensitivity"
            value={params.motionSensitivity}
            min={1}
            max={100}
            onChange={(v) => set("motionSensitivity", v)}
          />
        </>
      )}
    </Section>

    <Section title="Signal Nodes">
      <SliderField
        label="Node Count"
        value={params.nodeCount}
        min={1}
        max={8}
        onChange={(v) => set("nodeCount", Math.round(v))}
      />
      <SliderField
        label="Min Region Size"
        value={params.minRegionSize}
        min={1}
        max={50}
        unit="%"
        onChange={(v) => set("minRegionSize", v)}
      />
    </Section>

    <Section title="Sampling Quality">
      <SliderField
        label="Grid X"
        value={params.sampleGridX}
        min={4}
        max={40}
        onChange={(v) => set("sampleGridX", Math.round(v))}
      />
      <SliderField
        label="Grid Y"
        value={params.sampleGridY}
        min={4}
        max={40}
        onChange={(v) => set("sampleGridY", Math.round(v))}
      />
      <p className="note">
        Higher grids find smaller regions but sample more pixels per frame — lower them while scrubbing, raise
        them before render.
      </p>
    </Section>
  </div>
);
