import { useNavigate, Link } from 'react-router-dom';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useSessionStorage } from '../hooks/useSessionStorage';
import { BattleSetup } from '../components/BattleSetup';
import type {
  Faction,
  FactionDeployment,
  NpcDeployment,
  SimulationConfig,
  ShipType,
} from '../types/game';

const SHIP_TYPE_MAX: Record<ShipType, number> = {
  interceptor: 8,
  cruiser: 4,
  dreadnought: 2,
  starbase: 4,
};

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

export function BattlePage() {
  const navigate = useNavigate();
  const [factions] = useLocalStorage<Faction[]>('eclipse-factions', []);
  const [factionDeployments, setFactionDeployments] = useSessionStorage<FactionDeployment[]>('eclipse-faction-deployments', []);
  const [npcDeployments, setNpcDeployments] = useSessionStorage<NpcDeployment[]>('eclipse-npc-deployments', []);
  const [config, setConfig] = useSessionStorage<SimulationConfig>('eclipse-sim-config', { runs: 1000, dicePool: 600 });

  const errors = getValidationErrors(factionDeployments, npcDeployments, config, factions);
  const isValid = errors.length === 0;

  const handleRunSimulation = () => {
    if (!isValid) return;
    const resolvedFactions = factionDeployments
      .map(d => factions.find(f => f.id === d.factionId))
      .filter((f): f is Faction => f !== undefined);

    sessionStorage.setItem(
      'eclipse-battle-setup',
      JSON.stringify({ factionDeployments, npcDeployments, config, factions: resolvedFactions })
    );
    navigate('/results');
  };

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
        <h2 className="text-2xl font-bold">Battle Sector Setup</h2>

        {factions.length === 0 && (
          <div className="bg-yellow-900/40 border border-yellow-700 text-yellow-300 rounded-lg px-4 py-3 text-sm">
            No factions configured. <Link to="/" className="underline hover:text-yellow-100">Go to Blueprints</Link> to set up factions first.
          </div>
        )}

        <BattleSetup
          factionDeployments={factionDeployments}
          npcDeployments={npcDeployments}
          availableFactions={factions}
          onFactionDeploymentsChange={setFactionDeployments}
          onNpcDeploymentsChange={setNpcDeployments}
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
                  setConfig(c => ({ ...c, runs: Math.max(1, parseInt(e.target.value, 10) || 1) }))
                }
                className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              {config.runs < 1 && (
                <p className="text-red-400 text-xs mt-1">Must be at least 1.</p>
              )}
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Dice Pool Size</label>
              <input
                type="number"
                min={6}
                step={6}
                value={config.dicePool}
                onChange={e =>
                  setConfig(c => ({ ...c, dicePool: Math.max(6, parseInt(e.target.value, 10) || 6) }))
                }
                className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
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
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors text-sm"
          >
            ▶ Run Simulation
          </button>
        </div>
    </div>
  );
}
