import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  Faction,
  FactionDeployment,
  NpcDeployment,
  SimulationConfig,
  SimulationResults,
} from '../types/game';
import { SHIP_TYPES, SHIP_TYPE_LABELS, FACTION_COLORS } from '../data/constants';
import { ResultsChart } from '../components/ResultsChart';
import { SimulationLog } from '../components/SimulationLog';

export interface BattleSetupData {
  factionDeployments: FactionDeployment[];
  npcDeployments: NpcDeployment[];
  config: SimulationConfig;
  factions: Faction[];
}

function buildNameMap(
  deployments: FactionDeployment[],
  npcs: NpcDeployment[],
  factions: Faction[],
): Record<string, string> {
  const map: Record<string, string> = {};

  for (const dep of deployments) {
    const faction = factions.find(f => f.id === dep.factionId);
    map[dep.id] = faction?.name ?? dep.factionId;
  }

  // NPC names
  for (let i = 0; i < npcs.length; i++) {
    const npcId = `npc-${npcs[i].type}-${i}`;
    const raw = npcs[i].type;
    map[npcId] = raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  return map;
}

interface ResultsSectionProps {
  setup: BattleSetupData | null;
}

export function ResultsSection({ setup }: ResultsSectionProps) {
  const [results, setResults] = useState<SimulationResults | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sortCol, setSortCol] = useState<'wins' | 'winPct'>('wins');
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

  // Run when setup changes to a new non-null value
  useEffect(() => {
    if (setup) runSim();
  }, [setup, runSim]);

  // Clean up worker on unmount
  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const handleSort = (col: 'wins' | 'winPct') => {
    if (sortCol === col) {
      setSortDir(d => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  };

  // Use config.runs for accurate totals (runs array may be limited for memory)
  const totalRuns = results?.config.runs ?? 0;

  // Build name map from deployment IDs to display names
  const nameMap = setup
    ? buildNameMap(setup.factionDeployments, setup.npcDeployments, setup.factions)
    : {};

  // Build display rows including NPCs
  const allIds: string[] = results
    ? results.summary.map(s => s.factionId)
    : [];

  // Build color map: deployment ID → chart color from faction's stored color
  const colorMap: Record<string, string> = {};
  if (setup) {
    for (const dep of setup.factionDeployments) {
      const faction = setup.factions.find(f => f.id === dep.factionId);
      if (faction) colorMap[dep.id] = faction.color;
    }
    // NPC colors from palette
    let npcColorIdx = 0;
    for (let i = 0; i < setup.npcDeployments.length; i++) {
      const npcId = `npc-${setup.npcDeployments[i].type}-${i}`;
      colorMap[npcId] = FACTION_COLORS[(setup.factionDeployments.length + npcColorIdx) % FACTION_COLORS.length];
      npcColorIdx++;
    }
  }

  const tableRows = allIds.map(id => {
    const sumEntry = results!.summary.find(s => s.factionId === id);
    const wins = sumEntry?.wins ?? 0;
    const winPct = totalRuns > 0 ? (wins / totalRuns) * 100 : 0;
    const avgSurvivors = sumEntry?.avgSurvivors ?? {
      interceptor: 0,
      cruiser: 0,
      dreadnought: 0,
      starbase: 0,
    };
    return { id, wins, winPct, avgSurvivors };
  });

  const sortedRows = [...tableRows].sort((a, b) => {
    const sign = sortDir === 'desc' ? -1 : 1;
    if (sortCol === 'wins') return sign * (a.wins - b.wins);
    return sign * (a.winPct - b.winPct);
  });

  const SortHeader = ({
    col,
    label,
  }: {
    col: 'wins' | 'winPct';
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
    <section id="results" className="border-t border-gray-700 pt-6">
      <div className="max-w-3xl mx-auto p-3 sm:p-4 space-y-4 sm:space-y-6">
        {/* Section title */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold">
            Results
            {results && (
              <span className="ml-2 text-sm sm:text-lg font-normal text-gray-400">
                ({totalRuns} runs)
              </span>
            )}
          </h2>
        </div>

        {/* No setup data */}
        {!setup && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-center text-gray-400 text-sm">
            Run a simulation to see results here.
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
                <ResultsChart results={results} nameMap={nameMap} colorMap={colorMap} />

                {/* Statistics — card layout on mobile */}
                <div className="sm:hidden space-y-3">
                  <h3 className="text-base font-semibold text-white">Per-Faction Statistics</h3>
                  {sortedRows.map(row => {
                    const survivorParts = SHIP_TYPES
                      .filter(t => row.avgSurvivors[t] > 0)
                      .map(t => `${row.avgSurvivors[t].toFixed(1)} ${SHIP_TYPE_LABELS[t].abbreviated}`);
                    return (
                      <div key={row.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                        <div className="font-medium text-white mb-1 flex items-center gap-2">
                          <span className="inline-block w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: colorMap[row.id] }} />
                          {nameMap[row.id] ?? row.id}
                        </div>
                        <div className="text-sm text-gray-300 space-y-0.5">
                          <div>Wins: {row.wins} ({row.winPct.toFixed(1)}%)</div>
                          <div>Survivors: {survivorParts.length > 0 ? survivorParts.join(', ') : '—'}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Statistics — table layout on desktop */}
                <div className="hidden sm:block bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-700">
                    <h3 className="text-lg font-semibold text-white">Per-Faction Statistics</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-700/50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">
                            Faction
                          </th>
                          <SortHeader col="wins" label="Wins" />
                          <SortHeader col="winPct" label="Win %" />
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">
                            Avg Survivors
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedRows.map((row, i) => {
                          const survivorParts = SHIP_TYPES
                            .filter(t => row.avgSurvivors[t] > 0)
                            .map(t => `${row.avgSurvivors[t].toFixed(1)} ${SHIP_TYPE_LABELS[t].abbreviated}`);
                          return (
                            <tr
                              key={row.id}
                              className={i % 2 === 0 ? 'bg-gray-800' : 'bg-gray-800/50'}
                            >
                              <td className="px-4 py-2.5 text-white font-medium">
                                <span className="flex items-center gap-2">
                                  <span className="inline-block w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: colorMap[row.id] }} />
                                  {nameMap[row.id] ?? row.id}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-gray-300">{row.wins}</td>
                              <td className="px-4 py-2.5 text-gray-300">
                                {row.winPct.toFixed(1)}%
                              </td>
                              <td className="px-4 py-2.5 text-gray-300 text-xs">
                                {survivorParts.length > 0 ? survivorParts.join(', ') : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Simulation log */}
                <SimulationLog runs={results.runs} nameMap={nameMap} colorMap={colorMap} />
              </>
            )}
          </>
        )}

        {/* Re-run button */}
        {setup && (
          <div>
            <button
              onClick={runSim}
              disabled={running}
              className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors text-sm"
            >
              ▶ Re-run Simulation
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
