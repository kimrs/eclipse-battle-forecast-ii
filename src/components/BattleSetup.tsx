import { FactionPanel } from './FactionPanel';
import { NPC_BLUEPRINTS } from '../data/npcBlueprints';
import type { FactionDeployment, NpcDeployment, NpcType, Faction } from '../types/game';

interface BattleSetupProps {
  factionDeployments: FactionDeployment[];
  npcDeployments: NpcDeployment[];
  availableFactions: Faction[];
  onFactionDeploymentsChange: (deployments: FactionDeployment[]) => void;
  onNpcDeploymentsChange: (deployments: NpcDeployment[]) => void;
}

const NPC_TYPES: NpcType[] = ['ancient', 'guardian', 'gcds'];
const NPC_TYPE_LABELS: Record<NpcType, string> = {
  ancient: 'Ancient',
  guardian: 'Guardian',
  gcds: 'GCDS',
};

function makeDefaultNpc(): NpcDeployment {
  return {
    type: 'ancient',
    blueprint: NPC_BLUEPRINTS['ancient'].normal,
    count: 1,
  };
}

export function BattleSetup({
  factionDeployments,
  npcDeployments,
  availableFactions,
  onFactionDeploymentsChange,
  onNpcDeploymentsChange,
}: BattleSetupProps) {
  const handleAddFaction = () => {
    if (availableFactions.length === 0) return;
    const nextTurn = factionDeployments.length + 1;
    const newDeployment: FactionDeployment = {
      factionId: availableFactions[0].id,
      ships: [
        { type: 'interceptor', count: 0 },
        { type: 'cruiser', count: 0 },
        { type: 'dreadnought', count: 0 },
        { type: 'starbase', count: 0 },
      ],
      turnOfEntry: nextTurn,
      controlsSector: false,
    };
    onFactionDeploymentsChange([...factionDeployments, newDeployment]);
  };

  const handleUpdateFaction = (index: number, updated: FactionDeployment) => {
    const next = factionDeployments.map((d, i) => (i === index ? updated : d));
    onFactionDeploymentsChange(next);
  };

  const handleRemoveFaction = (index: number) => {
    onFactionDeploymentsChange(factionDeployments.filter((_, i) => i !== index));
  };

  const handleAddNpc = () => {
    onNpcDeploymentsChange([...npcDeployments, makeDefaultNpc()]);
  };

  const handleUpdateNpc = (index: number, updated: NpcDeployment) => {
    onNpcDeploymentsChange(npcDeployments.map((d, i) => (i === index ? updated : d)));
  };

  const handleRemoveNpc = (index: number) => {
    onNpcDeploymentsChange(npcDeployments.filter((_, i) => i !== index));
  };

  const handleNpcTypeChange = (index: number, type: NpcType) => {
    const blueprints = NPC_BLUEPRINTS[type];
    handleUpdateNpc(index, {
      ...npcDeployments[index],
      type,
      blueprint: blueprints.normal,
    });
  };

  const handleNpcVariantChange = (index: number, variant: 'normal' | 'advanced') => {
    const npc = npcDeployments[index];
    const blueprints = NPC_BLUEPRINTS[npc.type];
    const blueprint = variant === 'advanced' && blueprints.advanced
      ? blueprints.advanced
      : blueprints.normal;
    handleUpdateNpc(index, { ...npc, blueprint });
  };

  const getNpcVariant = (npc: NpcDeployment): 'normal' | 'advanced' => {
    const blueprints = NPC_BLUEPRINTS[npc.type];
    return blueprints.advanced && npc.blueprint === blueprints.advanced ? 'advanced' : 'normal';
  };

  return (
    <div className="space-y-6">
      {/* Faction Panels */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">Factions in Battle:</h2>
          <button
            onClick={handleAddFaction}
            disabled={availableFactions.length === 0}
            className="text-sm px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            + Add Faction
          </button>
        </div>

        {factionDeployments.length === 0 ? (
          <p className="text-gray-500 text-sm italic">No factions added yet.</p>
        ) : (
          <div className="space-y-3">
            {factionDeployments.map((deployment, i) => (
              <FactionPanel
                key={i}
                deployment={deployment}
                availableFactions={availableFactions}
                onChange={updated => handleUpdateFaction(i, updated)}
                onRemove={() => handleRemoveFaction(i)}
              />
            ))}
          </div>
        )}
      </div>

      {/* NPC Panels */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">NPC Opponents:</h2>
          <button
            onClick={handleAddNpc}
            className="text-sm px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            + Add NPC
          </button>
        </div>

        {npcDeployments.length === 0 ? (
          <p className="text-gray-500 text-sm italic">No NPC opponents added.</p>
        ) : (
          <div className="space-y-3">
            {npcDeployments.map((npc, i) => {
              const hasAdvanced = !!NPC_BLUEPRINTS[npc.type].advanced;
              const currentVariant = getNpcVariant(npc);
              return (
                <div key={i} className="bg-gray-800 border border-purple-800 rounded-xl shadow p-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-400">Type:</label>
                        <select
                          value={npc.type}
                          onChange={e => handleNpcTypeChange(i, e.target.value as NpcType)}
                          className="bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                        >
                          {NPC_TYPES.map(t => (
                            <option key={t} value={t}>{NPC_TYPE_LABELS[t]}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-400">Variant:</label>
                        <select
                          value={currentVariant}
                          onChange={e => handleNpcVariantChange(i, e.target.value as 'normal' | 'advanced')}
                          disabled={!hasAdvanced}
                          className="bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:opacity-50"
                        >
                          <option value="normal">Normal</option>
                          {hasAdvanced && <option value="advanced">Advanced</option>}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-400">Count:</label>
                        <input
                          type="number"
                          min={1}
                          value={npc.count}
                          onChange={e => handleUpdateNpc(i, { ...npc, count: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                          className="w-16 bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveNpc(i)}
                      className="text-sm text-red-400 hover:text-red-300 border border-red-800 rounded px-2 py-1 transition-colors"
                    >
                      ✕ Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
