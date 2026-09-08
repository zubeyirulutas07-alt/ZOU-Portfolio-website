import { forEachLayer, getActiveComp } from "./aeft-utils";
import type { TraceryParams } from "../../shared/tracery-types";
import {
  BOX_FILL_MODES,
  BOX_SHAPES,
  DETECTION_MODES,
  LABEL_TYPES,
  LINE_STYLES,
  MARKER_TYPES,
  VALUE_MODES,
  VIEW_MODES,
  enumIndex,
} from "../../shared/tracery-types";
import {
  CONNECTIONS_NAME,
  CONTROLLER_NAME,
  FONT_CHOICES,
  GRID_NAME,
  RIG_PREFIX,
  boxGeometryExpr,
  boxOpacityExpr,
  boxRotationExpr,
  connectionsOpacityExpr,
  connectionsPathExpr,
  fillLayerOpacityExpr,
  fillLayerPositionExpr,
  fillMaskExpr,
  fillOpacityForBoxExpr,
  fillName,
  gridOpacityExpr,
  labelName,
  labelOpacityExpr,
  labelPositionExpr,
  labelSourceTextExpr,
  linkToNode,
  markerFillOrStrokeOpacityExpr,
  markerGeometryExpr,
  markerName,
  markerOpacityExpr,
  markerRotationExpr,
  nodeDataName,
  originCrossOpacityExpr,
  positionExpr,
  sizeExpr,
  strokeColorExpr,
  strokeWidthExpr,
  boxName,
} from "./tracery-expressions";

// ---------------------------------------------------------------------------
// Low level AE scripting helpers
// ---------------------------------------------------------------------------

const effectsOf = (layer: Layer): PropertyGroup =>
  layer.property("ADBE Effect Parade") as PropertyGroup;

const addSlider = (
  fx: PropertyGroup,
  name: string,
  value: number
): PropertyGroup => {
  const p = fx.addProperty("ADBE Slider Control") as PropertyGroup;
  p.name = name;
  (p.property(1) as OneDProperty).setValue(value);
  return p;
};

const addCheckbox = (
  fx: PropertyGroup,
  name: string,
  value: boolean
): PropertyGroup => {
  const p = fx.addProperty("ADBE Checkbox Control") as PropertyGroup;
  p.name = name;
  (p.property(1) as OneDProperty).setValue(value ? 1 : 0);
  return p;
};

const addColor = (
  fx: PropertyGroup,
  name: string,
  rgb: [number, number, number]
): PropertyGroup => {
  const p = fx.addProperty("ADBE Color Control") as PropertyGroup;
  p.name = name;
  (p.property(1) as any).setValue([rgb[0], rgb[1], rgb[2], 1]);
  return p;
};

const addPoint = (
  fx: PropertyGroup,
  name: string,
  xy: [number, number]
): PropertyGroup => {
  const p = fx.addProperty("ADBE Point Control") as PropertyGroup;
  p.name = name;
  (p.property(1) as any).setValue(xy);
  return p;
};

const addAngle = (fx: PropertyGroup, name: string, value: number): PropertyGroup => {
  const p = fx.addProperty("ADBE Angle Control") as PropertyGroup;
  p.name = name;
  (p.property(1) as OneDProperty).setValue(value);
  return p;
};

const addLayerControl = (
  fx: PropertyGroup,
  name: string,
  layer: Layer | null
): PropertyGroup => {
  const p = fx.addProperty("ADBE Layer Control") as PropertyGroup;
  p.name = name;
  if (layer) (p.property(1) as any).setValue(layer.index);
  return p;
};

const addDropdown = (
  fx: PropertyGroup,
  name: string,
  items: readonly string[],
  selectedIndex: number
): PropertyGroup => {
  const p = fx.addProperty("ADBE Dropdown Control") as PropertyGroup;
  p.name = name;
  const menuProp = p.property(1) as any;
  // Dropdown Menu Control items are set via setPropertyParameters([...items])
  menuProp.setPropertyParameters(items.slice());
  menuProp.setValue(selectedIndex + 1); // 1-based
  return p;
};

const removeLayerNamed = (comp: CompItem, name: string) => {
  for (let i = comp.numLayers; i >= 1; i--) {
    const l = comp.layer(i);
    if (l.name === name) l.remove();
  }
};

