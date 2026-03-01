import { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import type { SimulationResults, Faction } from '../types/game';

interface ResultsChartProps {
  results: SimulationResults;
  factions: Faction[];
}

const PALETTE = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
const DRAW_COLOR = '#6b7280';

interface ChartEntry {
  label: string;
  wins: number;
  pct: number;
  color: string;
}

function buildChartData(results: SimulationResults, factions: Faction[]): ChartEntry[] {
  const totalRuns = results.runs.length;
  const drawCount = results.runs.filter(r => r.winnerId === null).length;
  return [
    ...factions.map((f, i) => {
      const wins = results.summary.find(s => s.factionId === f.id)?.wins ?? 0;
      return {
        label: f.name,
        wins,
        pct: totalRuns > 0 ? wins / totalRuns : 0,
        color: PALETTE[i % PALETTE.length],
      };
    }),
    {
      label: 'Draw',
      wins: drawCount,
      pct: totalRuns > 0 ? drawCount / totalRuns : 0,
      color: DRAW_COLOR,
    },
  ];
}

function drawChart(
  svg: SVGSVGElement,
  containerWidth: number,
  chartData: ChartEntry[],
) {
  const margin = { top: 12, right: 72, bottom: 12, left: 120 };
  const barHeight = 32;
  const barGap = 10;
  const height = chartData.length * (barHeight + barGap) + margin.top + margin.bottom;

  d3.select(svg).selectAll('*').remove();
  svg.setAttribute('viewBox', `0 0 ${containerWidth} ${height}`);
  svg.setAttribute('width', String(containerWidth));
  svg.setAttribute('height', String(height));

  const innerWidth = containerWidth - margin.left - margin.right;
  const x = d3.scaleLinear().domain([0, 1]).range([0, innerWidth]);
  const g = d3.select(svg)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  chartData.forEach((d, i) => {
    const y = i * (barHeight + barGap);

    // Row label
    g.append('text')
      .attr('x', -8)
      .attr('y', y + barHeight / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .attr('fill', '#d1d5db')
      .attr('font-size', '13')
      .text(d.label);

    // Background track
    g.append('rect')
      .attr('x', 0)
      .attr('y', y)
      .attr('width', innerWidth)
      .attr('height', barHeight)
      .attr('fill', '#374151')
      .attr('rx', 4);

    // Value bar
    const barWidth = Math.max(0, x(d.pct));
    if (barWidth > 0) {
      g.append('rect')
        .attr('x', 0)
        .attr('y', y)
        .attr('width', barWidth)
        .attr('height', barHeight)
        .attr('fill', d.color)
        .attr('rx', 4);
    }

    // Percentage label
    g.append('text')
      .attr('x', innerWidth + 6)
      .attr('y', y + barHeight / 2)
      .attr('dy', '0.35em')
      .attr('fill', '#f9fafb')
      .attr('font-size', '13')
      .text(`${(d.pct * 100).toFixed(1)}%`);

    // Hover tooltip overlay
    g.append('rect')
      .attr('x', 0)
      .attr('y', y)
      .attr('width', innerWidth)
      .attr('height', barHeight)
      .attr('fill', 'transparent')
      .attr('cursor', 'default')
      .append('title')
      .text(`${d.label}: ${d.wins} wins (${(d.pct * 100).toFixed(1)}%)`);
  });
}

export function ResultsChart({ results, factions }: ResultsChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const totalRuns = results.runs.length;
  const chartData = buildChartData(results, factions);

  useEffect(() => {
    const svg = svgRef.current;
    const container = containerRef.current;
    if (!svg || !container || totalRuns === 0) return;

    const render = () => {
      const width = container.clientWidth || 400;
      drawChart(svg, width, chartData);
    };

    render();

    const observer = new ResizeObserver(render);
    observer.observe(container);
    return () => observer.disconnect();
  }, [results, factions, totalRuns, chartData]);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
      <h3 className="text-lg font-semibold text-white mb-4">Win Probability</h3>
      {totalRuns === 0 ? (
        <p className="text-gray-400 text-sm">No simulation data available.</p>
      ) : (
        <div ref={containerRef} className="w-full">
          <svg ref={svgRef} className="w-full" />
        </div>
      )}
    </div>
  );
}
