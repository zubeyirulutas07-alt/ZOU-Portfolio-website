import React from "react";
import { BOX_FILL_MODES, BOX_SHAPES, type TraceryParams } from "../../../shared/tracery-types";
import { Section, SelectField, SliderField } from "../components/fields";

const SHAPE_LABELS: Record<string, string> = {
  rectangle: "Rectangle",
  square: "Square",
  ellipse: "Ellipse",
  circle: "Circle",
};

const FILL_LABELS: Record<string, string> = {
  none: "None",
  diagonalHatch: "Diagonal Hatch",
  invert: "Invert",
  randomPatch: "Random Patch",
  xrayLut: "X-ray LUT",
  bwDuotone: "BW Duotone",
  glitch: "Glitch",
};

export const BoxTab: React.FC<{
  params: TraceryParams;
  set: <K extends keyof TraceryParams>(key: K, value: TraceryParams[K]) => void;
}> = ({ params, set }) => (
  <div className="tab-panel">
    <Section title="Box Shape">
      <SelectField
        label="Shape"
        value={params.boxShape}
        options={BOX_SHAPES}
        labels={SHAPE_LABELS}
        onChange={(v) => set("boxShape", v)}
      />
      <SliderField
        label="Corner Radius"
        value={params.boxCornerRadius}
        min={0}
        max={100}
        onChange={(v) => set("boxCornerRadius", v)}
      />
      <SliderField
        label="Padding"
        value={params.boxPadding}
        min={-50}
        max={200}
        unit="%"
        onChange={(v) => set("boxPadding", v)}
      />
      <SliderField
        label="Rotation"
        value={params.boxRotation}
        min={-180}
        max={180}
        unit="°"
        onChange={(v) => set("boxRotation", v)}
      />
      <SliderField
        label="Stroke Width"
        value={params.boxStrokeWidth}
        min={0}
        max={12}
        onChange={(v) => set("boxStrokeWidth", v)}
      />
    </Section>

    <Section title="Fill Mode">
      <SelectField
        label="Treatment"
        value={params.boxFillMode}
        options={BOX_FILL_MODES}
        labels={FILL_LABELS}
        onChange={(v) => set("boxFillMode", v)}
      />
      <p className="note">
        Fill treatments duplicate the source footage, mask it to the box, and apply a stock After Effects effect
        chain approximating the look (e.g. Glitch = Turbulent Displace + Posterize).
      </p>
    </Section>
  </div>
);
