'use client';

import logger from '@/utils/logger';

import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';

import { saveWorkflow } from '@/app/actions/workmind';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  getJobSessionProgress,
  jobSessionFromWorkflow,
  jobSessionStorageKey,
  markJobSessionStepDone,
  normalizeJobSession,
  selectToolForJobStep,
} from '@/lib/kasif';
import { trackEvent } from '@/utils/analytics';
import { JobSessionBar } from './JobSessionBar';
import { NodeSidebar } from './NodeSidebar';

function nodeStyle(done) {
  return {
    background: 'hsl(var(--card))',
    color: 'hsl(var(--card-foreground))',
    border: done ? '2px solid rgb(5 150 105)' : '1px solid hsl(var(--border))',
    borderRadius: '10px',
    width: 210,
    boxShadow: done ? '0 0 0 3px rgba(16, 185, 129, 0.15)' : undefined,
  };
}

function formatNodes(rawNodes, doneIds = new Set()) {
  return (rawNodes || []).map((node, index) => {
    const done = doneIds.has(node.id);
    return {
      id: node.id,
      type: 'default',
      position: { x: index * 250 + 40, y: 140 + (index % 2) * 30 },
      data: {
        labelText: node.label,
        label: (
          <div className="p-2 text-center">
            <div className="mb-1 text-sm font-bold leading-snug">
              {done ? '✓ ' : ''}
              {node.label}
            </div>
            <div className="text-[11px] leading-snug text-muted-foreground">{node.description}</div>
          </div>
        ),
        raw: node,
        done,
      },
      style: nodeStyle(done),
    };
  });
}

function formatEdges(rawEdges) {
  return (rawEdges || []).map((edge) => ({
    ...edge,
    id: edge.id || `e${edge.source}-${edge.target}`,
    animated: true,
    style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: 'hsl(var(--primary))',
    },
  }));
}

async function postFunnelStage({
  interactionId,
  feedbackToken,
  stage,
  locale,
  selectedTool,
  meta,
  minutesToFirstResult,
}) {
  if (!interactionId || !feedbackToken || !stage) return false;
  try {
    const response = await fetch('/api/kasif/funnel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        interactionId,
        feedbackToken,
        stage,
        locale,
        selectedTool,
        minutesToFirstResult,
        meta,
      }),
    });
    if (!response.ok) return false;
    trackEvent(`kasif_funnel_${stage}`, {
      source: 'workmind',
      tool_id: selectedTool?.id || undefined,
      tool_title: selectedTool?.title || selectedTool?.name || undefined,
    });
    return true;
  } catch {
    return false;
  }
}

