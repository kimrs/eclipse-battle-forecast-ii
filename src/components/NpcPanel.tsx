import { NPC_BLUEPRINTS } from '../data/npcBlueprints';
import type { NpcDeployment } from '../types/game';

function getNpcLabel(npc: NpcDeployment): string {
  const blueprints = NPC_BLUEPRINTS[npc.type];
  if (npc.type === 'gcds') return 'GCDS';
  const isAdvanced = !!blueprints.advanced && npc.blueprint === blueprints.advanced;
  const typeLabel = npc.type === 'ancient' ? 'Ancient' : 'Guardian';
  return blueprints.advanced ? `${typeLabel} (${isAdvanced ? 'Advanced' : 'Normal'})` : typeLabel;
}

interface NpcPanelProps {
  npc: NpcDeployment;
  onUpdate: (updated: NpcDeployment) => void;
  onRemove: () => void;
}

export function NpcPanel({ npc, onUpdate, onRemove }: NpcPanelProps) {
  return (
    <div className="bg-gray-800 border border-purple-800 rounded-xl shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-white font-medium">{getNpcLabel(npc)}</span>
        <button
          onClick={onRemove}
          className="text-sm text-red-400 hover:text-red-300 border border-red-800 rounded px-2 py-1 transition-colors"
        >
          ✕ Remove
        </button>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-400">Count:</label>
          <input
            type="number"
            min={1}
            value={npc.count}
            onChange={e => onUpdate({ ...npc, count: Math.max(1, parseInt(e.target.value, 10) || 1) })}
            className="w-16 bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-400">Turn of Entry:</label>
          <input
            type="number"
            min={1}
            value={npc.turnOfEntry ?? 1}
            onChange={e => onUpdate({ ...npc, turnOfEntry: Math.max(1, parseInt(e.target.value, 10) || 1) })}
            className="w-16 bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>
      </div>
    </div>
  );
}
