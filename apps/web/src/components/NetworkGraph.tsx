import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { EntityGraph } from '../lib/api';

interface NetworkGraphProps {
  graph: EntityGraph;
  width?: number;
  height?: number;
  onNodeClick?: (nodeId: string) => void;
}

interface D3Node extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  type: string;
  documentCount: number;
}

interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  type: string;
  weight: number;
}

export default function NetworkGraph({
  graph,
  width = 800,
  height = 600,
  onNodeClick,
}: NetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !graph.nodes.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const nodes: D3Node[] = graph.nodes.map((n) => ({ ...n }));
    const links: D3Link[] = graph.edges.map((e) => ({
      source: e.source,
      target: e.target,
      type: e.type,
      weight: e.weight,
    }));

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        'link',
        d3
          .forceLink<D3Node, D3Link>(links)
          .id((d) => d.id)
          .distance(100)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(40));

    const g = svg.append('g');

    // Zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    svg.call(zoom);

    // Links
    const link = g
      .append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', (d) => Math.sqrt(d.weight));

    // Node groups
    const node = g
      .append('g')
      .selectAll<SVGGElement, D3Node>('g')
      .data(nodes)
      .join('g')
      .call(
        d3
          .drag<SVGGElement, D3Node>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }) as any
      );

    // Node circles
    const getColor = (type: string) => {
      const colors: Record<string, string> = {
        person: '#3b82f6',
        organization: '#10b981',
        location: '#f59e0b',
        date: '#8b5cf6',
        financial: '#ef4444',
        event: '#ec4899',
      };
      return colors[type] || '#6b7280';
    };

    node
      .append('circle')
      .attr('r', (d) => Math.max(8, Math.min(20, 5 + d.documentCount)))
      .attr('fill', (d) => getColor(d.type))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('click', (_, d) => {
        if (onNodeClick) onNodeClick(d.id);
      });

    // Node labels
    node
      .append('text')
      .text((d) => d.name)
      .attr('x', 0)
      .attr('y', (d) => Math.max(8, Math.min(20, 5 + d.documentCount)) + 15)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', '#374151');

    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as D3Node).x!)
        .attr('y1', (d) => (d.source as D3Node).y!)
        .attr('x2', (d) => (d.target as D3Node).x!)
        .attr('y2', (d) => (d.target as D3Node).y!);

      node.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [graph, width, height, onNodeClick]);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
      <svg ref={svgRef} width={width} height={height} className="w-full" />
    </div>
  );
}