/** Removes every layer this extension previously generated. */
export const removeRig = (comp: CompItem) => {
  for (let i = comp.numLayers; i >= 1; i--) {
    const l = comp.layer(i);
    if (l.name && l.name.indexOf(RIG_PREFIX) === 0) l.remove();
  }
};

const findLayer = (comp: CompItem, name: string): Layer | null => {
  for (let i = 1; i <= comp.numLayers; i++) {
    if (comp.layer(i).name === name) return comp.layer(i);
  }
  return null;
};

const addPathGroup = (
  shapeLayer: ShapeLayer
): { path: Property; fill: PropertyGroup; stroke: PropertyGroup } => {
  const root = shapeLayer.property("ADBE Root Vectors Group") as PropertyGroup;
  const group = root.addProperty("ADBE Vector Group") as PropertyGroup;
  const contents = group.property("ADBE Vectors Group") as PropertyGroup;
  const pathItem = contents.addProperty(
    "ADBE Vector Shape - Group"
  ) as PropertyGroup;
  const fill = contents.addProperty(
    "ADBE Vector Graphic - Fill"
  ) as PropertyGroup;
  const stroke = contents.addProperty(
    "ADBE Vector Graphic - Stroke"
  ) as PropertyGroup;
  const path = pathItem.property("ADBE Vector Shape") as Property;
  return { path, fill, stroke };
};

const newShapeLayer = (comp: CompItem, name: string): ShapeLayer => {
  const layer = comp.layers.addShape();
  layer.name = name;
  return layer;
};

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

const buildController = (
  comp: CompItem,
  params: TraceryParams,
  sourceLayer: Layer
): AVLayer => {
  removeLayerNamed(comp, CONTROLLER_NAME);
  const ctrl = comp.layers.addNull() as AVLayer;
  ctrl.name = CONTROLLER_NAME;
  ctrl.guideLayer = true;
  const fx = effectsOf(ctrl);

  addLayerControl(fx, "Source", sourceLayer);
  addDropdown(
    fx,
    "Detection Mode",
    DETECTION_MODES,
    enumIndex(DETECTION_MODES, params.detectionMode)
  );
  addColor(fx, "Key Color", params.keyColor);
  addSlider(fx, "Key Tolerance", params.keyTolerance);
  addSlider(fx, "Key Edge Softness", params.keyEdgeSoftness);
  addSlider(fx, "Motion Threshold", params.motionThreshold);
  addSlider(fx, "Motion Sensitivity", params.motionSensitivity);
  addSlider(fx, "Node Count", params.nodeCount);
  addSlider(fx, "Min Region Size", params.minRegionSize);
  addSlider(fx, "Sample Grid X", params.sampleGridX);
  addSlider(fx, "Sample Grid Y", params.sampleGridY);

  addDropdown(fx, "Box Shape", BOX_SHAPES, enumIndex(BOX_SHAPES, params.boxShape));
  addDropdown(
    fx,
    "Box Fill Mode",
    BOX_FILL_MODES,
    enumIndex(BOX_FILL_MODES, params.boxFillMode)
  );
  addSlider(fx, "Box Padding", params.boxPadding);
  addSlider(fx, "Box Stroke Width", params.boxStrokeWidth);
  addSlider(fx, "Box Corner Radius", params.boxCornerRadius);
  addAngle(fx, "Box Rotation", params.boxRotation);

  addDropdown(
    fx,
    "Marker Type",
    MARKER_TYPES,
    enumIndex(MARKER_TYPES, params.markerType)
  );
  addSlider(fx, "Marker Size", params.markerSize);
  addSlider(fx, "Marker Sides", params.markerSides);
  addCheckbox(fx, "Marker Filled", params.markerFilled);
  addCheckbox(fx, "Marker Stretch", params.markerStretch);
  addSlider(fx, "Marker Rotation Speed", params.markerRotationSpeed);

  addCheckbox(fx, "Show Grid", params.showGrid);
  addSlider(fx, "Grid Density", params.gridDensity);
  addDropdown(fx, "View Mode", VIEW_MODES, enumIndex(VIEW_MODES, params.viewMode));
  addDropdown(
    fx,
    "Value Mode",
    VALUE_MODES,
    enumIndex(VALUE_MODES, params.valueMode)
  );

  addDropdown(fx, "Line Style", LINE_STYLES, enumIndex(LINE_STYLES, params.lineStyle));
  addSlider(fx, "Line Bend Amount", params.lineBendAmount);
  addSlider(fx, "Line Bend Balance", params.lineBendBalance);
  addSlider(fx, "Line Corner Position", params.lineCornerPosition);
  addSlider(fx, "Line Stroke Width", params.lineStrokeWidth);

  addDropdown(
    fx,
    "Label Type",
    LABEL_TYPES,
    enumIndex(LABEL_TYPES, params.labelType)
  );
  addSlider(fx, "Label Font Size", params.labelFontSize);
  addDropdown(
    fx,
    "Label Font",
    FONT_CHOICES,
    Math.max(0, enumIndex(FONT_CHOICES, params.labelFontFamily))
  );

  addColor(fx, "Accent Color", params.accentColor);
  addSlider(fx, "Master Opacity", params.opacity);

  return ctrl;
};