export function WorkflowBuilder() {
  const t = useTranslations('Workmind');
  const locale = useLocale();
  const searchParams = useSearchParams();
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [jobSession, setJobSession] = useState(null);
  const [survey, setSurvey] = useState(null);
  const autoStartedRef = useRef(false);
  const handoffRef = useRef({
    interactionId: null,
    feedbackToken: null,
    goals: [],
    packId: null,
  });

  // URL / storage handoff from Kâşif / job packs
  useEffect(() => {
    const goal = String(searchParams?.get('goal') || searchParams?.get('q') || '').trim();
    const interactionId = searchParams?.get('interactionId') || null;
    const feedbackToken = searchParams?.get('feedbackToken') || null;
    const packId = searchParams?.get('pack') || null;
    const goalsParam = String(searchParams?.get('goals') || '')
      .split(',')
      .map((g) => g.trim())
      .filter(Boolean);

    handoffRef.current = {
      interactionId,
      feedbackToken,
      goals: goalsParam,
      packId,
    };

    if (goal.length >= 3) {
      setPrompt(goal.slice(0, 800));
    } else {
      try {
        const raw = sessionStorage.getItem(jobSessionStorageKey(locale));
        if (raw) {
          const parsed = normalizeJobSession(JSON.parse(raw));
          if (parsed?.prompt) setPrompt(parsed.prompt);
        }
      } catch {
        // ignore
      }
    }
  }, [searchParams, locale]);

  useEffect(() => {
    if (!jobSession) return;
    try {
      sessionStorage.setItem(jobSessionStorageKey(locale), JSON.stringify(jobSession));
    } catch {
      // private mode
    }
  }, [jobSession, locale]);

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

  const selectStepById = useCallback(
    (stepId) => {
      const node = nodes.find((n) => n.id === stepId);
      if (node) setSelectedNode(node);
    },
    [nodes]
  );

  const applyDoneStyles = useCallback((session) => {
    const doneIds = new Set((session?.steps || []).filter((s) => s.done).map((s) => s.id));
    setNodes((current) =>
      current.map((node) => {
        const done = doneIds.has(node.id);
        const raw = node.data?.raw || {};
        return {
          ...node,
          data: {
            ...node.data,
            done,
            label: (
              <div className="p-2 text-center">
                <div className="mb-1 text-sm font-bold leading-snug">
                  {done ? '✓ ' : ''}
                  {raw.label || node.data?.labelText}
                </div>
                <div className="text-[11px] leading-snug text-muted-foreground">
                  {raw.description}
                </div>
              </div>
            ),
          },
          style: nodeStyle(done),
        };
      })
    );
  }, []);

  const ensureJobSessionRecord = useCallback(
    async (sessionPrompt, goals, stepCount) => {
      if (handoffRef.current.interactionId && handoffRef.current.feedbackToken) {
        return {
          interactionId: handoffRef.current.interactionId,
          feedbackToken: handoffRef.current.feedbackToken,
        };
      }
      try {
        const response = await fetch('/api/kasif/job-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: sessionPrompt,
            goals,
            stepCount,
            locale,
            source: handoffRef.current.packId ? 'pack' : 'workmind',
            packId: handoffRef.current.packId || undefined,
          }),
        });
        if (!response.ok) return {};
        const data = await response.json();
        handoffRef.current = {
          interactionId: data.interactionId || null,
          feedbackToken: data.feedbackToken || null,
          goals: data.goals || goals || [],
          packId: handoffRef.current.packId,
        };
        trackEvent('kasif_job_session_created', {
          source: handoffRef.current.packId ? 'pack' : 'workmind',
          step_count: stepCount,
          goal: goals?.[0] || undefined,
          pack_id: handoffRef.current.packId || undefined,
        });
        return {
          interactionId: data.interactionId,
          feedbackToken: data.feedbackToken,
          goals: data.goals,
        };
      } catch {
        return {};
      }
    },
    [locale]
  );

  const handleGenerate = useCallback(
    async (event, promptOverride) => {
      event?.preventDefault?.();
      const nextPrompt = String(promptOverride ?? prompt ?? '').trim();
      if (nextPrompt.length < 8) return;
      setPrompt(nextPrompt);

      setIsLoading(true);
      setSelectedNode(null);
      setNodes([]);
      setEdges([]);
      setSurvey(null);

      try {
        const res = await fetch('/api/workmind/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: nextPrompt }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || t('errorGenerate'));
        }

        const rawNodes = data.nodes || [];
        const goals = Array.isArray(data?.meta?.goals)
          ? data.meta.goals
          : handoffRef.current.goals || [];

        const tokens = await ensureJobSessionRecord(nextPrompt, goals, rawNodes.length);
        const session = jobSessionFromWorkflow(nextPrompt, rawNodes, {
          goals: tokens.goals || goals,
          interactionId: tokens.interactionId || handoffRef.current.interactionId,
          feedbackToken: tokens.feedbackToken || handoffRef.current.feedbackToken,
          source: data?.meta?.source === 'kasif' ? 'workmind-kasif' : 'workmind',
        });

        setJobSession(session);
        setNodes(formatNodes(rawNodes, new Set()));
        setEdges(formatEdges(data.edges || []));
        trackEvent('workmind_plan_generated', {
          source: data?.meta?.source || 'unknown',
          step_count: rawNodes.length,
          goal: session.goals?.[0] || undefined,
        });
        toast.success(
          data?.meta?.source === 'kasif' ? t('toastGeneratedKasif') : t('toastGenerated')
        );
      } catch (error) {
        toast.error(error?.message || t('errorGenerate'));
        logger.error(error);
      } finally {
        setIsLoading(false);
      }
    },
    [ensureJobSessionRecord, prompt, t]
  );

  // Auto-generate when arriving from Kâşif with goal (+ auto=1 or default when from=kasif)
  useEffect(() => {
    if (autoStartedRef.current || isLoading) return;
    const goal = String(searchParams?.get('goal') || searchParams?.get('q') || '').trim();
    const fromKasif = searchParams?.get('from') === 'kasif';
    const fromPack = searchParams?.get('from') === 'pack';
    const auto = searchParams?.get('auto') === '1' || fromKasif || fromPack;
    if (!auto || goal.length < 8) return;
    autoStartedRef.current = true;
    const nextGoal = goal.slice(0, 800);
    setPrompt(nextGoal);
    const timer = window.setTimeout(() => {
      void handleGenerate({ preventDefault() {} }, nextGoal);
    }, 50);
    return () => window.clearTimeout(timer);
  }, [searchParams, isLoading, handleGenerate]);

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

  const handleStepComplete = useCallback(
    async (stepId) => {
      setJobSession((current) => {
        if (!current) return current;
        const next = markJobSessionStepDone(current, stepId, true);
        applyDoneStyles(next);
        const progress = getJobSessionProgress(next);
        trackEvent('workmind_step_complete', {
          step_id: stepId,
          done: progress.done,
          total: progress.total,
        });
        if (progress.complete) {
          void postFunnelStage({
            interactionId: next.interactionId,
            feedbackToken: next.feedbackToken,
            stage: 'setup_completed',
            locale,
            meta: { action: 'all_steps_done', source: 'workmind' },
          });
        }
        return next;
      });
    },
    [applyDoneStyles, locale]
  );

  const handleToolSelect = useCallback(
    async (stepId, tool) => {
      setJobSession((current) => {
        if (!current) return current;
        return selectToolForJobStep(current, stepId, tool);
      });

      const selectedTool = tool
        ? { id: tool.id, slug: tool.slug, title: tool.name || tool.title }
        : null;

      await postFunnelStage({
        interactionId: jobSession?.interactionId,
        feedbackToken: jobSession?.feedbackToken,
        stage: 'tool_selected',
        locale,
        selectedTool,
        meta: { action: 'workmind_step_tool', step_id: stepId },
      });
      await postFunnelStage({
        interactionId: jobSession?.interactionId,
        feedbackToken: jobSession?.feedbackToken,
        stage: 'setup_started',
        locale,
        selectedTool,
        meta: { action: 'workmind_step_setup', step_id: stepId },
      });
    },
    [jobSession?.feedbackToken, jobSession?.interactionId, locale]
  );

  const handleReportFirstResult = useCallback(async () => {
    await postFunnelStage({
      interactionId: jobSession?.interactionId,
      feedbackToken: jobSession?.feedbackToken,
      stage: 'first_result',
      locale,
      minutesToFirstResult: 20,
      meta: { self_report: true, source: 'workmind' },
    });
    setSurvey('first_result');
    toast.success(t('sessionThanks'));
  }, [jobSession?.feedbackToken, jobSession?.interactionId, locale, t]);

  const handleReportJobDone = useCallback(async () => {
    await postFunnelStage({
      interactionId: jobSession?.interactionId,
      feedbackToken: jobSession?.feedbackToken,
      stage: 'first_result',
      locale,
      minutesToFirstResult: 20,
      meta: { self_report: true, source: 'workmind' },
    });
    await postFunnelStage({
      interactionId: jobSession?.interactionId,
      feedbackToken: jobSession?.feedbackToken,
      stage: 'job_done',
      locale,
      meta: { self_report: true, source: 'workmind' },
    });
    setSurvey('done');
    toast.success(t('sessionThanks'));
  }, [jobSession?.feedbackToken, jobSession?.interactionId, locale, t]);

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

          <Panel position="top-center" className="mt-3 w-[94%] max-w-2xl space-y-2">
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
                disabled={isLoading || prompt.trim().length < 8}
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

            {jobSession?.steps?.length ? (
              <JobSessionBar
                session={jobSession}
                locale={locale}
                onSelectStep={selectStepById}
                onReportFirstResult={handleReportFirstResult}
                onReportJobDone={handleReportJobDone}
                survey={survey}
              />
            ) : (
              <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
                <FlaskConical className="h-3 w-3" aria-hidden="true" />
                {t('canvasHint')}
              </p>
            )}
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
        goals={jobSession?.goals || handoffRef.current.goals || []}
        interactionId={jobSession?.interactionId}
        feedbackToken={jobSession?.feedbackToken}
        stepDone={Boolean(jobSession?.steps?.find((s) => s.id === selectedNode?.id)?.done)}
        locale={locale}
        onClose={() => setSelectedNode(null)}
        onStepComplete={handleStepComplete}
        onToolSelect={handleToolSelect}
      />
    </div>
  );
}
