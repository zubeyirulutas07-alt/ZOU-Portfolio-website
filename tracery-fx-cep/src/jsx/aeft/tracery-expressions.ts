/**
 * String builders for the ExtendScript / AE-expression code that drives the
 * Tracery FX rig. Every function here returns plain text that gets assigned
 * to an AE property's `.expression`. The text is written in an ES3-safe
 * subset (var, plain for-loops, no arrow functions/template literals/array
 * methods added after ES5) so it evaluates identically whether a project has
 * the Legacy ExtendScript expression engine or the newer JavaScript engine
 * enabled — After Effects 2020 through 2026 both support this subset.
 *
 * Naming convention used throughout the rig:
 *  - Controller layer: "Tracery FX — Controller"
 *  - Per-node data null: "Tracery FX — Node {i} Data"  (Point Controls: Position, Size)
 *  - Per-node box:      "Tracery FX — Box {i}"
 *  - Per-node fill:     "Tracery FX — Fill {i}"
 *  - Per-node marker:   "Tracery FX — Marker {i}"
 *  - Per-node label:    "Tracery FX — Label {i}"
 *  - Grid overlay:      "Tracery FX — Grid"
 *  - Connections:       "Tracery FX — Connections"
 */

export const CONTROLLER_NAME = "Tracery FX — Controller";
export const nodeDataName = (i: number) => `Tracery FX — Node ${i} Data`;
export const boxName = (i: number) => `Tracery FX — Box ${i}`;
export const fillName = (i: number) => `Tracery FX — Fill ${i}`;
export const markerName = (i: number) => `Tracery FX — Marker ${i}`;
export const labelName = (i: number) => `Tracery FX — Label ${i}`;
export const GRID_NAME = "Tracery FX — Grid";
export const CONNECTIONS_NAME = "Tracery FX — Connections";
export const RIG_PREFIX = "Tracery FX — ";

const ctrlRef = `thisComp.layer("${CONTROLLER_NAME}")`;

/** Common header every rig expression starts with: a handle to the controller. */
const header = () => `var ctrl = ${ctrlRef};`;

/**
 * Grid-scan pseudo-tracker. Splits the comp into `Node Count` vertical bands
 * and, for the band belonging to `nodeIndex`, samples a grid of points with
 * sampleImage() to find either a target color (Key Color mode) or frame-to-
 * frame movement (Motion Detection mode). Returns the bounding box of hits.
 *
 * Used twice per node (once for the Position point, once for the Size point)
 * so both properties stay self-contained and independently re-orderable by AE.
 */
const scanBody = (nodeIndex: number) => `
var n = Math.max(1, Math.round(ctrl.effect("Node Count")("Slider")));
var src = ctrl.effect("Source")("Layer");
var W = thisComp.width, H = thisComp.height;
var bandW = W / n;
var nodeIndex = ${nodeIndex};
var x0 = nodeIndex * bandW;
var mode = ctrl.effect("Detection Mode")("Menu") - 1; // 0 color, 1 motion
var kc = ctrl.effect("Key Color")("Color");
var tol = ctrl.effect("Key Tolerance")("Slider") / 100;
var mThresh = ctrl.effect("Motion Threshold")("Slider") / 100;
var minCov = ctrl.effect("Min Region Size")("Slider") / 100;
var gx = Math.max(2, Math.round(ctrl.effect("Sample Grid X")("Slider")));
var gy = Math.max(2, Math.round(ctrl.effect("Sample Grid Y")("Slider")));

var hitCount = 0, sumX = 0, sumY = 0;
var minX = x0 + bandW, maxX = x0, minY = H, maxY = 0;
var total = gx * gy;

for (var iy = 0; iy < gy; iy++) {
  var py = (iy + 0.5) / gy * H;
  for (var ix = 0; ix < gx; ix++) {
    var px = x0 + (ix + 0.5) / gx * bandW;
    var isHit = false;
    if (src != null) {
      if (mode < 0.5) {
        var col = src.sampleImage([px, py], [0.5, 0.5], true, time);
        var dr = col[0] - kc[0], dg = col[1] - kc[1], db = col[2] - kc[2];
        isHit = Math.sqrt(dr * dr + dg * dg + db * db) < tol;
      } else {
        var prevT = Math.max(0, time - thisComp.frameDuration);
        var colA = src.sampleImage([px, py], [0.5, 0.5], true, time);
        var colB = src.sampleImage([px, py], [0.5, 0.5], true, prevT);
        var diff = Math.abs(colA[0] - colB[0]) + Math.abs(colA[1] - colB[1]) + Math.abs(colA[2] - colB[2]);
        isHit = diff > mThresh;
      }
    }
    if (isHit) {
      hitCount++;
      sumX += px; sumY += py;
      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
    }
  }
}
var coverage = hitCount / total;
`;

