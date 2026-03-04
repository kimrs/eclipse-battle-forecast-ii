import { useState, useRef, useEffect } from 'react';
import { FactionPanel } from './FactionPanel';
import { NpcPanel } from './NpcPanel';
import { NPC_BLUEPRINTS } from '../data/npcBlueprints';
import type { FactionDeployment, NpcDeployment, NpcType, Faction } from '../types/game';

interface BattleSetupProps {
  factionDeployments: FactionDeployment[];
  npcDeployments: NpcDeployment[];
  availableFactions: Faction[];
  onFactionDeploymentsChange: (deployments: FactionDeployment[]) => void;
  onNpcDeploymentsChange: (deployments: NpcDeployment[]) => void;
}

type NpcOption = {
  label: string;
  type: NpcType;
  variant: 'normal' | 'advanced';
};

const NPC_OPTIONS: NpcOption[] = [
  { label: 'Ancient (Normal)', type: 'ancient', variant: 'normal' },
  { label: 'Ancient (Advanced)', type: 'ancient', variant: 'advanced' },
  { label: 'Guardian (Normal)', type: 'guardian', variant: 'normal' },
  { label: 'Guardian (Advanced)', type: 'guardian', variant: 'advanced' },
  { label: 'GCDS', type: 'gcds', variant: 'normal' },
];


export function BattleSetup({
  factionDeployments,
  npcDeployments,
  availableFactions,
  onFactionDeploymentsChange,
  onNpcDeploymentsChange,
}: BattleSetupProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  const handleUpdateFaction = (index: number, updated: FactionDeployment) => {
    onFactionDeploymentsChange(factionDeployments.map((d, i) => (i === index ? updated : d)));
  };

  const handleRemoveFaction = (index: number) => {
    onFactionDeploymentsChange(factionDeployments.filter((_, i) => i !== index));
  };

  const handleUpdateNpc = (index: number, updated: NpcDeployment) => {
    onNpcDeploymentsChange(npcDeployments.map((d, i) => (i === index ? updated : d)));
  };

  const handleRemoveNpc = (index: number) => {
    onNpcDeploymentsChange(npcDeployments.filter((_, i) => i !== index));
  };

  const handleAddFaction = (faction: Faction) => {
    const newDeployment: FactionDeployment = {
      id: crypto.randomUUID(),
      factionId: faction.id,
      ships: [
        { type: 'interceptor', count: 0 },
        { type: 'cruiser', count: 0 },
        { type: 'dreadnought', count: 0 },
        { type: 'starbase', count: 0 },
      ],
      turnOfEntry: factionDeployments.length + npcDeployments.length + 1,
      controlsSector: false,
    };
    onFactionDeploymentsChange([...factionDeployments, newDeployment]);
    setDropdownOpen(false);
  };

  const handleAddNpc = (option: NpcOption) => {
    const blueprints = NPC_BLUEPRINTS[option.type];
    const blueprint =
      option.variant === 'advanced' && blueprints.advanced
        ? blueprints.advanced
        : blueprints.normal;
    const turnOfEntry = factionDeployments.length + npcDeployments.length + 1;
    onNpcDeploymentsChange([...npcDeployments, { id: crypto.randomUUID(), type: option.type, blueprint, count: 1, turnOfEntry }]);
    setDropdownOpen(false);
  };

  return (
    <div className="space-y-3">
      {/* Unified combatant list: faction cards first, then NPC cards */}
      {factionDeployments.map((deployment, i) => (
        <FactionPanel
          key={deployment.id}
          deployment={deployment}
          availableFactions={availableFactions}
          onChange={updated => handleUpdateFaction(i, updated)}
          onRemove={() => handleRemoveFaction(i)}
        />
      ))}
      {npcDeployments.map((npc, i) => (
        <NpcPanel
          key={npc.id}
          npc={npc}
          onUpdate={updated => handleUpdateNpc(i, updated)}
          onRemove={() => handleRemoveNpc(i)}
        />
      ))}

      {/* Add combatant button */}
      <div className="pt-2" ref={dropdownRef}>
        <div className="relative sm:flex sm:justify-center">
          <button
            onClick={() => setDropdownOpen(prev => !prev)}
            className="w-full sm:w-auto py-3 sm:py-2 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-500 text-gray-400 hover:border-blue-400 hover:text-blue-400 text-sm font-medium transition-colors sm:px-4"
          >
            + Add Combatant
          </button>
          {dropdownOpen && (
            <div className="absolute left-0 sm:left-1/2 sm:-translate-x-1/2 top-full mt-1 z-10 bg-gray-800 border border-gray-600 rounded-xl shadow-xl w-full sm:w-auto min-w-[16rem] py-2">
              {(() => {
                const deployedFactionIds = new Set(factionDeployments.map(d => d.factionId));
                const undeployedFactions = availableFactions.filter(f => !deployedFactionIds.has(f.id));
                return undeployedFactions.length > 0 ? (
                  <>
                    <p className="px-3 py-1 text-xs text-gray-500 uppercase tracking-wider">
                      Factions
                    </p>
                    {undeployedFactions.map(f => (
                      <button
                        key={f.id}
                        onClick={() => handleAddFaction(f)}
                        className="w-full text-left px-4 py-3 text-sm text-gray-200 hover:bg-gray-700 transition-colors flex items-center gap-2"
                      >
                        <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: f.color }} />
                        {f.name}
                      </button>
                    ))}
                    <div className="border-t border-gray-700 my-1" />
                  </>
                ) : availableFactions.length > 0 ? (
                  <>
                    <p className="px-4 py-3 text-xs text-gray-500 italic">All factions already deployed</p>
                    <div className="border-t border-gray-700 my-1" />
                  </>
                ) : (
                  <p className="px-4 py-3 text-xs text-gray-500 italic">No factions configured</p>
                );
              })()}
              <p className="px-3 py-1 text-xs text-gray-500 uppercase tracking-wider">NPCs</p>
              {NPC_OPTIONS.map(opt => (
                <button
                  key={`${opt.type}-${opt.variant}`}
                  onClick={() => handleAddNpc(opt)}
                  className="w-full text-left px-4 py-3 text-sm text-gray-200 hover:bg-gray-700 transition-colors"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
