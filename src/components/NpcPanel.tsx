import { NPC_BLUEPRINTS } from '../data/npcBlueprints';
import type { NpcDeployment } from '../types/game';
import { Stepper } from './Stepper';

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex items-center justify-between sm:justify-start sm:gap-2">
          <label className="text-sm text-gray-400">Count:</label>
          <Stepper
            value={npc.count}
            min={1}
            max={8}
            onChange={v => onUpdate({ ...npc, count: v })}
            accentColor="purple"
          />
        </div>
        <div className="flex items-center justify-between sm:justify-start sm:gap-2">
          <label className="text-sm text-gray-400">Turn of Entry:</label>
          <Stepper
            value={npc.turnOfEntry}
            min={1}
            max={9}
            onChange={v => onUpdate({ ...npc, turnOfEntry: v })}
            accentColor="purple"
          />
        </div>
      </div>
    </div>
  );
}
