import type { TraceryParams } from "../../shared/tracery-types";
import { getActiveComp } from "./aeft-utils";
import {
  buildRig,
  updateRig,
  removeRigFromActiveComp,
  hasRig,
} from "./tracery-rig";

export interface LayerInfo {
  index: number;
  name: string;
}

export interface ContextInfo {
  hasComp: boolean;
  compName: string;
  layers: LayerInfo[];
  selectedLayerIndex: number | null;
  rigExists: boolean;
}

/** Reports the current comp + layer list so the panel can offer a source-layer picker. */
export const getContextInfo = (): ContextInfo => {
  const comp = getActiveComp();
  if (!comp) {
    return {
      hasComp: false,
      compName: "",
      layers: [],
      selectedLayerIndex: null,
      rigExists: false,
    };
  }
  const layers: LayerInfo[] = [];
  for (let i = 1; i <= comp.numLayers; i++) {
    const l = comp.layer(i);
    if (l.name.indexOf("Tracery FX — ") !== 0) {
      layers.push({ index: i, name: l.name });
    }
  }
  const sel = comp.selectedLayers && comp.selectedLayers.length > 0
    ? comp.selectedLayers[0].index
    : null;
  return {
    hasComp: true,
    compName: comp.name,
    layers,
    selectedLayerIndex: sel,
    rigExists: hasRig(),
  };
};

export const buildTraceryRig = (
  params: TraceryParams,
  sourceLayerIndex: number
) => {
  return buildRig(params, sourceLayerIndex);
};

export const updateTraceryRig = (params: TraceryParams) => {
  return updateRig(params);
};

export const removeTraceryRig = () => {
  return removeRigFromActiveComp();
};

export const rigExists = () => hasRig();
