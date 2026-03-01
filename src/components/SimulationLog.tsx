import { useState } from 'react';
import type { SimulationRunResult, Faction, BattleEvent, DieColor, DieValue } from '../types/game';

interface SimulationLogProps {
  runs: SimulationRunResult[];
  factions: Faction[];
}

const PAGE_SIZE = 20;

function getFactionName(factions: Faction[], id: string | null): string {
  if (id === null) return 'Draw';
  const faction = factions.find(f => f.id === id);
  if (faction) return faction.name;
  // NPC ids like "npc-ancient-0"
  return id.replace(/^npc-/, '').replace(/-\d+$/, '');
}

function formatSurvivors(
  run: SimulationRunResult,
  winnerId: string | null,
): string {
  if (winnerId === null) return 'mutual destruction';
  const winnerSurvivors = run.survivors.find(s => s.factionId === winnerId);
  if (!winnerSurvivors || winnerSurvivors.ships.length === 0) return 'no survivors';
  return winnerSurvivors.ships
    .map(s => `${s.count} ${s.type}`)
    .join(', ');
}

const DIE_BG: Record<DieColor, string> = {
  yellow: 'bg-yellow-400 text-yellow-900',
  orange: 'bg-orange-400 text-orange-900',
  blue: 'bg-blue-500 text-white',
  red: 'bg-red-500 text-white',
  pink: 'bg-pink-400 text-pink-900',
};

function DieChip({ color, value }: { color: DieColor; value: DieValue }) {
  const label = value === 'star' ? '\u2605' : value === 'blank' ? '\u00D8' : String(value);
  return (
    <span className={`inline-block text-[10px] leading-none px-1 py-0.5 rounded font-bold ${DIE_BG[color]}`}>
      {label}
    </span>
  );
}

function EventRow({ event, factions }: { event: BattleEvent; factions: Faction[] }) {
  const name = getFactionName(factions, event.factionId);
  const phaseLabel = event.phase === 'missile' ? 'Missile' : `Round ${event.round}`;
  return (
    <div className="flex flex-col gap-0.5 py-1 border-b border-gray-800 last:border-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-gray-500 text-[10px] uppercase w-16 shrink-0">{phaseLabel}</span>
        <span className="text-blue-300 text-xs">{name}</span>
        <span className="text-gray-500 text-xs">
          {event.shipCount}x {event.shipType}
        </span>
        <span className="text-gray-600 text-[10px]">
          {event.hits > 0
            ? `${event.damageDealt} dmg`
            : 'miss'}
        </span>
        {event.kills.length > 0 && (
          <span className="text-red-400 text-[10px]">
            destroyed {event.kills.map(k => `${k.count}x ${k.type}`).join(', ')}
          </span>
        )}
      </div>
      <div className="flex gap-0.5 flex-wrap ml-16">
        {event.dice.map((d, i) => (
          <DieChip key={i} color={d.color} value={d.value} />
        ))}
      </div>
    </div>
  );
}

function RunRow({
  index,
  run,
  factions,
  expanded,
  onToggle,
}: {
  index: number;
  run: SimulationRunResult;
  factions: Faction[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const winnerName = getFactionName(factions, run.winnerId);
  const survivorSummary = formatSurvivors(run, run.winnerId);

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-750 text-left transition-colors text-sm"
      >
        <span className="text-gray-400 shrink-0">{expanded ? '\u25BC' : '\u25B6'}</span>
        <span className="text-gray-200 font-mono">
          Run #{index + 1}:
        </span>
        {run.winnerId !== null ? (
          <>
            <span className="text-blue-300 font-semibold">{winnerName}</span>
            <span className="text-gray-400">wins</span>
            <span className="text-gray-300">({survivorSummary})</span>
          </>
        ) : (
          <span className="text-yellow-400 font-semibold">Draw</span>
        )}
      </button>

      {expanded && (
        <div className="bg-gray-900 px-4 py-3 font-mono text-xs space-y-1 border-t border-gray-700">
          {run.events && run.events.length > 0 ? (
            <div className="space-y-0">
              {run.events.map((event, i) => (
                <EventRow key={i} event={event} factions={factions} />
              ))}
              <div className="border-t border-gray-700 mt-2 pt-2">
                {run.survivors.length === 0 ? (
                  <p className="text-gray-500">No survivors — mutual destruction.</p>
                ) : (
                  run.survivors.map(({ factionId, ships }) => (
                    <div key={factionId} className="text-gray-300">
                      <span className="text-gray-400">{getFactionName(factions, factionId)} survivors:</span>{' '}
                      {ships.length === 0
                        ? 'none'
                        : ships.map(s => `${s.count}\u00D7 ${s.type}`).join(', ')}
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <>
              {run.survivors.length === 0 ? (
                <p className="text-gray-500">No survivors — mutual destruction.</p>
              ) : (
                run.survivors.map(({ factionId, ships }) => (
                  <div key={factionId} className="text-gray-300">
                    <span className="text-gray-400">{getFactionName(factions, factionId)}:</span>{' '}
                    {ships.length === 0
                      ? 'no ships'
                      : ships.map(s => `${s.count}\u00D7 ${s.type}`).join(', ')}
                  </div>
                ))
              )}
              <div className="text-gray-600 mt-1">
                Detailed log not available for this run.
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function SimulationLog({ runs, factions }: SimulationLogProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [expandedSet, setExpandedSet] = useState<Set<number>>(new Set());
  const [allExpanded, setAllExpanded] = useState(false);

  const visibleRuns = runs.slice(0, visibleCount);

  const handleToggle = (index: number) => {
    setExpandedSet(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    setAllExpanded(true);
    setExpandedSet(new Set(Array.from({ length: visibleCount }, (_, i) => i)));
  };

  const handleCollapseAll = () => {
    setAllExpanded(false);
    setExpandedSet(new Set());
  };

  const isExpanded = (i: number) => allExpanded || expandedSet.has(i);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white">
          Simulation Log <span className="text-gray-400 font-normal text-sm">({runs.length} runs)</span>
        </h3>
        <div className="flex gap-2 text-sm">
          <button
            onClick={allExpanded ? handleCollapseAll : handleExpandAll}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
          >
            {allExpanded ? 'Collapse All' : 'Expand All'}
          </button>
        </div>
      </div>

      {runs.length === 0 ? (
        <p className="text-gray-400 text-sm">No runs to display.</p>
      ) : (
        <div className="space-y-1.5">
          {visibleRuns.map((run, i) => (
            <RunRow
              key={i}
              index={i}
              run={run}
              factions={factions}
              expanded={isExpanded(i)}
              onToggle={() => handleToggle(i)}
            />
          ))}

          {visibleCount < runs.length && (
            <button
              onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
              className="w-full mt-2 py-2 text-sm text-gray-400 hover:text-gray-200 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              Show More ({runs.length - visibleCount} remaining)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