/** Re-applies param values onto an existing controller's effects without rebuilding the rig. */
const updateController = (comp: CompItem, params: TraceryParams) => {
  const ctrl = findLayer(comp, CONTROLLER_NAME);
  if (!ctrl) return false;
  const fx = effectsOf(ctrl);
  const set1D = (name: string, value: number) =>
    ((fx.property(name) as PropertyGroup).property(1) as OneDProperty).setValue(
      value
    );
  const setMenu = (name: string, list: readonly string[], value: string) =>
    ((fx.property(name) as PropertyGroup).property(1) as any).setValue(
      Math.max(0, enumIndex(list, value)) + 1
    );
  const setColor = (name: string, rgb: [number, number, number]) =>
    ((fx.property(name) as PropertyGroup).property(1) as any).setValue([
      rgb[0],
      rgb[1],
      rgb[2],
      1,
    ]);

  setMenu("Detection Mode", DETECTION_MODES, params.detectionMode);
  setColor("Key Color", params.keyColor);
  set1D("Key Tolerance", params.keyTolerance);
  set1D("Key Edge Softness", params.keyEdgeSoftness);
  set1D("Motion Threshold", params.motionThreshold);
  set1D("Motion Sensitivity", params.motionSensitivity);
  set1D("Min Region Size", params.minRegionSize);
  set1D("Sample Grid X", params.sampleGridX);
  set1D("Sample Grid Y", params.sampleGridY);

  setMenu("Box Shape", BOX_SHAPES, params.boxShape);
  setMenu("Box Fill Mode", BOX_FILL_MODES, params.boxFillMode);
  set1D("Box Padding", params.boxPadding);
  set1D("Box Stroke Width", params.boxStrokeWidth);
  set1D("Box Corner Radius", params.boxCornerRadius);
  set1D("Box Rotation", params.boxRotation);

  setMenu("Marker Type", MARKER_TYPES, params.markerType);
  set1D("Marker Size", params.markerSize);
  set1D("Marker Sides", params.markerSides);
  set1D("Marker Filled", params.markerFilled ? 1 : 0);
  set1D("Marker Stretch", params.markerStretch ? 1 : 0);
  set1D("Marker Rotation Speed", params.markerRotationSpeed);

  set1D("Show Grid", params.showGrid ? 1 : 0);
  set1D("Grid Density", params.gridDensity);
  setMenu("View Mode", VIEW_MODES, params.viewMode);
  setMenu("Value Mode", VALUE_MODES, params.valueMode);

  setMenu("Line Style", LINE_STYLES, params.lineStyle);
  set1D("Line Bend Amount", params.lineBendAmount);
  set1D("Line Bend Balance", params.lineBendBalance);
  set1D("Line Corner Position", params.lineCornerPosition);
  set1D("Line Stroke Width", params.lineStrokeWidth);

  setMenu("Label Type", LABEL_TYPES, params.labelType);
  set1D("Label Font Size", params.labelFontSize);
  setMenu("Label Font", FONT_CHOICES, params.labelFontFamily);

  setColor("Accent Color", params.accentColor);
  set1D("Master Opacity", params.opacity);
  return true;
};

// ---------------------------------------------------------------------------
// Per-node layers
// ---------------------------------------------------------------------------

