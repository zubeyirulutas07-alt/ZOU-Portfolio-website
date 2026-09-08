import React, { useCallback, useEffect, useRef, useState } from "react";
import { evalTS } from "../lib/utils/bolt";
import { DEFAULT_PARAMS, type TraceryParams } from "../../shared/tracery-types";
import type { Scripts } from "@esTypes/index";
import { DetectionTab } from "./tabs/DetectionTab";
import { BoxTab } from "./tabs/BoxTab";
import { MarkersTab } from "./tabs/MarkersTab";
import { GridTab } from "./tabs/GridTab";
import { LinesTab } from "./tabs/LinesTab";
import { LabelsTab } from "./tabs/LabelsTab";
import { PresetsTab } from "./tabs/PresetsTab";
import "./main.scss";

const TABS = [
  "Detection",
  "Box",
  "Markers",
  "Grid / View",
  "Lines",
  "Labels",
  "Presets",
] as const;
type Tab = (typeof TABS)[number];
type ContextInfo = Awaited<ReturnType<Scripts["getContextInfo"]>>;

export const App = () => {
  const [params, setParams] = useState<TraceryParams>(DEFAULT_PARAMS);
  const [tab, setTab] = useState<Tab>("Detection");
  const [context, setContext] = useState<ContextInfo | null>(null);
  const [sourceIndex, setSourceIndex] = useState<number | null>(null);
  const [log, setLogLines] = useState<string[]>(["Tracery FX ready."]);
  const [busy, setBusy] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  const appendLog = useCallback((msg: string) => {
    setLogLines((lines) => [...lines.slice(-49), msg]);
  }, []);

  const refreshContext = useCallback(() => {
    evalTS("getContextInfo").then((ctx) => {
      setContext(ctx);
      if (ctx.selectedLayerIndex != null && sourceIndex == null) {
        setSourceIndex(ctx.selectedLayerIndex);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    refreshContext();
    const interval = setInterval(refreshContext, 2500);
    return () => clearInterval(interval);
  }, [refreshContext]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  const set = <K extends keyof TraceryParams>(key: K, value: TraceryParams[K]) => {
    setParams((p) => ({ ...p, [key]: value }));
  };

  const buildRig = async () => {
    if (sourceIndex == null) {
      appendLog("Select a source footage/video layer first.");
      return;
    }
    setBusy(true);
    try {
      const res = await evalTS("buildTraceryRig", params, sourceIndex);
      appendLog(`Rig built (${res.layersCreated} layers in comp).`);
    } catch (e: any) {
      appendLog(`Build failed: ${e?.message ?? JSON.stringify(e)}`);
    } finally {
      setBusy(false);
      refreshContext();
    }
  };

  const updateRig = async () => {
    setBusy(true);
    try {
      const res = await evalTS("updateTraceryRig", params);
      if ((res as any)?.reason === "no-rig") {
        appendLog('No rig found in this comp yet — click "Build Rig" first.');
      } else {
        appendLog("Rig updated.");
      }
    } catch (e: any) {
      appendLog(`Update failed: ${e?.message ?? JSON.stringify(e)}`);
    } finally {
      setBusy(false);
      refreshContext();
    }
  };

  const removeRig = async () => {
    setBusy(true);
    try {
      await evalTS("removeTraceryRig");
      appendLog("Rig removed.");
    } catch (e: any) {
      appendLog(`Remove failed: ${e?.message ?? JSON.stringify(e)}`);
    } finally {
      setBusy(false);
      refreshContext();
    }
  };

  const applyPreset = (p: TraceryParams) => {
    setParams(p);
    if (context?.rigExists) {
      evalTS("updateTraceryRig", p)
        .then(() => appendLog("Preset applied to existing rig."))
        .catch((e) => appendLog(`Preset apply failed: ${e?.message ?? e}`));
    } else {
      appendLog("Preset loaded — click Build Rig to apply it to your comp.");
    }
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          TRACERY <span className="accent">FX</span>
        </div>
        <div className="comp-name">{context?.hasComp ? context.compName : "No active composition"}</div>
      </header>

      <div className="source-row">
        <label>Source Layer</label>
        <select
          value={sourceIndex ?? ""}
          onChange={(e) => setSourceIndex(e.target.value ? parseInt(e.target.value, 10) : null)}
          disabled={!context?.hasComp}
        >
          <option value="">— select —</option>
          {context?.layers.map((l) => (
            <option key={l.index} value={l.index}>
              {l.index}. {l.name}
            </option>
          ))}
        </select>
      </div>

      <div className="action-row">
        <button className="primary" disabled={busy || !context?.hasComp} onClick={buildRig}>
          Build Rig
        </button>
        <button disabled={busy || !context?.rigExists} onClick={updateRig}>
          Update Rig
        </button>
        <button disabled={busy || !context?.rigExists} className="danger" onClick={removeRig}>
          Remove Rig
        </button>
      </div>

      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </nav>

      <div className="tab-content">
        {tab === "Detection" && <DetectionTab params={params} set={set} />}
        {tab === "Box" && <BoxTab params={params} set={set} />}
        {tab === "Markers" && <MarkersTab params={params} set={set} />}
        {tab === "Grid / View" && <GridTab params={params} set={set} />}
        {tab === "Lines" && <LinesTab params={params} set={set} />}
        {tab === "Labels" && <LabelsTab params={params} set={set} />}
        {tab === "Presets" && <PresetsTab params={params} onApply={applyPreset} log={appendLog} />}
      </div>

      <div className="log">
        {log.map((line, i) => (
          <div className="log-line" key={i}>
            {line}
          </div>
        ))}
        <div ref={logEndRef} />
      </div>
    </div>
  );
};
