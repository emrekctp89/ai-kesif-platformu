'use client';

import React, { useState, useCallback, useRef } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  Panel,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Wand2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { NodeSidebar } from './NodeSidebar';
import { saveWorkflow } from '@/app/actions/workmind';

const initialNodes = [];
const initialEdges = [];

export function WorkflowBuilder() {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    setSelectedNode(null);
    setNodes([]);
    setEdges([]);

    try {
      const res = await fetch('/api/workmind/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
        throw new Error('API Hatası');
      }

      const data = await res.json();

      // Node'lara pozisyon ekle (basit bir yatay dizilim)
      const formattedNodes = (data.nodes || []).map((node, index) => ({
        id: node.id,
        type: 'default',
        position: { x: index * 250 + 50, y: 150 },
        data: {
          label: (
            <div className="p-2 text-center">
              <div className="font-bold text-sm mb-1">{node.label}</div>
              <div className="text-xs text-muted-foreground">{node.description}</div>
            </div>
          ),
          raw: node, // Orijinal veriyi sakla
        },
        style: {
          background: 'hsl(var(--card))',
          color: 'hsl(var(--card-foreground))',
          border: '1px solid hsl(var(--border))',
          borderRadius: '8px',
          width: 200,
        },
      }));

      // Kenarlara (Edges) ok işareti ekle
      const formattedEdges = (data.edges || []).map((edge) => ({
        ...edge,
        id: `e${edge.source}-${edge.target}`,
        animated: true,
        style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: 'hsl(var(--primary))',
        },
      }));

      setNodes(formattedNodes);
      setEdges(formattedEdges);
      toast.success('İş akışı oluşturuldu! İncelemek için kutulara tıklayın.');
    } catch (error) {
      toast.error('İş akışı oluşturulurken bir hata oluştu.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (nodes.length === 0) return;
    setIsSaving(true);
    try {
      const result = await saveWorkflow(prompt, nodes, edges, false);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('İş akışınız kaydedildi!');
      }
    } catch (error) {
      toast.error('Kaydetme başarısız oldu.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full h-full relative flex">
      {/* Harita Alanı */}
      <div className="flex-1 h-full relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          fitView
          attributionPosition="bottom-left"
        >
          <Background color="#ccc" gap={16} />
          <Controls />

          {/* Prompt Paneli (Haritanın Üstünde) */}
          <Panel position="top-center" className="w-[90%] max-w-2xl mt-4">
            <form
              onSubmit={handleGenerate}
              className="flex gap-2 shadow-lg bg-background p-2 rounded-xl border"
            >
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Örn: Sıfırdan bir e-ticaret sitesi kurup pazarlamak istiyorum..."
                className="border-0 focus-visible:ring-0 shadow-none text-base"
                disabled={isLoading}
              />
              <Button
                type="submit"
                disabled={isLoading || !prompt.trim()}
                className="rounded-lg px-6 gap-2 shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">{isLoading ? 'Üretiliyor...' : 'Üret'}</span>
              </Button>
              {nodes.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="rounded-lg shrink-0"
                >
                  <Save className="w-4 h-4 mr-2" /> Kaydet
                </Button>
              )}
            </form>
          </Panel>
        </ReactFlow>
      </div>

      {/* Sağ Yan Panel */}
      <NodeSidebar node={selectedNode} onClose={() => setSelectedNode(null)} />
    </div>
  );
}
