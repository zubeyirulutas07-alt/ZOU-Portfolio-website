import { DEFAULT_PARAMS, type TraceryParams, type TraceryPreset } from "./tracery-types";

/**
 * 40 built-in presets, each a partial override merged onto DEFAULT_PARAMS.
 * Mirrors Tracery 2's "40 built-in presets" — a spread of looks across every
 * module (color vs. motion detection, box shape/fill, marker, grid/view,
 * connection style, and label type) rather than 40 trivial recolors.
 */
const overrides: { name: string; description: string; p: Partial<TraceryParams> }[] = [
  { name: "Surveillance Grid", description: "Classic security-cam readout.", p: { boxShape: "rectangle", boxFillMode: "none", markerType: "cross", lineStyle: "spline", labelType: "coordinates", showGrid: true, accentColor: [0.14, 0.95, 0.55] } },
  { name: "Cyber HUD", description: "Dense sci-fi interface overlay.", p: { boxShape: "square", boxFillMode: "diagonalHatch", markerType: "polygon", markerSides: 6, lineStyle: "pcbTraces", labelType: "matrix", accentColor: [0.1, 0.8, 1] } },
  { name: "PCB Tracer", description: "Circuit-board style node linking.", p: { boxShape: "rectangle", boxFillMode: "none", markerType: "dot", lineStyle: "pcbTraces", lineCornerPosition: 30, labelType: "nodeId", accentColor: [1, 0.7, 0.15] } },
  { name: "Glitch Scanner", description: "Unstable, degraded feed look.", p: { detectionMode: "motion", boxShape: "rectangle", boxFillMode: "glitch", markerType: "plus", lineStyle: "stepBend", labelType: "hex", accentColor: [1, 0.15, 0.4] } },
  { name: "X-ray Analysis", description: "Medical/industrial scan aesthetic.", p: { boxShape: "ellipse", boxFillMode: "xrayLut", markerType: "cross", lineStyle: "smoothBend", labelType: "dimensions", accentColor: [0.6, 0.9, 1] } },
  { name: "Duotone Recon", description: "High-contrast two-tone readout.", p: { boxShape: "rectangle", boxFillMode: "bwDuotone", markerType: "dot", lineStyle: "spline", labelType: "area", accentColor: [0.9, 1, 0.3] } },
  { name: "Random Patch Camo", description: "Evolving noise-patch fills.", p: { boxShape: "square", boxFillMode: "randomPatch", markerType: "none", lineStyle: "none", labelType: "percent", accentColor: [0.5, 1, 0.6] } },
  { name: "Minimal Wireframe", description: "Bare boxes, no fill or lines.", p: { boxShape: "rectangle", boxFillMode: "none", markerType: "none", lineStyle: "none", labelType: "none", showGrid: false } },
  { name: "Cartesian Analyst", description: "Center-origin coordinate readout.", p: { viewMode: "cartesian", valueMode: "pixels", labelType: "coordinates", markerType: "plus", lineStyle: "spline" } },
  { name: "Percentage Field", description: "Percent-based scale readout.", p: { viewMode: "cartesian", valueMode: "percent", labelType: "percent", markerType: "dot", boxShape: "circle" } },
  { name: "Motion Tracker Mk1", description: "Frame-difference motion rig.", p: { detectionMode: "motion", motionThreshold: 10, motionSensitivity: 65, markerType: "cross", lineStyle: "spline", labelType: "dimensions" } },
  { name: "Motion Tracker Mk2", description: "Tighter, faster motion response.", p: { detectionMode: "motion", motionThreshold: 6, motionSensitivity: 80, nodeCount: 6, markerType: "plus", lineStyle: "pcbTraces" } },
  { name: "Node Matrix", description: "Full data matrix readout per node.", p: { labelType: "matrix", boxShape: "square", markerType: "polygon", markerSides: 4, lineStyle: "pcbTraces" } },
  { name: "Hex Sampler", description: "Live hex color readout.", p: { labelType: "hex", boxShape: "circle", markerType: "dot", boxFillMode: "none", lineStyle: "none" } },
  { name: "Six-Node Web", description: "Dense multi-node connection web.", p: { nodeCount: 6, lineStyle: "spline", lineBendAmount: 55, markerType: "dot", labelType: "nodeId" } },
  { name: "Two-Node Link", description: "Simple point-to-point link.", p: { nodeCount: 2, lineStyle: "smoothBend", lineBendAmount: 40, markerType: "cross" } },
  { name: "Eight-Node Array", description: "Maximum node coverage across frame.", p: { nodeCount: 8, sampleGridX: 20, sampleGridY: 14, lineStyle: "pcbTraces", markerType: "plus" } },
  { name: "Round Radar", description: "Circular boxes, radar feel.", p: { boxShape: "circle", boxFillMode: "none", boxStrokeWidth: 3, markerType: "polygon", markerSides: 12, lineStyle: "spline" } },
  { name: "Rounded Panels", description: "Soft rounded-rect HUD panels.", p: { boxShape: "rectangle", boxCornerRadius: 24, boxFillMode: "bwDuotone", markerType: "none", lineStyle: "smoothBend" } },
  { name: "Sharp Tactical", description: "Hard-edged tactical readout.", p: { boxShape: "rectangle", boxCornerRadius: 0, boxStrokeWidth: 1.5, markerType: "cross", markerStretch: true, lineStyle: "stepBend" } },
  { name: "Spin Cycle", description: "Continuously rotating markers.", p: { markerType: "polygon", markerSides: 8, markerRotationSpeed: 90, boxFillMode: "none", lineStyle: "spline" } },
  { name: "Slow Orbit", description: "Gentle rotating polygon markers.", p: { markerType: "polygon", markerSides: 5, markerRotationSpeed: 20, markerFilled: true, boxShape: "circle" } },
  { name: "Filled Diamonds", description: "Filled 4-sided marker diamonds.", p: { markerType: "polygon", markerSides: 4, markerFilled: true, markerRotationSpeed: 45 } },
  { name: "Broadcast Overlay", description: "TV-broadcast tracking graphic.", p: { boxShape: "rectangle", boxFillMode: "none", markerType: "dot", lineStyle: "none", labelType: "coordinates", accentColor: [1, 1, 1] } },
  { name: "Night Vision", description: "Green monochrome night-vision feel.", p: { accentColor: [0.3, 1, 0.3], boxFillMode: "bwDuotone", markerType: "cross", labelType: "coordinates" } },
  { name: "Amber Terminal", description: "Retro amber terminal readout.", p: { accentColor: [1, 0.7, 0.1], labelType: "dimensions", boxFillMode: "none", markerType: "plus" } },
  { name: "Cold Blue Ops", description: "Cool blue tactical palette.", p: { accentColor: [0.3, 0.6, 1], boxShape: "square", markerType: "polygon", markerSides: 6, lineStyle: "pcbTraces" } },
  { name: "Alert Red", description: "High-alert red accent scheme.", p: { accentColor: [1, 0.2, 0.2], boxFillMode: "glitch", markerType: "cross", lineStyle: "stepBend" } },
  { name: "Ghost Outline", description: "Low-opacity ghost overlay.", p: { opacity: 55, boxFillMode: "none", markerType: "dot", lineStyle: "spline" } },
  { name: "High Density Grid", description: "Fine background reference grid.", p: { showGrid: true, gridDensity: 20, boxFillMode: "none", markerType: "none" } },
  { name: "No Grid Clean", description: "Overlay only, no background grid.", p: { showGrid: false, boxFillMode: "none", labelType: "coordinates" } },
  { name: "Wide Tolerance Key", description: "Loose color key for noisy footage.", p: { keyTolerance: 55, keyEdgeSoftness: 20, markerType: "plus" } },
  { name: "Precision Key", description: "Tight color key for clean plates.", p: { keyTolerance: 12, keyEdgeSoftness: 2, minRegionSize: 3, markerType: "dot" } },
  { name: "Large Format Labels", description: "Big, bold on-screen data text.", p: { labelFontSize: 26, labelType: "dimensions", labelFontFamily: "Arial" } },
  { name: "Fine Print Telemetry", description: "Small dense telemetry text.", p: { labelFontSize: 9, labelType: "matrix", labelFontFamily: "Courier New" } },
  { name: "OCR Readout", description: "OCR-style monospace data font.", p: { labelFontFamily: "OCRAStd", labelType: "hex", boxFillMode: "xrayLut" } },
  { name: "Thin Line Web", description: "Delicate thin connection lines.", p: { lineStrokeWidth: 0.5, lineStyle: "spline", lineBendAmount: 60, markerType: "dot" } },
  { name: "Bold Circuit", description: "Thick PCB-style bold traces.", p: { lineStrokeWidth: 4, lineStyle: "pcbTraces", boxShape: "square", markerType: "polygon", markerSides: 4 } },
  { name: "Full Signal Suite", description: "Every module engaged at once.", p: { boxFillMode: "diagonalHatch", markerType: "polygon", markerSides: 8, markerRotationSpeed: 15, lineStyle: "smoothBend", labelType: "matrix", showGrid: true, viewMode: "cartesian" } },
];

export const BUILTIN_PRESETS: TraceryPreset[] = overrides.map(({ name, description, p }) => ({
  name,
  description,
  params: { ...DEFAULT_PARAMS, ...p },
}));