export const positionExpr = (nodeIndex: number) => `${header()}
${scanBody(nodeIndex)}
if (coverage < minCov) {
  [x0 + bandW / 2, H / 2];
} else {
  [(minX + maxX) / 2, (minY + maxY) / 2];
}`;

export const sizeExpr = (nodeIndex: number) => `${header()}
${scanBody(nodeIndex)}
if (coverage < minCov) {
  [0, 0];
} else {
  [Math.max(4, maxX - minX), Math.max(4, maxY - minY)];
}`;

/** Links a property directly to the node's Position or Size point control. */
export const linkToNode = (nodeIndex: number, which: "Position" | "Size") =>
  `thisComp.layer("${nodeDataName(nodeIndex)}").effect("${which}")("Point")`;

const nodeActive = (nodeIndex: number) =>
  `thisComp.layer("${nodeDataName(nodeIndex)}").effect("Size")("Point")[0] > 0.5`;

/** Bezier path (rect / rounded-rect / ellipse / circle) sized from a node's detected region. */
export const boxGeometryExpr = (nodeIndex: number) => `${header()}
var nd = thisComp.layer("${nodeDataName(nodeIndex)}");
var sz = nd.effect("Size")("Point");
var w = sz[0], h = sz[1];
var shapeType = ctrl.effect("Box Shape")("Menu") - 1; // 0 rect,1 square,2 ellipse,3 circle
if (shapeType === 1 || shapeType === 3) { var m = Math.max(w, h); w = m; h = m; }
var pad = 1 + ctrl.effect("Box Padding")("Slider") / 100;
w *= pad; h *= pad;
var hw = w / 2, hh = h / 2;
var pts, inT, outT;
if (shapeType === 2 || shapeType === 3) {
  var k = 0.5522847498;
  pts = [[0, -hh], [hw, 0], [0, hh], [-hw, 0]];
  inT = [[-hw * k, 0], [0, -hh * k], [hw * k, 0], [0, hh * k]];
  outT = [[hw * k, 0], [0, hh * k], [-hw * k, 0], [0, -hh * k]];
} else {
  var r = Math.min(ctrl.effect("Box Corner Radius")("Slider"), Math.min(hw, hh));
  if (r < 0.5) {
    pts = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]];
    inT = [[0, 0], [0, 0], [0, 0], [0, 0]];
    outT = [[0, 0], [0, 0], [0, 0], [0, 0]];
  } else {
    var k2 = 0.5522847498 * r;
    pts = [[-hw + r, -hh], [hw - r, -hh], [hw, -hh + r], [hw, hh - r], [hw - r, hh], [-hw + r, hh], [-hw, hh - r], [-hw, -hh + r]];
    inT = [[-k2, 0], [0, 0], [0, -k2], [0, 0], [k2, 0], [0, 0], [0, k2], [0, 0]];
    outT = [[0, 0], [k2, 0], [0, 0], [0, k2], [0, 0], [-k2, 0], [0, 0], [0, -k2]];
  }
}
createPath(pts, inT, outT, true);`;

export const boxOpacityExpr = (nodeIndex: number) => `${header()}
var active = ${nodeActive(nodeIndex)};
var masterOp = ctrl.effect("Master Opacity")("Slider");
active ? masterOp : 0;`;

export const boxRotationExpr = () => `${header()}
ctrl.effect("Box Rotation")("Angle");`;

