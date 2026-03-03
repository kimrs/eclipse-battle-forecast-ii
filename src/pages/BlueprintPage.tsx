import { useState, useRef, useEffect } from 'react';
import { BlueprintEditor } from '../components/BlueprintEditor';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { SPECIES_PRESETS } from '../data/species';
import type { BlueprintPreset } from '../data/species';
import { SHIP_TYPES, SHIP_TYPE_LABELS, PART_BY_ID } from '../data/constants';
import type { Faction, ShipType, Blueprint } from '../types/game';

function buildBlueprintFromPreset(shipType: ShipType, cfg: BlueprintPreset): Blueprint {
  return {
    shipType,
    initiativeBonus: cfg.initiativeBonus,
    slots: cfg.slots,
    parts: cfg.defaultParts.map(id => PART_BY_ID[id]).filter(Boolean),
    ...(cfg.innateComputers != null && { innateComputers: cfg.innateComputers }),
    ...(cfg.innateShields != null && { innateShields: cfg.innateShields }),
    ...(cfg.innateHull != null && { innateHull: cfg.innateHull }),
    ...(cfg.innateInitiative != null && { innateInitiative: cfg.innateInitiative }),
    ...(cfg.innateEnergyProduction != null && { innateEnergyProduction: cfg.innateEnergyProduction }),
  };
}

export function makeDefaultFactions(): Faction[] {
  return SPECIES_PRESETS.map(preset => ({
    id: crypto.randomUUID(),
    name: preset.name,
    blueprints: Object.fromEntries(
      SHIP_TYPES.map(st => [st, buildBlueprintFromPreset(st, preset.blueprints[st])]),
    ) as Faction['blueprints'],
  }));
}

const DEFAULT_SHIP_PROPS: Record<ShipType, { slots: number; initiativeBonus: number }> = {
  interceptor: { slots: 4, initiativeBonus: 2 },
  cruiser: { slots: 6, initiativeBonus: 1 },
  dreadnought: { slots: 8, initiativeBonus: 0 },
  starbase: { slots: 5, initiativeBonus: 4 },
};

function makeEmptyFaction(name: string): Faction {
  return {
    id: crypto.randomUUID(),
    name,
    blueprints: Object.fromEntries(
      SHIP_TYPES.map(st => [st, { shipType: st, ...DEFAULT_SHIP_PROPS[st], parts: [] } as Blueprint]),
    ) as Faction['blueprints'],
  };
}


interface BlueprintSectionProps {
  factions: Faction[];
  onFactionsChange: (factions: Faction[]) => void;
}