const buildNodeData = (comp: CompItem, i: number) => {
  const n = comp.layers.addNull() as AVLayer;
  n.name = nodeDataName(i);
  n.guideLayer = true;
  const fx = effectsOf(n);
  const pos = addPoint(fx, "Position", [comp.width / 2, comp.height / 2]);
  const size = addPoint(fx, "Size", [0, 0]);
  (pos.property(1) as any).expression = positionExpr(i);
  (size.property(1) as any).expression = sizeExpr(i);
  return n;
};

const buildBox = (comp: CompItem, i: number) => {
  const layer = newShapeLayer(comp, boxName(i));
  const { path, fill, stroke } = addPathGroup(layer);
  path.expression = boxGeometryExpr(i);
  (fill.property("Color") as any).expression = strokeColorExpr();
  (fill.property("Opacity") as OneDProperty).expression = fillOpacityForBoxExpr();
  (stroke.property("Color") as any).expression = strokeColorExpr();
  (stroke.property("Stroke Width") as OneDProperty).expression = strokeWidthExpr();
  layer.transform.position.expression = linkToNode(i, "Position");
  layer.transform.rotation.expression = boxRotationExpr();
  layer.transform.opacity.expression = boxOpacityExpr(i);
  return layer;
};

const buildFill = (comp: CompItem, i: number, sourceLayer: Layer) => {
  const layer = sourceLayer.duplicate() as AVLayer;
  layer.name = fillName(i);
  layer.moveToBeginning();
  layer.guideLayer = false;
  layer.shy = false;
  const mask = layer.property("ADBE Mask Parade") as PropertyGroup;
  const m = mask.addProperty("ADBE Mask Atom") as PropertyGroup;
  (m.property("ADBE Mask Shape") as any).expression = fillMaskExpr(i);
  (m.property("ADBE Mask Feather") as any).setValue([4, 4]);
  layer.transform.position.expression = fillLayerPositionExpr(i);
  layer.transform.opacity.expression = fillLayerOpacityExpr(i);
  return layer;
};

/** Adds the stock-AE effect chain that approximates each Box Fill Mode. */
const applyFillModeEffects = (
  layer: AVLayer,
  mode: TraceryParams["boxFillMode"]
) => {
  const fx = effectsOf(layer);
  switch (mode) {
    case "invert":
      fx.addProperty("ADBE Invert");
      break;
    case "bwDuotone": {
      const bw = fx.addProperty("ADBE Black&White") as PropertyGroup;
      bw.name = "B&W";
      const tint = fx.addProperty("ADBE Tint") as PropertyGroup;
      tint.name = "Duotone";
      (tint.property("Map Black To") as any).setValue([0.02, 0.05, 0.03, 1]);
      (tint.property("Map White To") as any).setValue([0.14, 0.95, 0.55, 1]);
      break;
    }
    case "xrayLut": {
      fx.addProperty("ADBE Invert");
      const hue = fx.addProperty("ADBE HUE SATURATION") as PropertyGroup;
      hue.name = "X-ray Tint";
      break;
    }
    case "randomPatch": {
      const noise = fx.addProperty("ADBE Fractal Noise") as PropertyGroup;
      (noise.property("Contrast") as OneDProperty).setValue(180);
      (noise.property("Evolution") as any).expression = "time * 200;";
      const levels = fx.addProperty("ADBE Easy Levels2") as PropertyGroup;
      levels.name = "Threshold";
      break;
    }
    case "glitch": {
      const displace = fx.addProperty(
        "ADBE Turbulent Displace"
      ) as PropertyGroup;
      (displace.property("Amount") as OneDProperty).setValue(18);
      (displace.property("Evolution") as any).expression = "time * 900;";
      const posterize = fx.addProperty("ADBE Posterize") as PropertyGroup;
      (posterize.property("Level") as OneDProperty).setValue(6);
      break;
    }
    case "diagonalHatch": {
      // Approximate diagonal hatch with a rotated, tiled fractal noise threshold
      const noise = fx.addProperty("ADBE Fractal Noise") as PropertyGroup;
      (noise.property("Fractal Type") as any).setValue(2);
      (noise.property("Noise Type") as any).setValue(1);
      (noise.property("Transform") as PropertyGroup) &&
        ((
          (noise.property("Transform") as PropertyGroup).property(
            "Rotation"
          ) as OneDProperty
        ).setValue(45));
      const levels = fx.addProperty("ADBE Easy Levels2") as PropertyGroup;
      levels.name = "Hatch Threshold";
      break;
    }
    case "none":
    default:
      break;
  }
};

