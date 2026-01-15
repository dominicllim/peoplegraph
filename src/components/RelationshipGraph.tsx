'use client';

import { useEffect, useState, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Contact } from '@/types';

const CONTACTS_KEY = 'peoplegraph_contacts';

interface GraphNode {
  id: string;
  name: string;
  val: number; // node size
  isCenter?: boolean;
  color?: string;
}

interface GraphLink {
  source: string;
  target: string;
  strength: number;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export default function RelationshipGraph({ 
  onNodeClick 
}: { 
  onNodeClick?: (contact: Contact | null) => void 
}) {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Build graph data from contacts
  useEffect(() => {
    const stored = localStorage.getItem(CONTACTS_KEY);
    const contacts: Contact[] = stored ? JSON.parse(stored) : [];

    // Center node (you)
    const centerNode: GraphNode = {
      id: 'center',
      name: 'You',
      val: 20,
      isCenter: true,
      color: '#a855f7', // purple
    };

    // Contact nodes
    const contactNodes: GraphNode[] = contacts.map((contact) => {
      // Size based on interaction count (min 5, max 15)
      const size = Math.min(15, Math.max(5, contact.interaction_count * 2));
      
      return {
        id: contact.id,
        name: contact.name,
        val: size,
        color: '#3b82f6', // blue
      };
    });

    // Links from center to each contact
    const links: GraphLink[] = contacts.map((contact) => {
      // Strength based on recency (more recent = stronger = closer)
      const daysSinceInteraction = Math.floor(
        (Date.now() - new Date(contact.last_interaction).getTime()) / (1000 * 60 * 60 * 24)
      );
      const strength = Math.max(0.1, 1 - daysSinceInteraction * 0.05);

      return {
        source: 'center',
        target: contact.id,
        strength,
      };
    });

    setGraphData({
      nodes: [centerNode, ...contactNodes],
      links,
    });
  }, []);

  const handleNodeClick = (node: GraphNode) => {
    if (node.isCenter || !onNodeClick) return;
    
    const stored = localStorage.getItem(CONTACTS_KEY);
    const contacts: Contact[] = stored ? JSON.parse(stored) : [];
    const contact = contacts.find((c) => c.id === node.id) || null;
    
    // Dispatch a custom event to force parent update
    window.dispatchEvent(new Event('resize'));
    
    onNodeClick(contact);
};

  return (
    <div ref={containerRef} className="w-full h-full min-h-[400px] bg-zinc-950 rounded-lg">
      <ForceGraph2D
        graphData={graphData}
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor="#09090b"
        nodeLabel="name"
        nodeVal="val"
        nodeColor={(node: GraphNode) => node.color || '#3b82f6'}
        nodeCanvasObject={(node: GraphNode, ctx, globalScale) => {
          const label = node.name;
          const fontSize = node.isCenter ? 14 / globalScale : 12 / globalScale;
          const nodeSize = node.val || 5;

          // Draw circle
          ctx.beginPath();
          ctx.arc(node.x!, node.y!, nodeSize, 0, 2 * Math.PI);
          ctx.fillStyle = node.color || '#3b82f6';
          ctx.fill();

          // Draw label
          ctx.font = `${fontSize}px Sans-Serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#fff';
          ctx.fillText(label, node.x!, node.y! + nodeSize + 10);
        }}
        linkColor={() => '#3f3f46'}
        linkWidth={1}
        onNodeClick={handleNodeClick}
        cooldownTicks={100}
        d3VelocityDecay={0.3}
      />
    </div>
  );
}
