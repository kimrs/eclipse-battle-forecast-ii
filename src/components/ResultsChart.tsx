import { useRef, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import type { SimulationResults } from '../types/game';

interface ResultsChartProps {
  results: SimulationResults;
  nameMap: Record<string, string>;
}

export const PALETTE = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

interface ChartEntry {
  label: string;
  wins: number;
  pct: number;
  color: string;
}

function buildChartData(results: SimulationResults, nameMap: Record<string, string>): ChartEntry[] {
  const totalWins = results.summary.reduce((sum, s) => sum + s.wins, 0);
  return results.summary.map((s, i) => ({
    label: nameMap[s.factionId] ?? s.factionId,
    wins: s.wins,
    pct: totalWins > 0 ? s.wins / totalWins : 0,
    color: PALETTE[i % PALETTE.length],
  }));
}

function drawPieChart(
  container: HTMLDivElement,
  svg: SVGSVGElement,
  chartData: ChartEntry[],
) {
  const containerWidth = container.clientWidth || 400;
  const diameter = Math.min(Math.max(containerWidth * 0.7, 200), 350);
  const radius = diameter / 2;
  const svgHeight = diameter + 16;

  d3.select(svg).selectAll('*').remove();
  svg.setAttribute('viewBox', `0 0 ${containerWidth} ${svgHeight}`);
  svg.setAttribute('width', String(containerWidth));
  svg.setAttribute('height', String(svgHeight));

  // Ensure tooltip div exists inside container
  let tooltip = d3.select(container).select<HTMLDivElement>('.pie-tooltip');
  if (tooltip.empty()) {
    tooltip = d3.select(container)
      .append('div')
      .attr('class', 'pie-tooltip')
      .style('position', 'absolute')
      .style('background', 'rgba(17,24,39,0.95)')
      .style('color', '#f9fafb')
      .style('padding', '6px 10px')
      .style('border-radius', '6px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('display', 'none')
      .style('white-space', 'nowrap')
      .style('z-index', '10');
  }

  const g = d3.select(svg)
    .append('g')
    .attr('transform', `translate(${containerWidth / 2}, ${radius + 8})`);

  const pie = d3.pie<ChartEntry>().value(d => d.wins).sort(null);
  const arc = d3.arc<d3.PieArcDatum<ChartEntry>>()
    .innerRadius(0)
    .outerRadius(radius);
  const arcHover = d3.arc<d3.PieArcDatum<ChartEntry>>()
    .innerRadius(0)
    .outerRadius(radius + 8);

  const arcs = pie(chartData);

  const paths = g.selectAll<SVGPathElement, d3.PieArcDatum<ChartEntry>>('path')
    .data(arcs)
    .join('path')
    .attr('fill', d => d.data.color)
    .attr('stroke', '#1f2937')
    .attr('stroke-width', 2)
    .attr('cursor', 'pointer');

  // Animate segments from 0
  paths
    .transition()
    .duration(600)
    .ease(d3.easeCubicOut)
    .attrTween('d', function(d) {
      const i = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
      return (t: number) => arc(i(t) as d3.PieArcDatum<ChartEntry>) ?? '';
    });

  // Hover interactions (mouse)
  paths
    .on('mouseenter', function(_event, d) {
      d3.select(this).attr('d', arcHover(d) ?? arc(d) ?? '');
      tooltip
        .style('display', 'block')
        .text(`${d.data.label}: ${d.data.wins} wins (${(d.data.pct * 100).toFixed(1)}%)`);
    })
    .on('mousemove', function(event: MouseEvent) {
      const rect = container.getBoundingClientRect();
      tooltip
        .style('left', `${event.clientX - rect.left + 12}px`)
        .style('top', `${event.clientY - rect.top - 28}px`);
    })
    .on('mouseleave', function(_event, d) {
      d3.select(this).attr('d', arc(d) ?? '');
      tooltip.style('display', 'none');
    });

  // Touch interactions (tap to toggle tooltip)
  let activeTouch: d3.PieArcDatum<ChartEntry> | null = null;
  paths.on('touchstart', function(event: TouchEvent, d) {
    event.preventDefault();
    if (activeTouch === d) {
      // Tap same segment again: hide
      d3.select(this).attr('d', arc(d) ?? '');
      tooltip.style('display', 'none');
      activeTouch = null;
    } else {
      // Reset previous
      g.selectAll<SVGPathElement, d3.PieArcDatum<ChartEntry>>('path')
        .attr('d', dd => arc(dd) ?? '');
      // Expand tapped segment
      d3.select(this).attr('d', arcHover(d) ?? arc(d) ?? '');
      const touch = event.touches[0];
      const rect = container.getBoundingClientRect();
      tooltip
        .style('display', 'block')
        .text(`${d.data.label}: ${d.data.wins} wins (${(d.data.pct * 100).toFixed(1)}%)`)
        .style('left', `${touch.clientX - rect.left + 12}px`)
        .style('top', `${touch.clientY - rect.top - 40}px`);
      activeTouch = d;
    }
  });

  // Render percentage labels on segments large enough (> 8%)
  const labelArc = d3.arc<d3.PieArcDatum<ChartEntry>>()
    .innerRadius(radius * 0.55)
    .outerRadius(radius * 0.55);

  g.selectAll<SVGTextElement, d3.PieArcDatum<ChartEntry>>('text.pie-label')
    .data(arcs.filter(d => d.data.pct > 0.08))
    .join('text')
    .attr('class', 'pie-label')
    .attr('transform', d => `translate(${labelArc.centroid(d)})`)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'central')
    .attr('fill', '#fff')
    .attr('font-size', '12px')
    .attr('font-weight', '600')
    .attr('pointer-events', 'none')
    .attr('opacity', 0)
    .text(d => `${(d.data.pct * 100).toFixed(0)}%`)
    .transition()
    .delay(600)
    .duration(200)
    .attr('opacity', 1);
}

export function ResultsChart({ results, nameMap }: ResultsChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const totalRuns = results.config.runs;
  const chartData = useMemo(() => buildChartData(results, nameMap), [results, nameMap]);

  useEffect(() => {
    const svg = svgRef.current;
    const container = containerRef.current;
    if (!svg || !container || totalRuns === 0) return;

    const render = () => drawPieChart(container, svg, chartData);
    render();

    const observer = new ResizeObserver(render);
    observer.observe(container);
    return () => observer.disconnect();
  }, [totalRuns, chartData]);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
      <h3 className="text-lg font-semibold text-white mb-4">Win Probability</h3>
      {totalRuns === 0 ? (
        <p className="text-gray-400 text-sm">No simulation data available.</p>
      ) : (
        <>
          <div ref={containerRef} className="w-full relative">
            <svg ref={svgRef} className="w-full" />
          </div>
          <div className="mt-4 flex flex-col gap-1">
            {chartData.map((entry) => (
              <div key={entry.label} className="flex items-center gap-2 text-sm">
                <span
                  className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-gray-200">{entry.label}</span>
                <span className="text-gray-400 ml-auto">{(entry.pct * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