const buildMarker = (comp: CompItem, i: number) => {
  const layer = newShapeLayer(comp, markerName(i));
  const { path, fill, stroke } = addPathGroup(layer);
  path.expression = markerGeometryExpr(i);
  (fill.property("Color") as any).expression = strokeColorExpr();
  (fill.property("Opacity") as OneDProperty).expression =
    markerFillOrStrokeOpacityExpr("fill");
  (stroke.property("Color") as any).expression = strokeColorExpr();
  (stroke.property("Opacity") as OneDProperty).expression =
    markerFillOrStrokeOpacityExpr("stroke");
  (stroke.property("Stroke Width") as OneDProperty).setValue(2);
  layer.transform.position.expression = linkToNode(i, "Position");
  layer.transform.rotation.expression = markerRotationExpr();
  layer.transform.opacity.expression = markerOpacityExpr(i);
  return layer;
};

const buildLabel = (comp: CompItem, i: number) => {
  const layer = comp.layers.addText("");
  layer.name = labelName(i);
  const textProp = layer.property("ADBE Text Properties") as PropertyGroup;
  const sourceText = textProp.property("ADBE Text Document") as any;
  sourceText.expression = labelSourceTextExpr(i);
  layer.transform.position.expression = labelPositionExpr(i);
  layer.transform.opacity.expression = labelOpacityExpr(i);
  return layer;
};

// ---------------------------------------------------------------------------
// Grid + Connections (single instance, not per-node)
// ---------------------------------------------------------------------------

const buildGrid = (comp: CompItem, params: TraceryParams) => {
  const layer = newShapeLayer(comp, GRID_NAME);
  const root = layer.property("ADBE Root Vectors Group") as PropertyGroup;
  const group = root.addProperty("ADBE Vector Group") as PropertyGroup;
  const contents = group.property("ADBE Vectors Group") as PropertyGroup;

  const divisions = Math.max(2, Math.round(params.gridDensity));
  const w = comp.width;
  const h = comp.height;

  for (let i = 1; i < divisions; i++) {
    const x = (w / divisions) * i;
    addStaticLine(contents, [x, 0], [x, h]);
  }
  for (let i = 1; i < divisions; i++) {
    const y = (h / divisions) * i;
    addStaticLine(contents, [0, y], [w, y]);
  }

  const stroke = contents.addProperty(
    "ADBE Vector Graphic - Stroke"
  ) as PropertyGroup;
  (stroke.property("Stroke Width") as OneDProperty).setValue(1);
  (stroke.property("Color") as any).expression = strokeColorExpr();

  layer.transform.opacity.expression = gridOpacityExpr();

  // Cartesian-mode origin crosshair, as a second group so it can fade independently
  const originGroup = root.addProperty("ADBE Vector Group") as PropertyGroup;
  const originContents = originGroup.property(
    "ADBE Vectors Group"
  ) as PropertyGroup;
  addStaticLine(originContents, [w / 2 - 14, h / 2], [w / 2 + 14, h / 2]);
  addStaticLine(originContents, [w / 2, h / 2 - 14], [w / 2, h / 2 + 14]);
  const originStroke = originContents.addProperty(
    "ADBE Vector Graphic - Stroke"
  ) as PropertyGroup;
  (originStroke.property("Stroke Width") as OneDProperty).setValue(2);
  (originStroke.property("Color") as any).expression = strokeColorExpr();
  const originTransform = originGroup.property(
    "ADBE Vector Transform Group"
  ) as PropertyGroup;
  (originTransform.property("Opacity") as OneDProperty).expression =
    originCrossOpacityExpr();

  layer.moveToBeginning();
  return layer;
};

const addStaticLine = (
  contents: PropertyGroup,
  a: [number, number],
  b: [number, number]
) => {
  const pathItem = contents.addProperty(
    "ADBE Vector Shape - Group"
  ) as PropertyGroup;
  const shapeProp = pathItem.property("ADBE Vector Shape") as any;
  const shape = new Shape();
  shape.vertices = [a, b];
  shape.inTangents = [
    [0, 0],
    [0, 0],
  ];
  shape.outTangents = [
    [0, 0],
    [0, 0],
  ];
  shape.closed = false;
  shapeProp.setValue(shape);
};

