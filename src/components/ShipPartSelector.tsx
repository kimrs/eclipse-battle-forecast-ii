import { useState } from 'react';
import { SHIP_PARTS } from '../data/shipParts';
import { DIE_COLOR_CLASSES } from '../data/constants';
import type { ShipPart, DieColor } from '../types/game';

interface ShipPartSelectorProps {
  onSelect: (part: ShipPart) => void;
  onClose: () => void;
  excludeDrives?: boolean;
}

const CATEGORIES = ['Weapons', 'Defense', 'Propulsion', 'Energy', 'Special'] as const;

function getCategory(part: ShipPart): string {
  if (part.isRiftWeapon) {
    return 'Special';
  }
  if (part.cannons.length > 0 || part.missiles.length > 0) {
    return 'Weapons';
  }
  if (part.initiative > 0) {
    return 'Propulsion';
  }
  if (part.energyProduction > 0) {
    return 'Energy';
  }
  return 'Defense';
}

function DiceList({ label, dice }: { label: string; dice: { color: DieColor; count: number }[] }) {
  if (dice.length === 0) return null;
  return (
    <span className="flex items-center gap-1">
      <span className="text-gray-500 text-xs">{label}:</span>
      {dice.map((d, i) => (
        <span key={i} className={`text-xs px-1 rounded font-semibold ${DIE_COLOR_CLASSES[d.color]}`}>
          {d.count}×{d.color[0].toUpperCase()}
        </span>
      ))}
    </span>
  );
}

function PartStats({ part }: { part: ShipPart }) {
  const stats: string[] = [];
  if (part.computers) stats.push(`+${part.computers} comp`);
  if (part.shields) stats.push(`+${part.shields} shield`);
  if (part.hull) stats.push(`+${part.hull} hull`);
  if (part.initiative) stats.push(`+${part.initiative} init`);
  if (part.energyProduction) stats.push(`+${part.energyProduction}⚡`);
  if (part.energyConsumption) stats.push(`-${part.energyConsumption}⚡`);
  return (
    <div className="flex flex-wrap gap-1 mt-0.5">
      <DiceList label="cannon" dice={part.cannons} />
      <DiceList label="missile" dice={part.missiles} />
      {stats.map((s, i) => (
        <span key={i} className="text-xs text-gray-500">{s}</span>
      ))}
    </div>
  );
}

export function ShipPartSelector({ onSelect, onClose, excludeDrives = false }: ShipPartSelectorProps) {
  const [search, setSearch] = useState('');

  const filteredParts = SHIP_PARTS.filter(part => {
    if (excludeDrives && part.initiative > 0) return false;
    if (search && !part.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const grouped = CATEGORIES.reduce<Record<string, ShipPart[]>>((acc, cat) => {
    const parts = filteredParts.filter(p => getCategory(p) === cat);
    if (parts.length > 0) acc[cat] = parts;
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white text-gray-900 shadow-xl w-full flex flex-col inset-0 fixed sm:relative sm:inset-auto sm:rounded-lg sm:max-w-lg sm:max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white z-10 border-b">
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="font-semibold text-lg">Select Ship Part</h2>
            <button onClick={onClose} className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
          </div>

          <div className="px-4 py-2 border-t">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search parts..."
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              autoFocus
            />
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-4 py-2">
          {Object.entries(grouped).map(([cat, parts]) => (
            <div key={cat} className="mb-4">
              <h3 className="text-xs font-bold uppercase text-gray-400 mb-1 tracking-wider">{cat}</h3>
              <div className="space-y-1">
                {parts.map(part => (
                  <button
                    key={part.id}
                    onClick={() => { onSelect(part); onClose(); }}
                    className="w-full text-left px-3 py-3 rounded border border-transparent hover:border-blue-400 hover:bg-blue-50 transition-colors"
                  >
                    <div className="font-medium text-sm">{part.name}</div>
                    <PartStats part={part} />
                  </button>
                ))}
              </div>
            </div>
          ))}
          {Object.keys(grouped).length === 0 && (
            <p className="text-gray-400 text-sm text-center py-4">No parts found.</p>
          )}
        </div>

        <div className="sm:hidden border-t px-4 py-3">
          <button onClick={onClose} className="w-full py-3 text-center text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
