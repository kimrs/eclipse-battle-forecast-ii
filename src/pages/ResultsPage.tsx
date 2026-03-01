import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import type {
  Faction,
  FactionDeployment,
  NpcDeployment,
  SimulationConfig,
  SimulationResults,
  ShipType,
} from '../types/game';
import { ResultsChart } from '../components/ResultsChart';
import { SimulationLog } from '../components/SimulationLog';

interface BattleSetupData {
  factionDeployments: FactionDeployment[];
  npcDeployments: NpcDeployment[];
  config: SimulationConfig;
  factions: Faction[];
}

const SHIP_LABELS: Record<ShipType, string> = {
  interceptor: 'Int',
  cruiser: 'Cru',
  dreadnought: 'Drd',
  starbase: 'SB',
};

function getFactionDisplayName(id: string, factions: Faction[]): string {
  const faction = factions.find(f => f.id === id);
  if (faction) return faction.name;
  // NPC ids: "npc-ancient-0", "npc-guardian-1", "npc-gcds-0"
  const match = id.match(/^npc-(.+)-\d+$/);
  if (match) return match[1].charAt(0).toUpperCase() + match[1].slice(1);
  return id;
}

function readSetupFromStorage(): BattleSetupData | null {
  try {
    const raw = sessionStorage.getItem('eclipse-battle-setup');
    if (!raw) return null;
    return JSON.parse(raw) as BattleSetupData;
  } catch {
    return null;
  }
}