const buildConnections = (comp: CompItem) => {
  const layer = newShapeLayer(comp, CONNECTIONS_NAME);
  const { path, stroke, fill } = addPathGroup(layer);
  (fill.property("Opacity") as OneDProperty).setValue(0);
  path.expression = connectionsPathExpr();
  (stroke.property("Color") as any).expression = strokeColorExpr();
  (stroke.property("Stroke Width") as any).expression = `thisComp.layer("${CONTROLLER_NAME}").effect("Line Stroke Width")("Slider");`;
  layer.transform.opacity.expression = connectionsOpacityExpr();
  return layer;
};

// ---------------------------------------------------------------------------
// Public entry points
// ---------------------------------------------------------------------------

export const buildRig = (params: TraceryParams, sourceLayerIndex: number) => {
  const comp = getActiveComp();
  if (!comp) throw new Error("No active composition.");
  const sourceLayer = comp.layer(sourceLayerIndex);
  if (!sourceLayer) throw new Error("Select a source layer first.");

  app.beginUndoGroup("Build Tracery FX Rig");
  try {
    removeRig(comp);

    const ctrl = buildController(comp, params, sourceLayer);
    const n = Math.max(1, Math.min(8, Math.round(params.nodeCount)));

    for (let i = 0; i < n; i++) buildNodeData(comp, i);
    buildGrid(comp, params);
    buildConnections(comp);
    for (let i = 0; i < n; i++) {
      buildBox(comp, i);
      if (params.boxFillMode !== "none") {
        const fillLayer = buildFill(comp, i, sourceLayer) as unknown as AVLayer;
        applyFillModeEffects(fillLayer, params.boxFillMode);
      }
      buildMarker(comp, i);
      buildLabel(comp, i);
    }

    ctrl.moveToBeginning();
    return { ok: true, layersCreated: comp.numLayers };
  } finally {
    app.endUndoGroup();
  }
};

export const updateRig = (params: TraceryParams) => {
  const comp = getActiveComp();
  if (!comp) throw new Error("No active composition.");
  const ctrl = findLayer(comp, CONTROLLER_NAME);
  if (!ctrl) return { ok: false, reason: "no-rig" };

  const existingNodeCount = countNodeLayers(comp);
  const structuralChange =
    Math.round(params.nodeCount) !== existingNodeCount ||
    fillLayerCountMismatch(comp, params);

  app.beginUndoGroup("Update Tracery FX Rig");
  try {
    if (structuralChange) {
      const sourceIdx = (
        (effectsOf(ctrl).property("Source") as PropertyGroup).property(
          1
        ) as any
      ).value as number;
      return buildRig(params, sourceIdx);
    }
    updateController(comp, params);
    // Grid geometry (division count) is baked at build time — rebuild only that layer if it changed.
    return { ok: true, layersCreated: comp.numLayers };
  } finally {
    app.endUndoGroup();
  }
};

const countNodeLayers = (comp: CompItem): number => {
  let count = 0;
  for (let i = 1; i <= comp.numLayers; i++) {
    const name = comp.layer(i).name;
    if (name && name.indexOf("Tracery FX — Node ") === 0 && name.indexOf("Data") > 0)
      count++;
  }
  return count;
};

const fillLayerCountMismatch = (
  comp: CompItem,
  params: TraceryParams
): boolean => {
  let fillCount = 0;
  for (let i = 1; i <= comp.numLayers; i++) {
    const name = comp.layer(i).name;
    if (name && name.indexOf("Tracery FX — Fill ") === 0) fillCount++;
  }
  const wantsFill = params.boxFillMode !== "none";
  const n = Math.round(params.nodeCount);
  return wantsFill ? fillCount !== n : fillCount !== 0;
};

export const hasRig = (): boolean => {
  const comp = getActiveComp();
  if (!comp) return false;
  return findLayer(comp, CONTROLLER_NAME) !== null;
};

export const removeRigFromActiveComp = () => {
  const comp = getActiveComp();
  if (!comp) throw new Error("No active composition.");
  app.beginUndoGroup("Remove Tracery FX Rig");
  try {
    removeRig(comp);
    return { ok: true };
  } finally {
    app.endUndoGroup();
  }
};
