import { useState } from 'react';
import { computeBlueprintStats } from '../engine/blueprintStats';
import { ShipPartSelector } from './ShipPartSelector';
import { DIE_COLOR_CLASSES } from '../data/constants';
import type { Blueprint, ShipPart, DieColor } from '../types/game';

interface BlueprintEditorProps {
  blueprint: Blueprint;
  onChange: (updated: Blueprint) => void;
}

function DiceSymbols({ dice }: { dice: { color: DieColor; count: number }[] }) {
  if (dice.length === 0) return <span className="text-gray-400">—</span>;
  return (
    <span className="flex gap-1 flex-wrap">
      {dice.map((d, i) => (
        <span key={i} className={`text-xs px-1.5 py-0.5 rounded font-semibold ${DIE_COLOR_CLASSES[d.color]}`}>
          {d.count}×{d.color[0].toUpperCase()}
        </span>
      ))}
    </span>
  );
}

export function BlueprintEditor({ blueprint, onChange }: BlueprintEditorProps) {
  const [selectorOpenForSlot, setSelectorOpenForSlot] = useState<number | null>(null);

  const { shipType, slots, parts, initiativeBonus } = blueprint;
  const stats = computeBlueprintStats(blueprint);
  const isStarbase = shipType === 'starbase';

  const handleAdd = (slotIndex: number, part: ShipPart) => {
    const newParts = [...parts];
    // Insert at the correct position, avoiding sparse array holes
    if (slotIndex <= newParts.length) {
      newParts[slotIndex] = part;
    } else {
      newParts.push(part);
    }
    onChange({ ...blueprint, parts: newParts });
  };

  const handleRemove = (slotIndex: number) => {
    const newParts = parts.filter((_, i) => i !== slotIndex);
    onChange({ ...blueprint, parts: newParts });
  };

  // Build an array of slot items: filled slots + empty up to max
  const slotItems: (ShipPart | null)[] = [
    ...parts,
    ...Array(Math.max(0, slots - parts.length)).fill(null),
  ];

  const usedSlots = parts.length;
  const driveInitiative = parts.reduce((sum, p) => sum + p.initiative, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-700">
          Ship Part Slots
          <span className="ml-2 text-sm font-normal text-gray-400">
            {usedSlots} / {slots}
          </span>
        </h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
        {slotItems.map((part, i) => (
          <div
            key={i}
            className={`border rounded-lg p-2 min-h-[80px] flex flex-col text-sm relative ${
              part ? 'bg-gray-50 border-gray-300' : 'border-dashed border-gray-300 bg-white'
            }`}
          >
            {part ? (
              <>
                <span className="font-medium text-gray-800 leading-snug pr-8">{part.name}</span>
                <button
                  onClick={() => handleRemove(i)}
                  className="absolute top-1 right-1 min-w-[44px] min-h-[44px] flex items-center justify-center text-red-500 hover:text-red-700 text-lg leading-none"
                  aria-label="Remove part"
                >
                  ✕
                </button>
              </>
            ) : usedSlots < slots ? (
              <button
                onClick={() => setSelectorOpenForSlot(i)}
                className="flex-1 flex flex-col items-center justify-center gap-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded py-2 transition-colors"
              >
                <span className="text-lg">+</span>
                <span className="text-xs">Add Part</span>
              </button>
            ) : (
              <span className="text-gray-400 text-xs italic flex-1 flex items-center justify-center">empty</span>
            )}
          </div>
        ))}
      </div>

      {/* Innate Bonuses */}
      {(blueprint.innateComputers || blueprint.innateShields || blueprint.innateHull || blueprint.innateInitiative || blueprint.innateEnergyProduction) && (
        <div className="border border-blue-200 rounded-lg p-2 bg-blue-50 text-xs text-blue-700 mb-4 flex flex-wrap gap-3">
          <span className="font-semibold">Innate:</span>
          {!!blueprint.innateComputers && <span>+{blueprint.innateComputers} computer</span>}
          {!!blueprint.innateShields && <span>+{blueprint.innateShields} shield</span>}
          {!!blueprint.innateHull && <span>+{blueprint.innateHull} hull</span>}
          {!!blueprint.innateInitiative && <span>+{blueprint.innateInitiative} initiative</span>}
          {!!blueprint.innateEnergyProduction && <span>+{blueprint.innateEnergyProduction} energy</span>}
        </div>
      )}

      {/* Stats Summary */}
      <div className="border rounded-lg p-3 bg-gray-50 text-sm space-y-1">
        <h4 className="font-semibold text-gray-600 mb-2">Stats Summary</h4>
        {/* Mobile: compact single-column */}
        <div className="flex flex-col gap-1 sm:hidden">
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-16 shrink-0">Cannons:</span>
            <DiceSymbols dice={stats.cannons} />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-16 shrink-0">Missiles:</span>
            <DiceSymbols dice={stats.missiles} />
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-800">
            <span><span className="text-gray-500">Comp:</span> {stats.computers >= 0 ? `+${stats.computers}` : stats.computers}</span>
            <span><span className="text-gray-500">Shield:</span> {stats.shields >= 0 ? `+${stats.shields}` : stats.shields}</span>
            <span><span className="text-gray-500">Hull:</span> {stats.hull}</span>
            <span><span className="text-gray-500">Init:</span> {stats.initiative}</span>
            <span className={stats.energyBalance >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
              <span className="text-gray-500 font-normal">Energy:</span> {stats.energyBalance >= 0 ? `+${stats.energyBalance}` : stats.energyBalance}
            </span>
          </div>
        </div>
        {/* Desktop: 2-col grid */}
        <div className="hidden sm:grid grid-cols-2 gap-x-4 gap-y-1">
          <span className="text-gray-500">Cannons:</span>
          <DiceSymbols dice={stats.cannons} />

          <span className="text-gray-500">Missiles:</span>
          <DiceSymbols dice={stats.missiles} />

          <span className="text-gray-500">Computer:</span>
          <span className="text-gray-800">{stats.computers >= 0 ? `+${stats.computers}` : stats.computers}</span>

          <span className="text-gray-500">Shield:</span>
          <span className="text-gray-800">{stats.shields >= 0 ? `+${stats.shields}` : stats.shields}</span>

          <span className="text-gray-500">Hull:</span>
          <span className="text-gray-800">{stats.hull}</span>

          <span className="text-gray-500">Initiative:</span>
          <span className="text-gray-800">
            {stats.initiative}{' '}
            <span className="text-gray-400 text-xs">
              (bonus: {initiativeBonus} + drives: {driveInitiative})
            </span>
          </span>

          <span className="text-gray-500">Energy:</span>
          <span className={stats.energyBalance >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
            {stats.energyBalance >= 0 ? `+${stats.energyBalance}` : stats.energyBalance}{' '}
            {stats.energyBalance >= 0 ? '✓' : '✗'}
          </span>
        </div>
      </div>

      {selectorOpenForSlot !== null && (
        <ShipPartSelector
          onSelect={part => handleAdd(selectorOpenForSlot, part)}
          onClose={() => setSelectorOpenForSlot(null)}
          excludeDrives={isStarbase}
        />
      )}
    </div>
  );
}