export function BlueprintSection({ factions, onFactionsChange }: BlueprintSectionProps) {
  const [activeFactionId, setActiveFactionId] = useState<string>(
    () => factions[0]?.id ?? ''
  );
  const [activeShipType, setActiveShipType] = useState<ShipType>('interceptor');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [showPresetDropdown, setShowPresetDropdown] = useState(false);
  const [pendingPreset, setPendingPreset] = useState<string | null>(null);
  const [newFactionName, setNewFactionName] = useState('');
  const [showNewFactionInput, setShowNewFactionInput] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const presetDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showPresetDropdown) return;
    const handler = (e: MouseEvent) => {
      if (presetDropdownRef.current && !presetDropdownRef.current.contains(e.target as Node)) {
        setShowPresetDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPresetDropdown]);

  const activeFaction = factions.find(f => f.id === activeFactionId) ?? factions[0];

  const updateFaction = (updated: Faction) => {
    onFactionsChange(factions.map(f => (f.id === updated.id ? updated : f)));
  };

  const handleAddFaction = () => {
    if (!newFactionName.trim()) return;
    const faction = makeEmptyFaction(newFactionName.trim());
    onFactionsChange([...factions, faction]);
    setActiveFactionId(faction.id);
    setNewFactionName('');
    setShowNewFactionInput(false);
  };

  const handleDeleteFaction = (id: string) => {
    if (factions.length <= 1) return;
    const remaining = factions.filter(f => f.id !== id);
    onFactionsChange(remaining);
    if (activeFactionId === id) {
      setActiveFactionId(remaining[0].id);
    }
  };

  const handleStartRename = (faction: Faction) => {
    setRenamingId(faction.id);
    setRenameValue(faction.name);
  };

  const handleConfirmRename = () => {
    if (!renamingId || !renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    updateFaction({ ...activeFaction, name: renameValue.trim() });
    setRenamingId(null);
  };

  const handleLoadPreset = (presetId: string) => {
    setPendingPreset(presetId);
    setShowPresetDropdown(false);
  };

  const handleConfirmPreset = () => {
    if (!pendingPreset || !activeFaction) return;
    const preset = SPECIES_PRESETS.find(p => p.id === pendingPreset);
    if (!preset) return;

    const newBlueprints = Object.fromEntries(
      SHIP_TYPES.map(shipType => [
        shipType,
        buildBlueprintFromPreset(shipType, preset.blueprints[shipType]),
      ])
    ) as Faction['blueprints'];

    updateFaction({ ...activeFaction, blueprints: newBlueprints });
    setPendingPreset(null);
  };

  const handleBlueprintChange = (updated: Blueprint) => {
    if (!activeFaction) return;
    updateFaction({
      ...activeFaction,
      blueprints: { ...activeFaction.blueprints, [updated.shipType]: updated },
    });
  };

  if (!activeFaction) return null;

  const activeBlueprint = activeFaction.blueprints[activeShipType];

  return (
    <section id="blueprints" className="border-t border-gray-700 pt-6">
      <div className="max-w-4xl mx-auto p-4">
        {/* Faction Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
          <div className="relative">
            <div className="overflow-x-auto flex flex-nowrap gap-2 snap-x snap-mandatory scrollbar-hide pb-1 [mask-image:linear-gradient(to_right,transparent,black_1rem,black_calc(100%-1rem),transparent)] sm:[mask-image:none]">
              {factions.map(faction => (
                <button
                  key={faction.id}
                  onClick={() => setActiveFactionId(faction.id)}
                  className={`snap-start shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    faction.id === activeFactionId
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {faction.name}
                </button>
              ))}
            </div>
          </div>

          {showNewFactionInput ? (
            <div className="flex gap-1">
              <input
                type="text"
                value={newFactionName}
                onChange={e => setNewFactionName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAddFaction();
                  if (e.key === 'Escape') setShowNewFactionInput(false);
                }}
                placeholder="Faction name..."
                className="border border-gray-600 bg-gray-700 text-white rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                autoFocus
              />
              <button
                onClick={handleAddFaction}
                className="text-sm px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white"
              >
                Add
              </button>
              <button
                onClick={() => setShowNewFactionInput(false)}
                className="text-sm px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-white"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowNewFactionInput(true)}
              className="text-sm px-3 py-1.5 border border-dashed border-gray-500 text-gray-400 hover:text-white hover:border-gray-300 rounded-lg transition-colors"
            >
              + New Faction
            </button>
          )}
        </div>

        {/* Active Faction Controls */}
        <div className="bg-gray-800 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            {renamingId === activeFaction.id ? (
              <div className="flex gap-1 items-center">
                <input
                  type="text"
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleConfirmRename();
                    if (e.key === 'Escape') setRenamingId(null);
                  }}
                  className="border border-gray-600 bg-gray-700 text-white rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  autoFocus
                />
                <button onClick={handleConfirmRename} className="text-sm text-green-400 hover:text-green-300 px-2">Save</button>
                <button onClick={() => setRenamingId(null)} className="text-sm text-gray-400 hover:text-gray-300 px-1">Cancel</button>
              </div>
            ) : (
              <span className="font-semibold text-white">{activeFaction.name}</span>
            )}

            <button
              onClick={() => handleStartRename(activeFaction)}
              className="text-xs text-gray-400 hover:text-white border border-gray-600 rounded px-2 py-0.5 transition-colors"
            >
              Rename
            </button>

            <button
              onClick={() => handleDeleteFaction(activeFaction.id)}
              disabled={factions.length <= 1}
              className="text-xs text-red-400 hover:text-red-300 border border-red-800 rounded px-2 py-0.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Delete
            </button>

            <div className="relative ml-auto" ref={presetDropdownRef}>
              <button
                onClick={() => setShowPresetDropdown(v => !v)}
                className="text-xs border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 rounded px-2 py-0.5 transition-colors"
              >
                Load Preset ▾
              </button>
              {showPresetDropdown && (
                <div className="absolute right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-10 min-w-[160px]">
                  {SPECIES_PRESETS.map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => handleLoadPreset(preset.id)}
                      className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white first:rounded-t-lg last:rounded-b-lg"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Technologies */}
          <div className="mt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!activeFaction.hasAntimatterSplitter}
                onChange={e =>
                  updateFaction({ ...activeFaction, hasAntimatterSplitter: e.target.checked })
                }
                className="w-4 h-4 accent-blue-500"
              />
              <span className="text-sm text-gray-300">Antimatter Splitter</span>
              <span className="text-xs text-gray-500">(splits antimatter damage freely across targets)</span>
            </label>
          </div>

          {/* Ship Type Tabs */}
          <div className="flex gap-1 mt-4 border-b border-gray-700 pb-0">
            {SHIP_TYPES.map(type => (
              <button
                key={type}
                onClick={() => setActiveShipType(type)}
                className={`px-3 min-h-[44px] py-2 text-sm font-medium rounded-t-lg transition-colors -mb-px border border-transparent ${
                  type === activeShipType
                    ? 'bg-white text-gray-900 border-gray-300 border-b-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                <span className="sm:hidden">{SHIP_TYPE_LABELS[type].abbreviated}</span>
                <span className="hidden sm:inline">{SHIP_TYPE_LABELS[type].singular}</span>
              </button>
            ))}
          </div>

          {/* Blueprint Editor */}
          <div className="mt-4 bg-white rounded-lg p-4">
            <h3 className="text-gray-700 font-semibold mb-3">Blueprint: {SHIP_TYPE_LABELS[activeShipType].singular}</h3>
            <BlueprintEditor
              blueprint={activeBlueprint}
              onChange={handleBlueprintChange}
            />
          </div>
        </div>

        {/* Reset */}
        <div className="flex justify-end">
          <button
            onClick={() => setShowResetConfirm(true)}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Reset to Defaults
          </button>
        </div>
      </div>

      {/* Preset Confirmation Modal */}
      {pendingPreset && (
        <ConfirmDialog
          title="Load Preset"
          message={`This will replace all blueprints for \u201c${activeFaction.name}\u201d. Continue?`}
          confirmLabel="Load"
          onConfirm={handleConfirmPreset}
          onCancel={() => setPendingPreset(null)}
        />
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <ConfirmDialog
          title="Reset to Defaults"
          message="This will replace all factions and blueprints with the defaults. Any customizations will be lost. Continue?"
          confirmLabel="Reset"
          confirmClass="bg-red-600 hover:bg-red-700"
          onConfirm={() => {
            const defaults = makeDefaultFactions();
            onFactionsChange(defaults);
            setActiveFactionId(defaults[0].id);
            setShowResetConfirm(false);
          }}
          onCancel={() => setShowResetConfirm(false)}
        />
      )}

    </section>
  );
}
