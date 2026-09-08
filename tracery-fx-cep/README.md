# Tracery FX (CEP)

A CEP panel for **After Effects** that recreates the workflow described for
aescripts.com's **Tracery 2** — turning detected color or motion regions into
customizable "FUI" (fictional/functional interface) overlay graphics — as a
free, source-available extension built on [bolt-cep](https://github.com/hyperbrew/bolt-cep).

## Please read this before comparing it to the real Tracery 2

Tracery 2 is a **native OFX/AEGP plugin** written in C++: it hooks directly
into each host's pixel pipeline, runs GPU-accelerated color/motion detection
across After Effects, Premiere Pro, Media Encoder, Nuke, Resolve, Fusion and
Vegas, and ships a hand-tuned rendering engine for every fill/marker/line
style.

A CEP extension **cannot** do any of that. CEP panels are just an HTML/JS
UI, glued to a host app via ExtendScript — there is no pixel shader, no GPU
compositing hook, and no way to reach any host besides Adobe's own CEP-aware
apps. So rather than fake a plugin that doesn't exist, this project
**recreates the described workflow honestly, on top of what CEP/ExtendScript
can actually do**:

- **Detection is a real, working technique** — not a mock. Each "node" is
  driven by an After Effects expression that scans a grid of points with
  `sampleImage()` across a vertical band of the frame, either measuring
  distance to a key color or frame-to-frame pixel difference for motion, and
  returns the bounding box of the hits. This is a well-known community
  technique for building trackers purely out of expressions; it runs inside
  native AE math, so it renders and exports like anything else in your comp.
- **Boxes, markers, the grid, connection lines, and labels are all real AE
  layers** — shape layers, a text layer, null objects holding "Expression
  Controls" — built and wired together by ExtendScript when you click
  **Build Rig**. There's no hidden video processing pass; you can open any
  layer this panel creates and see exactly how it works.
- **Box Fill Modes** (Diagonal Hatch, Invert, Random Patch, X-ray LUT, BW
  Duotone, Glitch) are approximated with **stock After Effects effects**
  (Invert, Black & White + Tint, Fractal Noise, Turbulent Displace +
  Posterize, etc.) applied to a masked duplicate of your footage — not a
  custom pixel shader. They look the part; they are not bit-for-bit what the
  paid plugin's native fill renderer produces.
- **Only After Effects is supported.** CEP does not exist in Nuke, Resolve,
  Fusion, or Vegas, and Premiere Pro has no comparable per-pixel expression
  engine to build a tracker on top of, so this panel is AEFT-only.
- **Fonts** come from a small curated list (Consolas, Courier New, Arial,
  Verdana, OCRAStd) rather than a live scan of installed system fonts, since
  that requires native OS APIs a CEP panel doesn't have access to.
- **Performance**: `sampleImage()` grid scans happen per node, per frame, in
  the expression engine. This is fine for review at a lower resolution/frame
  rate, but is not GPU-accelerated — lower the Sample Grid X/Y and Node
  Count while scrubbing, raise them before your final render, or precompose
  and render out the overlay once you're happy with it.

If you need the real, native, GPU-accelerated, multi-host plugin, buy
Tracery 2 from aescripts. This project exists to demonstrate the same
*creative idea* — signal-chain FUI overlays — as something you can install
for free, inspect, and modify, inside the very different constraints of a
CEP extension.

## Feature map

| Tracery 2 module | This panel |
| --- | --- |
| Keying / Detection (Key Color, Motion Detection) | **Detection** tab — color-distance or frame-difference expression scan, per-node tolerance/threshold/sensitivity, node count, min region size, sample grid resolution |
| Box (shape, fill mode) | **Box** tab — Rectangle/Square/Ellipse/Circle via a generated bezier path expression; 6 fill treatments via stock AE effects on a masked duplicate layer |
| Markers (Dot, Plus, Cross, Polygon) | **Markers** tab — shape + rotation-speed expression, edge-to-edge stretch for Plus/Cross, 3–12 sided polygons, filled/outline |
| Grid / View (Edge vs Cartesian, Pixels vs Percent) | **Grid / View** tab — static grid overlay + toggleable origin crosshair, label coordinate math switches with View/Value mode |
| Connection Lines (Spline, PCB Traces, Smooth Bend, Step Bend) | **Lines** tab — one path expression per style linking all currently-active nodes |
| Labels / Display (Coordinates, Dimensions, Area, Node/ID, Hex, Percent, Matrix) | **Labels** tab — dynamic Source Text expression per node |
| 40 built-in presets + preset manager | **Presets** tab — 40 bundled presets plus save/load/import/export as portable JSON, stored in `Documents/Tracery FX Presets` |

## Project structure

This follows the [bolt-cep](https://github.com/hyperbrew/bolt-cep) layout:

```
src/
  js/                 CEP panel (React + TypeScript + Sass)
    main/
      App.tsx          panel shell: source-layer picker, Build/Update/Remove Rig, tab nav, log
      tabs/            one component per module tab
      components/      shared form fields (slider, select, color, toggle)
    lib/               bolt-cep's CSInterface / evalTS / Node.js bridge (unmodified)
  jsx/                 ExtendScript, compiled into one file and loaded into After Effects
    aeft/
      aeft.ts               RPC surface called from the panel via evalTS()
      tracery-rig.ts        builds/updates/removes all rig layers via the AE scripting DOM
      tracery-expressions.ts  the AE-expression strings attached to each layer property
  shared/
    tracery-types.ts    the single TraceryParams model (used by the UI, the rig, and presets)
    builtin-presets.ts  the 40 bundled presets
```

## How the rig works, concretely

Clicking **Build Rig** with a footage/video layer selected creates, in the
active comp:

1. **`Tracery FX — Controller`** — a guide null holding every parameter as a
   real After Effects "Expression Control" (Slider, Checkbox, Color, Point,
   Angle, Dropdown, Layer). This is what every other generated layer's
   expressions read from, so nudging a slider in the panel and clicking
   **Update Rig** pushes new values straight onto this layer — no rebuild
   needed unless node count or fill mode changes the layer count.
2. **`Tracery FX — Node {i} Data`** (one per node) — a guide null whose
   Position/Size Point Controls run the `sampleImage()` grid-scan described
   above, scoped to the i-th vertical band of the frame.
3. **`Tracery FX — Box {i}`**, **`Marker {i}`**, **`Label {i}`**, and
   (if a fill mode is selected) **`Fill {i}`** — the visible per-node layers.
4. **`Tracery FX — Grid`** and **`Tracery FX — Connections`** — the single
   shared grid overlay and the multi-node connector line.

Every rig layer is prefixed `Tracery FX — `, so **Remove Rig** simply
deletes every layer with that prefix from the active comp.

## Development

```bash
yarn install
yarn dev          # start the panel dev server + watch the ExtendScript bundle
yarn symlink       # symlink dist/cep into your CEP extensions folder for live testing
```

Enable unsigned/debug CEP extensions first (PlayerDebugMode), per the
[bolt-cep docs](https://github.com/hyperbrew/bolt-cep#readme).

```bash
yarn build         # production build to dist/cep
yarn zxp           # signed .zxp installer (edit cep.config.ts -> zxp for your cert info)
yarn zip           # .zip for manual installation
```

## Known limitations (see the honesty section above for why)

- Detection is a 1-D band-scan, not true blob/contour segmentation — very
  irregular or overlapping regions can confuse node assignment.
- Grid line count and per-node layer count are structural (baked in at
  build time); changing Node Count or Box Fill Mode on **Update Rig**
  triggers a full rebuild rather than an in-place update.
- No GPU acceleration — see Performance above.
