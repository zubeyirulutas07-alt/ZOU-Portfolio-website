import React, { useMemo, useState } from "react";
import { type TraceryParams, type TraceryPreset } from "../../../shared/tracery-types";
import { BUILTIN_PRESETS } from "../../../shared/builtin-presets";
import { fs, os, path } from "../../lib/cep/node";
import { selectFile, selectFolder } from "../../lib/utils/bolt";
import { Section } from "../components/fields";

const userPresetsDir = () => {
  try {
    const dir = path.join(os.homedir(), "Documents", "Tracery FX Presets");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  } catch {
    return "";
  }
};

export const PresetsTab: React.FC<{
  params: TraceryParams;
  onApply: (p: TraceryParams) => void;
  log: (msg: string) => void;
}> = ({ params, onApply, log }) => {
  const [userPresets, setUserPresets] = useState<TraceryPreset[]>(() => loadUserPresets(log));
  const [presetName, setPresetName] = useState("My Preset");
  const [filter, setFilter] = useState("");

  const filteredBuiltins = useMemo(
    () =>
      BUILTIN_PRESETS.filter((p) => p.name.toLowerCase().includes(filter.toLowerCase())),
    [filter]
  );

  const saveAsUserPreset = () => {
    try {
      const dir = userPresetsDir();
      const safeName = presetName.trim().replace(/[\\/:*?"<>|]/g, "_") || "Untitled";
      const preset: TraceryPreset = { name: presetName.trim() || "Untitled", params };
      const filePath = path.join(dir, `${safeName}.json`);
      fs.writeFileSync(filePath, JSON.stringify(preset, null, 2), "utf-8");
      setUserPresets(loadUserPresets(log));
      log(`Saved preset "${preset.name}" to ${filePath}`);
    } catch (e: any) {
      log(`Error saving preset: ${e?.message ?? e}`);
    }
  };

  const exportPreset = () => {
    selectFolder(userPresetsDir(), "Choose a folder to export this preset to", (folder) => {
      try {
        const safeName = presetName.trim().replace(/[\\/:*?"<>|]/g, "_") || "Untitled";
        const preset: TraceryPreset = { name: presetName.trim() || "Untitled", params };
        const filePath = path.join(folder, `${safeName}.json`);
        fs.writeFileSync(filePath, JSON.stringify(preset, null, 2), "utf-8");
        log(`Exported preset to ${filePath}`);
      } catch (e: any) {
        log(`Error exporting preset: ${e?.message ?? e}`);
      }
    });
  };

  const importPreset = () => {
    selectFile(userPresetsDir(), "Choose a Tracery FX preset .json file", (file) => {
      try {
        const raw = fs.readFileSync(file, "utf-8");
        const preset: TraceryPreset = JSON.parse(raw);
        onApply({ ...params, ...preset.params });
        log(`Imported preset "${preset.name ?? path.basename(file)}"`);
      } catch (e: any) {
        log(`Error importing preset: ${e?.message ?? e}`);
      }
    });
  };

  const deleteUserPreset = (p: TraceryPreset) => {
    try {
      const dir = userPresetsDir();
      const safeName = p.name.trim().replace(/[\\/:*?"<>|]/g, "_") || "Untitled";
      const filePath = path.join(dir, `${safeName}.json`);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      setUserPresets(loadUserPresets(log));
      log(`Deleted preset "${p.name}"`);
    } catch (e: any) {
      log(`Error deleting preset: ${e?.message ?? e}`);
    }
  };

  return (
    <div className="tab-panel">
      <Section title="Save Current Settings">
        <div className="preset-save-row">
          <input
            type="text"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            placeholder="Preset name"
          />
          <button onClick={saveAsUserPreset}>Save</button>
        </div>
        <div className="preset-save-row">
          <button onClick={exportPreset}>Export JSON…</button>
          <button onClick={importPreset}>Import JSON…</button>
        </div>
        <p className="note">
          Presets are portable JSON files (matching the real Tracery's preset manager) saved by default to
          Documents/Tracery FX Presets.
        </p>
      </Section>

      {userPresets.length > 0 && (
        <Section title={`Your Presets (${userPresets.length})`}>
          <div className="preset-list">
            {userPresets.map((p) => (
              <div className="preset-row" key={p.name}>
                <button className="preset-apply" onClick={() => onApply({ ...params, ...p.params })}>
                  {p.name}
                </button>
                <button className="preset-delete" onClick={() => deleteUserPreset(p)}>
                  ×
                </button>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title={`Built-in Presets (${BUILTIN_PRESETS.length})`}>
        <input
          type="text"
          className="preset-filter"
          placeholder="Filter presets…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <div className="preset-list">
          {filteredBuiltins.map((p) => (
            <button
              className="preset-apply preset-builtin"
              key={p.name}
              title={p.description}
              onClick={() => onApply({ ...params, ...p.params })}
            >
              {p.name}
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
};

function loadUserPresets(log: (msg: string) => void): TraceryPreset[] {
  try {
    const dir = userPresetsDir();
    if (!dir || !fs.existsSync(dir)) return [];
    const files = fs.readdirSync(dir).filter((f: string) => f.endsWith(".json"));
    return files
      .map((f: string) => {
        try {
          return JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8")) as TraceryPreset;
        } catch {
          return null;
        }
      })
      .filter((p: TraceryPreset | null): p is TraceryPreset => !!p);
  } catch (e: any) {
    log(`Error loading user presets: ${e?.message ?? e}`);
    return [];
  }
}
