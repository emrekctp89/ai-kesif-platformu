'use client';

import logger from '@/utils/logger';

import React, { useCallback, useState } from 'react';
import {
  Background,
  Controls,
  MarkerType,
  Panel,
  ReactFlow,
  applyEdgeChanges,
  applyNodeChanges,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { FlaskConical, Loader2, Save, Wand2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslations } from 'next-intl';

import { saveWorkflow } from '@/app/actions/workmind';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NodeSidebar } from './NodeSidebar';

export function WorkflowBuilder() {
  const t = useTranslations('Workmind');
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
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

  const onNodeClick = useCallback((_event, node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleGenerate = async (event) => {
    event.preventDefault();
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

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || t('errorGenerate'));
      }

      const formattedNodes = (data.nodes || []).map((node, index) => ({
        id: node.id,
        type: 'default',
        position: { x: index * 250 + 40, y: 140 + (index % 2) * 30 },
        data: {
          labelText: node.label,
          label: (
            <div className="p-2 text-center">
              <div className="mb-1 text-sm font-bold leading-snug">{node.label}</div>
              <div className="text-[11px] leading-snug text-muted-foreground">
                {node.description}
              </div>
            </div>
          ),
          raw: node,
        },
        style: {
          background: 'hsl(var(--card))',
          color: 'hsl(var(--card-foreground))',
          border: '1px solid hsl(var(--border))',
          borderRadius: '10px',
          width: 210,
        },
      }));

      const formattedEdges = (data.edges || []).map((edge) => ({
        ...edge,
        id: edge.id || `e${edge.source}-${edge.target}`,
        animated: true,
        style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: 'hsl(var(--primary))',
        },
      }));

      setNodes(formattedNodes);
      setEdges(formattedEdges);
      toast.success(t('toastGenerated'));
    } catch (error) {
      toast.error(error?.message || t('errorGenerate'));
      logger.error(error);
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
        toast.success(t('toastSaved'));
      }
    } catch {
      toast.error(t('errorSave'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative flex h-full w-full">
      <div className="relative h-full min-w-0 flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          fitView
          attributionPosition="bottom-left"
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#94a3b8" gap={18} size={1} />
          <Controls />

          <Panel position="top-center" className="mt-3 w-[94%] max-w-2xl">
            <form
              onSubmit={handleGenerate}
              className="flex gap-2 rounded-xl border bg-background/95 p-2 shadow-lg backdrop-blur"
            >
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={t('promptPlaceholder')}
                className="border-0 text-base shadow-none focus-visible:ring-0"
                disabled={isLoading}
                maxLength={800}
              />
              <Button
                type="submit"
                disabled={isLoading || !prompt.trim()}
                className="shrink-0 gap-2 rounded-lg px-4 sm:px-6"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">
                  {isLoading ? t('generating') : t('generate')}
                </span>
              </Button>
              {nodes.length > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="shrink-0 rounded-lg"
                >
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  {t('save')}
                </Button>
              ) : null}
            </form>
            <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
              <FlaskConical className="h-3 w-3" aria-hidden="true" />
              {t('canvasHint')}
            </p>
          </Panel>

          {nodes.length === 0 && !isLoading ? (
            <Panel position="bottom-center" className="mb-8 max-w-md px-4">
              <div className="rounded-2xl border border-dashed bg-background/90 px-4 py-5 text-center shadow-sm backdrop-blur">
                <p className="text-sm font-semibold text-foreground">{t('emptyTitle')}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {t('emptyBody')}
                </p>
              </div>
            </Panel>
          ) : null}
        </ReactFlow>
      </div>

      <NodeSidebar
        node={selectedNode}
        workflowGoal={prompt}
        onClose={() => setSelectedNode(null)}
      />
    </div>
  );
}
