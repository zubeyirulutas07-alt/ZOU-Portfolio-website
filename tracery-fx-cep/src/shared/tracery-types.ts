/**
 * Shared parameter model for the Tracery FX rig.
 * Imported by both the CEP panel (React) and the ExtendScript host (aeft.ts)
 * so the UI, the generated AE expressions, and the preset files never drift apart.
 */

export const DETECTION_MODES = ["color", "motion"] as const;
export type DetectionMode = (typeof DETECTION_MODES)[number];

export const BOX_SHAPES = ["rectangle", "square", "ellipse", "circle"] as const;
export type BoxShape = (typeof BOX_SHAPES)[number];

export const BOX_FILL_MODES = [
  "none",
  "diagonalHatch",
  "invert",
  "randomPatch",
  "xrayLut",
  "bwDuotone",
  "glitch",
] as const;
export type BoxFillMode = (typeof BOX_FILL_MODES)[number];

export const MARKER_TYPES = ["none", "dot", "plus", "cross", "polygon"] as const;
export type MarkerType = (typeof MARKER_TYPES)[number];

export const VIEW_MODES = ["edge", "cartesian"] as const;
export type ViewMode = (typeof VIEW_MODES)[number];

export const VALUE_MODES = ["pixels", "percent"] as const;
export type ValueMode = (typeof VALUE_MODES)[number];

export const LINE_STYLES = ["none", "spline", "pcbTraces", "smoothBend", "stepBend"] as const;
export type LineStyle = (typeof LINE_STYLES)[number];

export const FONT_CHOICES = ["Consolas", "Courier New", "Arial", "Verdana", "OCRAStd"] as const;
export type FontChoice = (typeof FONT_CHOICES)[number];

export const LABEL_TYPES = [
  "none",
  "coordinates",
  "dimensions",
  "area",
  "nodeId",
  "hex",
  "percent",
  "matrix",
] as const;
export type LabelType = (typeof LABEL_TYPES)[number];

/**
 * Manual-loop indexOf so this also works when compiled into the ExtendScript
 * (jsx) bundle, whose "noLib" type environment doesn't provide
 * Array.prototype.indexOf.
 */
export const enumIndex = <T extends readonly string[]>(list: T, value: T[number]): number => {
  for (let i = 0; i < list.length; i++) {
    if (list[i] === value) return i;
  }
  return -1;
};

export interface TraceryParams {
  // 1. Keying / Detection
  detectionMode: DetectionMode;
  keyColor: [number, number, number]; // 0-1 rgb
  keyTolerance: number; // 0-100
  keyEdgeSoftness: number; // 0-100
  motionThreshold: number; // 0-100
  motionSensitivity: number; // 0-100
  nodeCount: number; // 1-8, how many detection bands/nodes to solve for
  minRegionSize: number; // 0-100, minimum coverage % of a band before a node is considered "active"
  sampleGridX: number; // sampling grid resolution per node band
  sampleGridY: number;

  // 2. Box
  boxShape: BoxShape;
  boxFillMode: BoxFillMode;
  boxPadding: number; // % padding around detected region
  boxStrokeWidth: number;
  boxCornerRadius: number; // rectangle only
  boxRotation: number; // degrees, static offset

  // 3. Markers
  markerType: MarkerType;
  markerSize: number;
  markerSides: number; // polygon 3-12
  markerFilled: boolean;
  markerStretch: boolean; // plus/cross stretch edge-to-edge across box
  markerRotationSpeed: number; // degrees / sec, 360 continuous spin

  // 4. Grid / View
  showGrid: boolean;
  gridDensity: number; // divisions
  viewMode: ViewMode;
  valueMode: ValueMode;

  // 5. Connection Lines
  lineStyle: LineStyle;
  lineBendAmount: number; // 0-100
  lineBendBalance: number; // -100..100
  lineCornerPosition: number; // 0-100, step-bend corner placement
  lineStrokeWidth: number;

  // 6. Labels / Display
  labelType: LabelType;
  labelFontSize: number;
  labelFontFamily: FontChoice;

  // Global
  accentColor: [number, number, number];
  opacity: number; // 0-100 master opacity of the overlay
}

export const DEFAULT_PARAMS: TraceryParams = {
  detectionMode: "color",
  keyColor: [0.14, 0.95, 0.55],
  keyTolerance: 28,
  keyEdgeSoftness: 8,
  motionThreshold: 12,
  motionSensitivity: 55,
  nodeCount: 4,
  minRegionSize: 6,
  sampleGridX: 14,
  sampleGridY: 10,

  boxShape: "rectangle",
  boxFillMode: "none",
  boxPadding: 12,
  boxStrokeWidth: 2,
  boxCornerRadius: 0,
  boxRotation: 0,

  markerType: "plus",
  markerSize: 18,
  markerSides: 6,
  markerFilled: false,
  markerStretch: true,
  markerRotationSpeed: 0,

  showGrid: true,
  gridDensity: 8,
  viewMode: "edge",
  valueMode: "pixels",

  lineStyle: "spline",
  lineBendAmount: 35,
  lineBendBalance: 0,
  lineCornerPosition: 50,
  lineStrokeWidth: 2,

  labelType: "coordinates",
  labelFontSize: 12,
  labelFontFamily: "Consolas",

  accentColor: [0.14, 0.95, 0.55],
  opacity: 100,
};

export interface TraceryPreset {
  name: string;
  description?: string;
  params: TraceryParams;
}