export const strokeColorExpr = () => `${header()}
var c = ctrl.effect("Accent Color")("Color");
[c[0], c[1], c[2], 1];`;

export const strokeWidthExpr = () => `${header()}
ctrl.effect("Box Stroke Width")("Slider");`;

export const fillOpacityForBoxExpr = () => `${header()}
var mode = ctrl.effect("Box Fill Mode")("Menu") - 1; // 0 none
mode === 0 ? 14 : 0;`;

/** Mask path for the Fill{i} raster layer — mirrors boxGeometryExpr exactly. */
export const fillMaskExpr = (nodeIndex: number) => boxGeometryExpr(nodeIndex);

export const fillLayerOpacityExpr = (nodeIndex: number) => `${header()}
var active = ${nodeActive(nodeIndex)};
var mode = ctrl.effect("Box Fill Mode")("Menu") - 1;
(active && mode !== 0) ? ctrl.effect("Master Opacity")("Slider") : 0;`;

export const fillLayerPositionExpr = (nodeIndex: number) =>
  `${linkToNode(nodeIndex, "Position")}`;

// ---------------------------------------------------------------------------
// Markers
// ---------------------------------------------------------------------------

export const markerGeometryExpr = (nodeIndex: number) => `${header()}
var nd = thisComp.layer("${nodeDataName(nodeIndex)}");
var sz = nd.effect("Size")("Point");
var type = ctrl.effect("Marker Type")("Menu") - 1; // 0 none,1 dot,2 plus,3 cross,4 polygon
var size = ctrl.effect("Marker Size")("Slider");
var stretch = ctrl.effect("Marker Stretch")("Checkbox") === 1;
var armX = stretch ? Math.max(size, sz[0] / 2) : size;
var armY = stretch ? Math.max(size, sz[1] / 2) : size;
var thick = Math.max(1.5, size * 0.16);

function ellipsePts(rx, ry) {
  var k = 0.5522847498;
  return {
    p: [[0, -ry], [rx, 0], [0, ry], [-rx, 0]],
    i: [[-rx * k, 0], [0, -ry * k], [rx * k, 0], [0, ry * k]],
    o: [[rx * k, 0], [0, ry * k], [-rx * k, 0], [0, -ry * k]]
  };
}

var pts = [], inT = [], outT = [];
if (type === 1) {
  var e = ellipsePts(size / 2, size / 2);
  pts = e.p; inT = e.i; outT = e.o;
} else if (type === 2 || type === 3) {
  var ax = type === 3 ? armX * 0.70710678 : armX;
  var ay = type === 3 ? armY * 0.70710678 : armY;
  var t = thick / 2;
  pts = [
    [-ax, -t], [-t, -t], [-t, -ay], [t, -ay], [t, -t], [ax, -t],
    [ax, t], [t, t], [t, ay], [-t, ay], [-t, t], [-ax, t]
  ];
  for (var z = 0; z < pts.length; z++) { inT.push([0, 0]); outT.push([0, 0]); }
} else if (type === 4) {
  var sides = Math.max(3, Math.min(12, Math.round(ctrl.effect("Marker Sides")("Slider"))));
  var radius = size / 2;
  for (var s = 0; s < sides; s++) {
    var ang = (Math.PI * 2 * s) / sides - Math.PI / 2;
    pts.push([Math.cos(ang) * radius, Math.sin(ang) * radius]);
    inT.push([0, 0]);
    outT.push([0, 0]);
  }
}
createPath(pts, inT, outT, true);`;

export const markerRotationExpr = () => `${header()}
var speed = ctrl.effect("Marker Rotation Speed")("Slider");
(time * speed) % 360;`;

export const markerOpacityExpr = (nodeIndex: number) => `${header()}
var active = ${nodeActive(nodeIndex)};
var type = ctrl.effect("Marker Type")("Menu") - 1;
(active && type !== 0) ? ctrl.effect("Master Opacity")("Slider") : 0;`;

export const markerFillOrStrokeOpacityExpr = (which: "fill" | "stroke") => `${header()}
var filled = ctrl.effect("Marker Filled")("Checkbox") === 1;
${which === "fill" ? "filled ? 100 : 0" : "filled ? 0 : 100"};`;

