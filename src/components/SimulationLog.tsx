import { useState } from 'react';
import { DIE_COLOR_CLASSES } from '../data/constants';
import type { SimulationRunResult, BattleEvent, DieColor, DieValue } from '../types/game';

interface SimulationLogProps {
  runs: SimulationRunResult[];
  nameMap: Record<string, string>;
  colorMap: Record<string, string>;
}

const PAGE_SIZE = 20;

function getFactionName(nameMap: Record<string, string>, id: string | null): string {
  if (id === null) return 'Draw';
  return nameMap[id] ?? id;
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

function DieChip({ color, value }: { color: DieColor; value: DieValue }) {
  const label = value === 'star' ? '\u2605' : value === 'blank' ? '\u00A0' : String(value);
  return (
    <span className={`inline-block text-[10px] leading-none px-1 py-0.5 rounded font-bold min-w-[1.2em] text-center ${DIE_COLOR_CLASSES[color]}`}>
      {label}
    </span>
  );
}

function EventRow({ event, nameMap, showDice, colorMap }: { event: BattleEvent; nameMap: Record<string, string>; showDice: boolean; colorMap: Record<string, string> }) {
  const name = getFactionName(nameMap, event.factionId);
  const factionColor = colorMap[event.factionId];
  const targetColor = colorMap[event.targetFactionId];
  const isNpcTarget = event.targetFactionId.startsWith('npc-');
  const targetName = getFactionName(nameMap, event.targetFactionId);
  const phaseLabel = event.phase === 'missile' ? 'Mis' : `R${event.round}`;
  const phaseLabelFull = event.phase === 'missile' ? 'Missile' : `Round ${event.round}`;
  const dmgLabel = event.hits > 0 ? `${event.damageDealt} dmg` : 'miss';
  const formatKills = (kills: typeof event.kills) =>
    kills.map(k => `${k.count}x ${isNpcTarget ? targetName : k.type}`).join(', ');
  const killLabel = event.kills.length > 0
    ? `, killed ${formatKills(event.kills)}`
    : '';
  return (
    <div className="flex flex-col gap-0.5 py-1 border-b border-gray-800 last:border-0">
      {/* Mobile: compact two-line layout */}
      <div className="sm:hidden text-xs">
        <span className="text-gray-500">{phaseLabel}</span>
        {' '}
        <span style={factionColor ? { color: factionColor } : undefined} className={factionColor ? undefined : 'text-blue-300'}>{name}</span>
        {' '}
        <span className="text-gray-500">{event.shipCount}x {event.shipType}</span>
        {' → '}
        <span className="text-gray-400">{dmgLabel}</span>
        {event.kills.length > 0 && (
          <span style={targetColor ? { color: targetColor } : undefined} className={targetColor ? undefined : 'text-red-400'}>{killLabel}</span>
        )}
      </div>
      {/* Desktop: spread layout */}
      <div className="hidden sm:flex items-center gap-2 flex-wrap">
        <span className="text-gray-500 text-[10px] uppercase w-16 shrink-0">{phaseLabelFull}</span>
        <span style={factionColor ? { color: factionColor } : undefined} className={factionColor ? 'text-xs' : 'text-blue-300 text-xs'}>{name}</span>
        <span className="text-gray-500 text-xs">
          {event.shipCount}x {event.shipType}
        </span>
        <span className="text-gray-600 text-[10px]">{dmgLabel}</span>
        {event.kills.length > 0 && (
          <span style={targetColor ? { color: targetColor } : undefined} className={targetColor ? 'text-[10px]' : 'text-red-400 text-[10px]'}>
            destroyed {formatKills(event.kills)}
          </span>
        )}
      </div>
      {showDice && (
        <div className="flex gap-0.5 flex-wrap ml-0 sm:ml-16">
          {event.dice.map((d, i) => (
            <DieChip key={i} color={d.color} value={d.value} />
          ))}
        </div>
      )}
    </div>
  );
}

function RunRow({
  index,
  run,
  nameMap,
  expanded,
  onToggle,
  colorMap,
}: {
  index: number;
  run: SimulationRunResult;
  nameMap: Record<string, string>;
  expanded: boolean;
  onToggle: () => void;
  colorMap: Record<string, string>;
}) {
  const [showDice, setShowDice] = useState(true);
  const winnerName = getFactionName(nameMap, run.winnerId);
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
            <span className="font-semibold" style={run.winnerId && colorMap[run.winnerId] ? { color: colorMap[run.winnerId] } : { color: '#93c5fd' }}>{winnerName}</span>
            <span className="text-gray-400">wins</span>
            <span className="text-gray-300 hidden sm:inline">({survivorSummary})</span>
          </>
        ) : (
          <span className="text-yellow-400 font-semibold">Draw</span>
        )}
      </button>

      {expanded && (
        <div className="bg-gray-900 px-3 sm:px-4 py-3 font-mono text-xs space-y-1 border-t border-gray-700">
          {run.events && run.events.length > 0 ? (
            <div className="space-y-0">
              <div className="flex justify-end mb-1">
                <button
                  onClick={() => setShowDice(v => !v)}
                  className="text-[10px] text-gray-500 hover:text-gray-300 px-2 py-0.5 border border-gray-700 rounded transition-colors"
                >
                  {showDice ? 'hide dice' : 'show dice'}
                </button>
              </div>
              {run.events.map((event, i) => (
                <EventRow key={i} event={event} nameMap={nameMap} showDice={showDice} colorMap={colorMap} />
              ))}
              <div className="border-t border-gray-700 mt-2 pt-2">
                {run.survivors.length === 0 ? (
                  <p className="text-gray-500">No survivors — mutual destruction.</p>
                ) : (
                  run.survivors.map(({ factionId, ships }) => (
                    <div key={factionId} className="text-gray-300">
                      <span className="text-gray-400">{getFactionName(nameMap, factionId)} survivors:</span>{' '}
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
                    <span className="text-gray-400">{getFactionName(nameMap, factionId)}:</span>{' '}
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

export function SimulationLog({ runs, nameMap, colorMap }: SimulationLogProps) {
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
              nameMap={nameMap}
              expanded={isExpanded(i)}
              onToggle={() => handleToggle(i)}
              colorMap={colorMap}
            />
          ))}

          {visibleCount < runs.length && (
            <button
              onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
              className="w-full mt-2 py-3 text-sm text-gray-400 hover:text-gray-200 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              Show More ({runs.length - visibleCount} remaining)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