export function ResultsPage() {
  const [setup] = useState<BattleSetupData | null>(() => readSetupFromStorage());
  const [results, setResults] = useState<SimulationResults | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sortCol, setSortCol] = useState<'wins' | 'winPct' | 'damage'>('wins');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const workerRef = useRef<Worker | null>(null);

  const runSim = useCallback(() => {
    if (!setup) return;
    setResults(null);
    setRunning(true);
    setProgress(0);

    // Terminate any existing worker
    workerRef.current?.terminate();

    const worker = new Worker(
      new URL('../engine/simulationWorker.ts', import.meta.url),
      { type: 'module' },
    );
    workerRef.current = worker;

    worker.onmessage = (e) => {
      if (e.data.type === 'progress') {
        setProgress(Math.round((e.data.completed / e.data.total) * 100));
      } else if (e.data.type === 'complete') {
        setResults(e.data.results);
        setRunning(false);
        setProgress(100);
        worker.terminate();
        workerRef.current = null;
      }
    };

    worker.onerror = () => {
      setRunning(false);
      worker.terminate();
      workerRef.current = null;
    };

    const factionsRecord: Record<string, Faction> = {};
    for (const f of setup.factions) factionsRecord[f.id] = f;

    worker.postMessage({
      setup: {
        factions: setup.factionDeployments,
        npcs: setup.npcDeployments,
      },
      factions: factionsRecord,
      config: setup.config,
    });
  }, [setup]);

  // Run on mount
  useEffect(() => {
    if (setup) runSim();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clean up worker on unmount
  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const handleSort = (col: 'wins' | 'winPct' | 'damage') => {
    if (sortCol === col) {
      setSortDir(d => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  };

  // Use config.runs for accurate totals (runs array may be limited for memory)
  const totalRuns = results?.config.runs ?? 0;
  const allFactions: Faction[] = setup?.factions ?? [];

  // Build display rows including NPCs
  const allIds: string[] = results
    ? results.summary.map(s => s.factionId)
    : [];

  const tableRows = allIds.map(id => {
    const sumEntry = results!.summary.find(s => s.factionId === id);
    const wins = sumEntry?.wins ?? 0;
    const winPct = totalRuns > 0 ? (wins / totalRuns) * 100 : 0;
    const avgDmg = sumEntry?.avgDamageDealt ?? 0;
    const avgSurvivors = sumEntry?.avgSurvivors ?? {
      interceptor: 0,
      cruiser: 0,
      dreadnought: 0,
      starbase: 0,
    };
    return { id, wins, winPct, avgDmg, avgSurvivors };
  });

  // Compute draws from summary (accurate even with limited runs array)
  const totalWins = results ? results.summary.reduce((sum, s) => sum + s.wins, 0) : 0;
  const drawCount = totalRuns - totalWins;

  const sortedRows = [...tableRows].sort((a, b) => {
    const sign = sortDir === 'desc' ? -1 : 1;
    if (sortCol === 'wins') return sign * (a.wins - b.wins);
    if (sortCol === 'winPct') return sign * (a.winPct - b.winPct);
    return sign * (a.avgDmg - b.avgDmg);
  });

  const SortHeader = ({
    col,
    label,
  }: {
    col: 'wins' | 'winPct' | 'damage';
    label: string;
  }) => (
    <th
      onClick={() => handleSort(col)}
      className="px-3 sm:px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase cursor-pointer select-none hover:text-white transition-colors"
    >
      {label}
      {sortCol === col && (
        <span className="ml-1 text-blue-400">{sortDir === 'desc' ? '↓' : '↑'}</span>
      )}
    </th>
  );

  return (
    <div className="max-w-3xl mx-auto p-3 sm:p-4 space-y-4 sm:space-y-6">
        {/* Page title */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold">
            Results
            {results && (
              <span className="ml-2 text-sm sm:text-lg font-normal text-gray-400">
                ({totalRuns} runs)
              </span>
            )}
          </h2>
          <Link
            to="/battle"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            ← Back
          </Link>
        </div>

        {/* No setup data */}
        {!setup && (
          <div className="bg-yellow-900/40 border border-yellow-700 text-yellow-300 rounded-lg px-4 py-4 text-sm">
            No battle setup found.{' '}
            <Link to="/battle" className="underline hover:text-yellow-100">
              Configure a battle first.
            </Link>
          </div>
        )}

        {/* Loading indicator with progress bar */}
        {running && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 flex flex-col items-center gap-3">
            <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
              <div
                className="bg-blue-500 h-3 rounded-full transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-gray-300 text-sm">
              Simulating… {progress}%
              <span className="text-gray-500 ml-1">
                ({setup?.config.runs ?? 0} runs)
              </span>
            </p>
          </div>
        )}

        {/* Results */}
        {results && !running && (
          <>
            {/* Empty state */}
            {totalRuns === 0 ? (
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-center text-gray-400 text-sm">
                No simulations ran. Check your configuration.
              </div>
            ) : (
              <>
                {/* Win probability chart */}
                <ResultsChart results={results} factions={allFactions} />

                {/* Statistics table */}
                <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-700">
                    <h3 className="text-base sm:text-lg font-semibold text-white">Per-Faction Statistics</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-700/50">
                        <tr>
                          <th className="px-3 sm:px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">
                            Faction
                          </th>
                          <SortHeader col="wins" label="Wins" />
                          <SortHeader col="winPct" label="Win %" />
                          <th className="px-3 sm:px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">
                            Avg Survivors
                          </th>
                          <SortHeader col="damage" label="Avg Dmg" />
                        </tr>
                      </thead>
                      <tbody>
                        {sortedRows.map((row, i) => {
                          const survivorParts = (
                            ['interceptor', 'cruiser', 'dreadnought', 'starbase'] as ShipType[]
                          )
                            .filter(t => row.avgSurvivors[t] > 0)
                            .map(t => `${row.avgSurvivors[t].toFixed(1)} ${SHIP_LABELS[t]}`);
                          return (
                            <tr
                              key={row.id}
                              className={i % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'}
                            >
                              <td className="px-3 sm:px-4 py-2.5 text-white font-medium">
                                {getFactionDisplayName(row.id, allFactions)}
                              </td>
                              <td className="px-3 sm:px-4 py-2.5 text-gray-300">{row.wins}</td>
                              <td className="px-3 sm:px-4 py-2.5 text-gray-300">
                                {row.winPct.toFixed(1)}%
                              </td>
                              <td className="px-3 sm:px-4 py-2.5 text-gray-300 text-xs">
                                {survivorParts.length > 0 ? survivorParts.join(', ') : '—'}
                              </td>
                              <td className="px-3 sm:px-4 py-2.5 text-gray-300">
                                {row.avgDmg.toFixed(1)}
                              </td>
                            </tr>
                          );
                        })}
                        {/* Draw row */}
                        <tr className={sortedRows.length % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'}>
                          <td className="px-3 sm:px-4 py-2.5 text-yellow-400 font-medium">Draw</td>
                          <td className="px-3 sm:px-4 py-2.5 text-gray-300">{drawCount}</td>
                          <td className="px-3 sm:px-4 py-2.5 text-gray-300">
                            {totalRuns > 0 ? ((drawCount / totalRuns) * 100).toFixed(1) : '0.0'}%
                          </td>
                          <td className="px-3 sm:px-4 py-2.5 text-gray-500">—</td>
                          <td className="px-3 sm:px-4 py-2.5 text-gray-500">—</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Simulation log */}
                <SimulationLog runs={results.runs} factions={allFactions} />
              </>
            )}
          </>
        )}

        {/* Action buttons */}
        {setup && (
          <div className="flex gap-3">
            <button
              onClick={runSim}
              disabled={running}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors text-sm"
            >
              Re-run
            </button>
            <Link
              to="/battle"
              className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl transition-colors text-sm"
            >
              Modify Setup
            </Link>
          </div>
        )}
    </div>
  );
}
