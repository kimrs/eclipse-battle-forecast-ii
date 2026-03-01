import { useState } from 'react';
import { computeBlueprintStats } from '../types/game';
import { ShipPartSelector } from './ShipPartSelector';
import type { Blueprint, ShipPart, DieColor } from '../types/game';

interface BlueprintEditorProps {
  blueprint: Blueprint;
  onChange: (updated: Blueprint) => void;
}

const DIE_COLOR_CLASSES: Record<DieColor, string> = {
  yellow: 'bg-yellow-400 text-yellow-900',
  orange: 'bg-orange-400 text-orange-900',
  blue: 'bg-blue-500 text-white',
  red: 'bg-red-500 text-white',
  pink: 'bg-pink-400 text-pink-900',
};

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
    newParts[slotIndex] = part;
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
            className={`border rounded-lg p-2 min-h-[80px] flex flex-col justify-between text-sm ${
              part ? 'bg-gray-50 border-gray-300' : 'border-dashed border-gray-300 bg-white'
            }`}
          >
            {part ? (
              <>
                <span className="font-medium text-gray-800 leading-snug">{part.name}</span>
                <button
                  onClick={() => handleRemove(i)}
                  className="mt-2 text-xs text-red-500 hover:text-red-700 self-start"
                >
                  [Remove]
                </button>
              </>
            ) : (
              <>
                <span className="text-gray-400 text-xs italic">empty</span>
                {usedSlots < slots && (
                  <button
                    onClick={() => setSelectorOpenForSlot(i)}
                    className="mt-2 text-xs text-blue-600 hover:text-blue-800 self-start"
                  >
                    [Add]
                  </button>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Stats Summary */}
      <div className="border rounded-lg p-3 bg-gray-50 text-sm space-y-1">
        <h4 className="font-semibold text-gray-600 mb-2">Stats Summary</h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <span className="text-gray-500">Cannons:</span>
          <DiceSymbols dice={stats.cannons} />

          <span className="text-gray-500">Missiles:</span>
          <DiceSymbols dice={stats.missiles} />

          <span className="text-gray-500">Computer:</span>
          <span>{stats.computers >= 0 ? `+${stats.computers}` : stats.computers}</span>

          <span className="text-gray-500">Shield:</span>
          <span>{stats.shields >= 0 ? `+${stats.shields}` : stats.shields}</span>

          <span className="text-gray-500">Hull:</span>
          <span>{stats.hull}</span>

          <span className="text-gray-500">Initiative:</span>
          <span>
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