// ---------------------------------------------------------------------------
// Grid / View overlay
// ---------------------------------------------------------------------------

export const gridOpacityExpr = () => `${header()}
var show = ctrl.effect("Show Grid")("Checkbox") === 1;
show ? ctrl.effect("Master Opacity")("Slider") * 0.35 : 0;`;

export const originCrossOpacityExpr = () => `${header()}
var show = ctrl.effect("Show Grid")("Checkbox") === 1;
var view = ctrl.effect("View Mode")("Menu") - 1; // 0 edge, 1 cartesian
(show && view === 1) ? ctrl.effect("Master Opacity")("Slider") : 0;`;

// ---------------------------------------------------------------------------
// Connection lines
// ---------------------------------------------------------------------------

export const connectionsPathExpr = () => `${header()}
var n = Math.max(1, Math.round(ctrl.effect("Node Count")("Slider")));
var style = ctrl.effect("Line Style")("Menu") - 1; // 0 none,1 spline,2 pcb,3 smoothBend,4 stepBend
var bendAmt = ctrl.effect("Line Bend Amount")("Slider") / 100;
var bendBal = ctrl.effect("Line Bend Balance")("Slider") / 100;
var cornerPos = ctrl.effect("Line Corner Position")("Slider") / 100;

var pts = [];
for (var i = 0; i < n; i++) {
  var nd = null;
  try { nd = thisComp.layer("Tracery FX — Node " + i + " Data"); } catch (e) {}
  if (nd) {
    var sz = nd.effect("Size")("Point");
    if (sz[0] > 0.5) pts.push(nd.effect("Position")("Point"));
  }
}

if (style === 0 || pts.length < 2) {
  createPath([], [], [], false);
} else if (style === 1) {
  var inT = [], outT = [];
  for (var j = 0; j < pts.length; j++) {
    var prev = pts[Math.max(0, j - 1)];
    var next = pts[Math.min(pts.length - 1, j + 1)];
    var tanX = (next[0] - prev[0]) * 0.2 * (0.2 + bendAmt);
    var tanY = (next[1] - prev[1]) * 0.2 * (0.2 + bendAmt);
    inT.push([-tanX, -tanY]);
    outT.push([tanX, tanY]);
  }
  createPath(pts, inT, outT, false);
} else if (style === 2) {
  var op = [pts[0]];
  for (var k = 1; k < pts.length; k++) {
    var a = pts[k - 1], b = pts[k];
    var midX = a[0] + (b[0] - a[0]) * cornerPos;
    op.push([midX, a[1]]);
    op.push([midX, b[1]]);
    op.push(b);
  }
  createPath(op, [], [], false);
} else if (style === 3) {
  var full = [pts[0]];
  var fullIn = [[0, 0]], fullOut = [[0, 0]];
  for (var p = 1; p < pts.length; p++) {
    var a2 = pts[p - 1], b2 = pts[p];
    var dx = b2[0] - a2[0], dy = b2[1] - a2[1];
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var nx = -dy / len, ny = dx / len;
    var t2 = 0.5 + bendBal * 0.5;
    var baseX = a2[0] + dx * t2, baseY = a2[1] + dy * t2;
    var offset = len * bendAmt * 0.5;
    full.push([baseX + nx * offset, baseY + ny * offset]);
    fullIn.push([0, 0]); fullOut.push([0, 0]);
    full.push(b2);
    fullIn.push([0, 0]); fullOut.push([0, 0]);
  }
  createPath(full, fullIn, fullOut, false);
} else {
  var sp = [pts[0]];
  for (var r = 1; r < pts.length; r++) {
    var a3 = pts[r - 1], b3 = pts[r];
    var cx = a3[0] + (b3[0] - a3[0]) * cornerPos;
    sp.push([cx, a3[1]]);
    sp.push([cx, b3[1]]);
    sp.push(b3);
  }
  createPath(sp, [], [], false);
}`;

export const connectionsOpacityExpr = () => `${header()}
ctrl.effect("Master Opacity")("Slider");`;

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

