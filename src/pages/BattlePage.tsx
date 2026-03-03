import { BattleSetup } from '../components/BattleSetup';
import { SHIP_TYPE_MAX } from '../data/constants';
import type {
  Faction,
  FactionDeployment,
  NpcDeployment,
  SimulationConfig,
} from '../types/game';

function getValidationErrors(
  factionDeployments: FactionDeployment[],
  npcDeployments: NpcDeployment[],
  config: SimulationConfig,
  factions: Faction[]
): string[] {
  const errors: string[] = [];

  const totalCombatants = factionDeployments.length + npcDeployments.length;
  if (totalCombatants < 2) {
    errors.push('At least 2 combatants required (factions + NPCs).');
  }

  const controllers = factionDeployments.filter(d => d.controlsSector);
  if (controllers.length > 1) {
    errors.push('At most 1 faction can control the sector.');
  }

  for (const deployment of factionDeployments) {
    const faction = factions.find(f => f.id === deployment.factionId);
    const label = faction?.name ?? deployment.factionId;

    const totalShips = deployment.ships.reduce((sum, s) => sum + s.count, 0);
    if (totalShips < 1) {
      errors.push(`Faction "${label}" must have at least 1 ship.`);
    }

    for (const ship of deployment.ships) {
      const max = SHIP_TYPE_MAX[ship.type];
      if (ship.count > max) {
        errors.push(`Faction "${label}": ${ship.type} count exceeds max of ${max}.`);
      }
    }

    if (deployment.turnOfEntry < 1 || !Number.isInteger(deployment.turnOfEntry)) {
      errors.push(`Faction "${label}": Turn of entry must be a positive integer.`);
    }

    if (faction) {
      for (const ship of deployment.ships) {
        if (ship.count > 0) {
          const blueprint = faction.blueprints[ship.type];
          if (!blueprint || blueprint.parts.length === 0) {
            errors.push(`Faction "${label}": ${ship.type} blueprint has no parts configured.`);
          }
        }
      }
    }
  }

  if (config.dicePool % 6 !== 0) {
    errors.push('Dice pool size must be divisible by 6.');
  }

  if (config.runs < 1) {
    errors.push('Number of simulations must be at least 1.');
  }

  return errors;
}

interface BattleSectionProps {
  factions: Faction[];
  factionDeployments: FactionDeployment[];
  npcDeployments: NpcDeployment[];
  config: SimulationConfig;
  onFactionDeploymentsChange: (d: FactionDeployment[]) => void;
  onNpcDeploymentsChange: (d: NpcDeployment[]) => void;
  onConfigChange: (updater: SimulationConfig | ((prev: SimulationConfig) => SimulationConfig)) => void;
  onRunSimulation: () => void;
}

export function BattleSection({
  factions,
  factionDeployments,
  npcDeployments,
  config,
  onFactionDeploymentsChange,
  onNpcDeploymentsChange,
  onConfigChange,
  onRunSimulation,
}: BattleSectionProps) {
  const errors = getValidationErrors(factionDeployments, npcDeployments, config, factions);
  const isValid = errors.length === 0;

  const handleRunSimulation = () => {
    if (!isValid) return;
    onRunSimulation();
  };

  return (
    <section id="battle" className="border-t border-gray-700 pt-6">
      <div className="max-w-3xl mx-auto p-4 space-y-6">
        <h2 className="text-2xl font-bold">Battle Sector Setup</h2>

        {factions.length === 0 && (
          <div className="bg-yellow-900/40 border border-yellow-700 text-yellow-300 rounded-lg px-4 py-3 text-sm">
            No factions configured. Go to Blueprints to set up factions first.
          </div>
        )}

        <BattleSetup
          factionDeployments={factionDeployments}
          npcDeployments={npcDeployments}
          availableFactions={factions}
          onFactionDeploymentsChange={onFactionDeploymentsChange}
          onNpcDeploymentsChange={onNpcDeploymentsChange}
        />

        {/* Simulation Settings */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">
          <h2 className="text-lg font-semibold text-white">Simulation Settings</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Number of Simulations</label>
              <input
                type="number"
                min={1}
                value={config.runs}
                onChange={e =>
                  onConfigChange(c => ({ ...c, runs: Math.max(1, parseInt(e.target.value, 10) || 1) }))
                }
                className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <div className="flex gap-1 mt-1.5">
                {[100, 500, 1000].map(v => (
                  <button
                    key={v}
                    onClick={() => onConfigChange(c => ({ ...c, runs: v }))}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      config.runs === v
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-400 hover:text-white border border-gray-600'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
              {config.runs < 1 && (
                <p className="text-red-400 text-xs mt-1">Must be at least 1.</p>
              )}
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Dice Pool Size</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onConfigChange(c => ({ ...c, dicePool: Math.max(6, c.dicePool - 6) }))}
                  disabled={config.dicePool <= 6}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-gray-700 border border-gray-600 text-gray-300 hover:text-white rounded text-lg font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  −
                </button>
                <input
                  type="number"
                  min={6}
                  step={6}
                  value={config.dicePool}
                  onChange={e =>
                    onConfigChange(c => ({ ...c, dicePool: Math.max(6, parseInt(e.target.value, 10) || 6) }))
                  }
                  className="flex-1 bg-gray-700 border border-gray-600 text-white rounded px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button
                  onClick={() => onConfigChange(c => ({ ...c, dicePool: c.dicePool + 6 }))}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-gray-700 border border-gray-600 text-gray-300 hover:text-white rounded text-lg font-bold transition-colors"
                >
                  +
                </button>
              </div>
              <div className="flex gap-1 mt-1.5">
                {[600, 1200].map(v => (
                  <button
                    key={v}
                    onClick={() => onConfigChange(c => ({ ...c, dicePool: v }))}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      config.dicePool === v
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-400 hover:text-white border border-gray-600'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
              {config.dicePool % 6 !== 0 && (
                <p className="text-red-400 text-xs mt-1">Must be divisible by 6.</p>
              )}
            </div>
          </div>
        </div>

        {/* Validation errors summary */}
        {errors.length > 0 && (
          <div className="bg-red-900/40 border border-red-700 rounded-xl p-4">
            <p className="text-red-300 font-semibold text-sm mb-2">Fix the following before running:</p>
            <ul className="list-disc list-inside space-y-1">
              {errors.map((err, i) => (
                <li key={i} className="text-red-400 text-sm">{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Run Simulation button */}
        <div>
          <button
            onClick={handleRunSimulation}
            disabled={!isValid}
            className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors text-sm"
          >
            ▶ Run Simulation
          </button>
        </div>
      </div>
    </section>
  );
}