import { FONT_CHOICES } from "../../shared/tracery-types";
export { FONT_CHOICES };

export const labelSourceTextExpr = (nodeIndex: number) => `${header()}
var nd = thisComp.layer("${nodeDataName(nodeIndex)}");
var sz = nd.effect("Size")("Point");
var active = sz[0] > 0.5;
var txt = "";
if (active) {
  var pos = nd.effect("Position")("Point");
  var view = ctrl.effect("View Mode")("Menu") - 1;
  var valMode = ctrl.effect("Value Mode")("Menu") - 1;
  var W = thisComp.width, H = thisComp.height;
  var dispX = pos[0], dispY = pos[1];
  if (view === 1) { dispX = pos[0] - W / 2; dispY = H / 2 - pos[1]; }
  if (valMode === 1) { dispX = dispX / W * 100; dispY = dispY / H * 100; }
  var unit = valMode === 1 ? "%" : "px";

  function pad2(v) { var s = String(Math.round(v)); return s.length < 2 ? "0" + s : s; }
  function toHex(v) { var h = Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16); return h.length < 2 ? "0" + h : h; }

  var labelType = ctrl.effect("Label Type")("Menu") - 1; // 0 none,1 coords,2 dims,3 area,4 id,5 hex,6 percent,7 matrix
  if (labelType === 1) {
    txt = "X:" + Math.round(dispX) + unit + "  Y:" + Math.round(dispY) + unit;
  } else if (labelType === 2) {
    var dw = valMode === 1 ? sz[0] / W * 100 : sz[0];
    var dh = valMode === 1 ? sz[1] / H * 100 : sz[1];
    txt = "W:" + Math.round(dw) + unit + "  H:" + Math.round(dh) + unit;
  } else if (labelType === 3) {
    txt = "AREA " + Math.round(sz[0] * sz[1]) + "px2";
  } else if (labelType === 4) {
    txt = "NODE_" + pad2(${nodeIndex});
  } else if (labelType === 5) {
    var src = ctrl.effect("Source")("Layer");
    var col = src != null ? src.sampleImage(pos, [2, 2], true, time) : [0, 0, 0];
    txt = "#" + toHex(col[0]) + toHex(col[1]) + toHex(col[2]);
  } else if (labelType === 6) {
    txt = Math.round((sz[0] * sz[1]) / (W * H) * 100) + "%";
  } else if (labelType === 7) {
    var src2 = ctrl.effect("Source")("Layer");
    var rows = "";
    for (var yy = 0; yy < 3; yy++) {
      var row = "";
      for (var xx = 0; xx < 3; xx++) {
        var sx = pos[0] - sz[0] / 2 + (xx + 0.5) * sz[0] / 3;
        var sy = pos[1] - sz[1] / 2 + (yy + 0.5) * sz[1] / 3;
        var c = src2 != null ? src2.sampleImage([sx, sy], [0.5, 0.5], true, time) : [0, 0, 0];
        var lum = Math.round((c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11) * 9);
        row += lum;
        if (xx < 2) row += " ";
      }
      rows += row;
      if (yy < 2) rows += "\\n";
    }
    txt = rows;
  }
}

var td = thisLayer.text.sourceText.value;
td.text = txt;
td.fontSize = ctrl.effect("Label Font Size")("Slider");
var c2 = ctrl.effect("Accent Color")("Color");
td.fillColor = [c2[0], c2[1], c2[2]];
td.justification = ParagraphJustification.CENTER_JUSTIFY;
td;`;

export const labelOpacityExpr = (nodeIndex: number) => `${header()}
var active = ${nodeActive(nodeIndex)};
var labelType = ctrl.effect("Label Type")("Menu") - 1;
(active && labelType !== 0) ? ctrl.effect("Master Opacity")("Slider") : 0;`;

export const labelPositionExpr = (nodeIndex: number) => `${header()}
var nd = thisComp.layer("${nodeDataName(nodeIndex)}");
var pos = nd.effect("Position")("Point");
var sz = nd.effect("Size")("Point");
[pos[0], pos[1] + sz[1] / 2 + ctrl.effect("Label Font Size")("Slider") + 10];`;
