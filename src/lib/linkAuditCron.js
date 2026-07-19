import logger from '@/utils/logger';
import { Resend } from 'resend';
import { createAdminClient } from '@/utils/supabase/admin';

const DEFAULT_TIMEOUT_MS = 6000;
const DEFAULT_CONCURRENCY = 5;
/** Tools scanned per DB fetch batch. */
const DEFAULT_BATCH_SIZE = 40;
const MAX_BATCH_SIZE = 100;
/** Soft cap across multi-batch run (time budget usually hits first). */
const DEFAULT_MAX_TOOLS = 200;
const MAX_TOOLS = 500;
/** Leave headroom under Vercel `maxDuration` (default 300s). */
const DEFAULT_MAX_RUNTIME_MS = 250_000;
const DEFINITELY_INVALID_STATUSES = new Set([404, 410, 451]);
const REVIEW_ONLY_STATUSES = new Set([401, 403, 408, 425, 429, 500, 502, 503, 504]);
const PROBLEM_STATUSES = ['invalid', 'review'];
const ADMIN_NOTIFICATION_LINK = '/admin?tab=tools&quality=link-audit';

export function clampInteger(value, { fallback, min, max }) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export function normalizeUrl(rawLink) {
  const candidate = String(rawLink || '').trim();
  if (!candidate) {
    return { ok: false, reason: 'Link boş.' };
  }

  try {
    const url = new URL(candidate);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { ok: false, reason: 'Yalnızca http/https desteklenir.' };
    }
    return { ok: true, url };
  } catch {
    return { ok: false, reason: 'Geçersiz URL.' };
  }
}

function shouldSkipUrl(url) {
  const hostname = url.hostname.toLowerCase();
  const normalizedHostname = hostname.replace(/^\[|\]$/g, '');

  if (
    normalizedHostname === 'localhost' ||
    normalizedHostname === '127.0.0.1' ||
    normalizedHostname === '::1'
  ) {
    return 'localhost adresi atlandı';
  }

  if (
    normalizedHostname === 'example.com' ||
    normalizedHostname === 'example.org' ||
    normalizedHostname === 'example.net' ||
    normalizedHostname.endsWith('.example') ||
    normalizedHostname.endsWith('.invalid') ||
    normalizedHostname.endsWith('.local') ||
    normalizedHostname.endsWith('.test')
  ) {
    return 'test domaini atlandı';
  }

  return null;
}

function getErrorCode(error) {
  return error?.cause?.code || error?.code || error?.cause?.errno || error?.errno || null;
}

function classifyFetchError(error) {
  const message = String(error?.message || error || '').trim() || 'Bilinmeyen ağ hatası';
  const code = getErrorCode(error);

  if (error?.name === 'AbortError' || error?.name === 'TimeoutError') {
    return { status: 'review', reason: 'Zaman aşımı', errorDetail: message };
  }

  if (code === 'ENOTFOUND') {
    return { status: 'invalid', reason: 'DNS hatası', errorDetail: message };
  }

  if (code === 'ECONNRESET') {
    return { status: 'review', reason: 'Bağlantı sıfırlandı', errorDetail: `${code}: ${message}` };
  }

  if (code === 'ECONNREFUSED' || code === 'EHOSTUNREACH' || code === 'ENETUNREACH') {
    return { status: 'invalid', reason: 'Bağlantı hatası', errorDetail: `${code}: ${message}` };
  }

  if (
    code === 'CERT_HAS_EXPIRED' ||
    code === 'DEPTH_ZERO_SELF_SIGNED_CERT' ||
    code === 'ERR_TLS_CERT_ALTNAME_INVALID'
  ) {
    return {
      status: 'invalid',
      reason: 'SSL sertifika hatası',
      errorDetail: `${code}: ${message}`,
    };
  }

  if (code === 'EAI_AGAIN') {
    return { status: 'review', reason: 'Geçici DNS hatası', errorDetail: `${code}: ${message}` };
  }

  return {
    status: 'review',
    reason: 'Beklenmeyen ağ hatası',
    errorDetail: code ? `${code}: ${message}` : message,
  };
}

async function closeResponse(response) {
  try {
    await response.body?.cancel();
  } catch {
    // ignore cancel races
  }
}

async function fetchForAudit(url, method, timeoutMs) {
  return fetch(url, {
    method,
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      'user-agent': 'AI Tool Platform Link Audit Cron/1.1',
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'cache-control': 'no-cache',
    },
  });
}

function buildResult(tool, overrides) {
  return {
    toolId: tool.id,
    name: tool.name,
    slug: tool.slug,
    link: tool.link,
    previousStatus: tool.link_check_status || null,
    ...overrides,
  };
}

function classifyHttpResponse(response, method) {
  const httpStatus = response.status;
  const finalUrl = response.url || null;

  if (response.ok) {
    return {
      status: 'valid',
      reason: `${method} ${httpStatus}`,
      httpStatus,
      finalUrl,
      errorDetail: null,
    };
  }

  if (DEFINITELY_INVALID_STATUSES.has(httpStatus)) {
    return {
      status: 'invalid',
      reason: `HTTP ${httpStatus}`,
      httpStatus,
      finalUrl,
      errorDetail: `Sunucu ${httpStatus} döndürdü.`,
    };
  }

  if (REVIEW_ONLY_STATUSES.has(httpStatus)) {
    return {
      status: 'review',
      reason: `HTTP ${httpStatus}`,
      httpStatus,
      finalUrl,
      errorDetail: `Sunucu ${httpStatus} döndürdü.`,
    };
  }

  return {
    status: 'invalid',
    reason: `HTTP ${httpStatus}`,
    httpStatus,
    finalUrl,
    errorDetail: `Sunucu ${httpStatus} döndürdü.`,
  };
}

export async function validateToolLink(tool, timeoutMs) {
  const normalized = normalizeUrl(tool.link);
  if (!normalized.ok) {
    return buildResult(tool, {
      status: 'invalid',
      reason: normalized.reason,
      httpStatus: null,
      finalUrl: null,
      errorDetail: normalized.reason,
      responseTimeMs: null,
    });
  }

  const skippedReason = shouldSkipUrl(normalized.url);
  if (skippedReason) {
    return buildResult(tool, {
      status: 'skipped',
      reason: skippedReason,
      httpStatus: null,
      finalUrl: normalized.url.toString(),
      errorDetail: skippedReason,
      responseTimeMs: null,
    });
  }

  let headStartTime = performance.now();
  try {
    headStartTime = performance.now();
    const headResponse = await fetchForAudit(normalized.url, 'HEAD', timeoutMs);
    const headClassification = classifyHttpResponse(headResponse, 'HEAD');

    if (headClassification.status === 'valid') {
      await closeResponse(headResponse);
      const responseTimeMs = Math.round(performance.now() - headStartTime);
      return buildResult(tool, { ...headClassification, responseTimeMs });
    }
    await closeResponse(headResponse);
  } catch (error) {
    const classifiedError = classifyFetchError(error);
    if (classifiedError.status === 'invalid') {
      const responseTimeMs = Math.round(performance.now() - headStartTime);
      return buildResult(tool, {
        httpStatus: null,
        finalUrl: normalized.url.toString(),
        ...classifiedError,
        responseTimeMs,
      });
    }
  }

  let getStartTime = performance.now();
  try {
    getStartTime = performance.now();
    const getResponse = await fetchForAudit(normalized.url, 'GET', timeoutMs);
    const classification = classifyHttpResponse(getResponse, 'GET');
    await closeResponse(getResponse);
    const responseTimeMs = Math.round(performance.now() - getStartTime);
    return buildResult(tool, { ...classification, responseTimeMs });
  } catch (error) {
    const classifiedError = classifyFetchError(error);
    const responseTimeMs = Math.round(performance.now() - getStartTime);
    return buildResult(tool, {
      httpStatus: null,
      finalUrl: normalized.url.toString(),
      ...classifiedError,
      responseTimeMs,
    });
  }
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let currentIndex = 0;

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (currentIndex < items.length) {
      const nextIndex = currentIndex;
      currentIndex += 1;
      results[nextIndex] = await mapper(items[nextIndex], nextIndex);
    }
  });

  await Promise.all(workers);
  return results;
}

function groupResults(results) {
  return {
    validLinks: results.filter((item) => item.status === 'valid'),
    invalidLinks: results.filter((item) => item.status === 'invalid'),
    needsReview: results.filter((item) => item.status === 'review'),
    skippedLinks: results.filter((item) => item.status === 'skipped'),
  };
}

async function updateAuditMetadata(supabaseAdmin, results, checkedAt) {
  // Sequential updates keep payloads simple and avoid PostgREST bulk upsert edge cases.
  for (const result of results) {
    const payload = {
      link_check_status: result.status,
      link_check_error: result.errorDetail,
      link_check_http_status: result.httpStatus,
      link_response_time_ms: result.responseTimeMs || null,
      link_checked_at: checkedAt,
      link_deactivated_at: null,
      link_deactivation_reason: null,
    };

    const { error } = await supabaseAdmin.from('tools').update(payload).eq('id', result.toolId);

    if (error) {
      throw new Error(`Tool ${result.toolId} audit metadata update başarısız: ${error.message}`);
    }
  }
}

async function findAdminUserId(supabaseAdmin) {
  const adminEmail = String(process.env.ADMIN_EMAIL || '')
    .trim()
    .toLowerCase();
  if (!adminEmail) return null;

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', adminEmail)
    .maybeSingle();

  if (profile?.id) return profile.id;

  try {
    const { data } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const adminUser = data?.users?.find(
      (candidate) => String(candidate.email || '').toLowerCase() === adminEmail
    );
    return adminUser?.id || null;
  } catch (error) {
    logger.error("Admin kullanıcı ID'si bulunurken hata:", error);
    return null;
  }
}

function formatProblemList(items) {
  return items
    .slice(0, 10)
    .map((item) => `#${item.toolId} ${item.name}: ${item.reason}`)
    .join('\n');
}

async function notifyAdminAboutAudit(supabaseAdmin, report) {
  const problemLinks = [...report.invalidLinks, ...report.needsReview];
  if (problemLinks.length === 0) return;

  const message = `Link audit ${report.summary.invalidCount} kırık ve ${report.summary.reviewCount} inceleme gerektiren link buldu.`;
  const metadata = {
    generated_at: report.generatedAt,
    summary: report.summary,
    invalid_tool_ids: report.invalidLinks.map((item) => item.toolId),
    review_tool_ids: report.needsReview.map((item) => item.toolId),
  };

  const { error: alertError } = await supabaseAdmin.from('admin_alerts').insert({
    alert_type: 'automated_link_audit',
    description: message,
    status: 'Açık',
    link: ADMIN_NOTIFICATION_LINK,
    metadata,
  });

  if (alertError) {
    logger.error('Link audit admin uyarısı oluşturulamadı:', alertError);
  }

  const adminUserId = await findAdminUserId(supabaseAdmin);
  if (adminUserId) {
    const { error: notificationError } = await supabaseAdmin.from('notifications').insert({
      user_id: adminUserId,
      event_type: 'automated_link_audit',
      message,
      link: ADMIN_NOTIFICATION_LINK,
      is_read: false,
    });

    if (notificationError) {
      logger.error('Link audit admin bildirimi oluşturulamadı:', notificationError);
    }
  }

  await sendAuditEmail(report, message);
}

async function sendAuditEmail(report, message) {
  const to = process.env.ADMIN_NOTIF_EMAIL_TO || process.env.ADMIN_EMAIL;
  const from = process.env.ADMIN_NOTIF_EMAIL_FROM;

  if (!process.env.RESEND_API_KEY || !to || !from) return;

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const text = [
      message,
      '',
      `Taranan: ${report.summary.scannedCount}`,
      `Geçerli: ${report.summary.validCount}`,
      `Kırık: ${report.summary.invalidCount}`,
      `İnceleme: ${report.summary.reviewCount}`,
      `Atlanan: ${report.summary.skippedCount}`,
      `Kuyrukta kalan (tahmini): ${report.summary.remainingDueCount ?? 'bilinmiyor'}`,
      '',
      report.invalidLinks.length > 0 ? 'Kırık linkler:' : null,
      report.invalidLinks.length > 0 ? formatProblemList(report.invalidLinks) : null,
      report.needsReview.length > 0 ? '' : null,
      report.needsReview.length > 0 ? 'Manuel inceleme gerekenler:' : null,
      report.needsReview.length > 0 ? formatProblemList(report.needsReview) : null,
    ]
      .filter(Boolean)
      .join('\n');

    await resend.emails.send({
      from,
      to,
      subject: 'AI Keşif | Link audit uyarısı',
      text,
    });
  } catch (error) {
    logger.error('Link audit e-posta bildirimi gönderilemedi:', error);
  }
}

/**
 * Priority queues for weekly automation:
 * 1) Never checked (new tools) — newest first
 * 2) Known problem statuses (invalid / review)
 * 3) Stale successful checks older than staleBefore
 *
 * @param {'all'|'pending'} priority
 */
export async function getDueTools(supabaseAdmin, { limit, staleBefore, priority = 'all' }) {
  const selectCols = 'id, name, slug, link, link_check_status, link_checked_at, created_at';
  const collected = [];
  const seen = new Set();

  const take = async (builder) => {
    const remaining = limit - collected.length;
    if (remaining <= 0) return;

    const { data, error } = await builder.limit(remaining);
    if (error) {
      throw new Error(`Audit edilecek araçlar okunamadı: ${error.message}`);
    }

    for (const row of data || []) {
      if (seen.has(row.id)) continue;
      if (!row.link) continue;
      seen.add(row.id);
      collected.push(row);
      if (collected.length >= limit) break;
    }
  };

  // 1) Brand-new tools waiting for first check
  await take(
    supabaseAdmin
      .from('tools')
      .select(selectCols)
      .eq('is_approved', true)
      .not('link', 'is', null)
      .is('link_checked_at', null)
      .order('created_at', { ascending: false })
  );

  // 2) Broken / review — recheck so status can recover
  if (collected.length < limit) {
    await take(
      supabaseAdmin
        .from('tools')
        .select(selectCols)
        .eq('is_approved', true)
        .not('link', 'is', null)
        .in('link_check_status', PROBLEM_STATUSES)
        .order('link_checked_at', { ascending: true, nullsFirst: true })
        .order('id', { ascending: true })
    );
  }

  // 3) Stale checks (weekly refresh) — only in full mode
  if (priority !== 'pending' && collected.length < limit) {
    await take(
      supabaseAdmin
        .from('tools')
        .select(selectCols)
        .eq('is_approved', true)
        .not('link', 'is', null)
        .not('link_checked_at', 'is', null)
        .lt('link_checked_at', staleBefore)
        .order('link_checked_at', { ascending: true })
        .order('id', { ascending: true })
    );
  }

  return collected;
}

async function countRemainingDue(supabaseAdmin, { staleBefore, priority = 'all' }) {
  try {
    if (priority === 'pending') {
      const { count: nullCount } = await supabaseAdmin
        .from('tools')
        .select('id', { count: 'exact', head: true })
        .eq('is_approved', true)
        .not('link', 'is', null)
        .is('link_checked_at', null);

      const { count: problemCount } = await supabaseAdmin
        .from('tools')
        .select('id', { count: 'exact', head: true })
        .eq('is_approved', true)
        .not('link', 'is', null)
        .in('link_check_status', PROBLEM_STATUSES);

      return (nullCount || 0) + (problemCount || 0);
    }

    const { count } = await supabaseAdmin
      .from('tools')
      .select('id', { count: 'exact', head: true })
      .eq('is_approved', true)
      .not('link', 'is', null)
      .or(`link_checked_at.is.null,link_checked_at.lt.${staleBefore}`);

    return count || 0;
  } catch (error) {
    logger.warn('Link audit remaining count failed:', error);
    return null;
  }
}

function emptyReport({ checkedAt, staleBefore, options }) {
  return {
    generatedAt: checkedAt,
    staleBefore,
    priority: options.priority,
    batches: 0,
    durationMs: 0,
    timeoutMs: options.timeoutMs,
    concurrency: options.concurrency,
    batchSize: options.batchSize,
    maxTools: options.maxTools,
    summary: {
      scannedCount: 0,
      validCount: 0,
      invalidCount: 0,
      reviewCount: 0,
      skippedCount: 0,
      remainingDueCount: 0,
    },
    validLinks: [],
    invalidLinks: [],
    needsReview: [],
    skippedLinks: [],
  };
}

/**
 * Weekly/daily scheduled link audit.
 * Processes multiple batches until maxTools or maxRuntimeMs is hit.
 */
export async function runScheduledLinkAudit(options = {}) {
  const batchSize = clampInteger(
    options.batchSize || options.limit || process.env.LINK_AUDIT_CRON_LIMIT,
    {
      fallback: DEFAULT_BATCH_SIZE,
      min: 1,
      max: MAX_BATCH_SIZE,
    }
  );
  const maxTools = clampInteger(options.maxTools || process.env.LINK_AUDIT_MAX_TOOLS, {
    fallback: DEFAULT_MAX_TOOLS,
    min: batchSize,
    max: MAX_TOOLS,
  });
  const timeoutMs = clampInteger(options.timeoutMs || process.env.LINK_AUDIT_TIMEOUT_MS, {
    fallback: DEFAULT_TIMEOUT_MS,
    min: 3000,
    max: 10000,
  });
  const concurrency = clampInteger(options.concurrency || process.env.LINK_AUDIT_CONCURRENCY, {
    fallback: DEFAULT_CONCURRENCY,
    min: 1,
    max: 10,
  });
  const staleDays = clampInteger(options.staleDays || process.env.LINK_AUDIT_STALE_DAYS, {
    fallback: 7,
    min: 1,
    max: 90,
  });
  const maxRuntimeMs = clampInteger(
    options.maxRuntimeMs || process.env.LINK_AUDIT_MAX_RUNTIME_MS,
    {
      fallback: DEFAULT_MAX_RUNTIME_MS,
      min: 10_000,
      max: 290_000,
    }
  );

  const priorityRaw = String(options.priority || process.env.LINK_AUDIT_PRIORITY || 'all')
    .trim()
    .toLowerCase();
  const priority = priorityRaw === 'pending' || priorityRaw === 'new' ? 'pending' : 'all';

  const startedAt = Date.now();
  const checkedAt = new Date().toISOString();
  const staleBefore = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000).toISOString();
  const supabaseAdmin = createAdminClient();

  const runOptions = { timeoutMs, concurrency, batchSize, maxTools, priority };
  const allResults = [];
  let batches = 0;

  while (allResults.length < maxTools) {
    const elapsed = Date.now() - startedAt;
    if (elapsed >= maxRuntimeMs) {
      logger.info('Link audit time budget reached', {
        elapsed,
        maxRuntimeMs,
        scanned: allResults.length,
      });
      break;
    }

    const remainingBudget = maxRuntimeMs - elapsed;
    // Need roughly one timeout window + DB overhead left
    if (remainingBudget < timeoutMs + 2000) break;

    const room = maxTools - allResults.length;
    const thisBatchSize = Math.min(batchSize, room);
    const tools = await getDueTools(supabaseAdmin, {
      limit: thisBatchSize,
      staleBefore,
      priority,
    });

    if (tools.length === 0) break;

    // Avoid re-scanning tools already updated in this run (should be rare)
    const freshTools = tools.filter(
      (tool) => !allResults.some((result) => result.toolId === tool.id)
    );
    if (freshTools.length === 0) break;

    const batchCheckedAt = new Date().toISOString();
    const results = await mapWithConcurrency(freshTools, concurrency, (tool) =>
      validateToolLink(tool, timeoutMs)
    );
    await updateAuditMetadata(supabaseAdmin, results, batchCheckedAt);
    allResults.push(...results);
    batches += 1;

    // Short batch ⇒ queue drained for this priority
    if (freshTools.length < thisBatchSize) break;
  }

  if (allResults.length === 0) {
    const remainingDueCount = await countRemainingDue(supabaseAdmin, { staleBefore, priority });
    return {
      ...emptyReport({ checkedAt, staleBefore, options: runOptions }),
      summary: {
        scannedCount: 0,
        validCount: 0,
        invalidCount: 0,
        reviewCount: 0,
        skippedCount: 0,
        remainingDueCount,
      },
      durationMs: Date.now() - startedAt,
    };
  }

  const grouped = groupResults(allResults);
  const remainingDueCount = await countRemainingDue(supabaseAdmin, { staleBefore, priority });

  const report = {
    generatedAt: checkedAt,
    staleBefore,
    priority,
    batches,
    durationMs: Date.now() - startedAt,
    timeoutMs,
    concurrency,
    batchSize,
    maxTools,
    summary: {
      scannedCount: allResults.length,
      validCount: grouped.validLinks.length,
      invalidCount: grouped.invalidLinks.length,
      reviewCount: grouped.needsReview.length,
      skippedCount: grouped.skippedLinks.length,
      remainingDueCount,
    },
    validLinks: grouped.validLinks,
    invalidLinks: grouped.invalidLinks,
    needsReview: grouped.needsReview,
    skippedLinks: grouped.skippedLinks,
  };

  await notifyAdminAboutAudit(supabaseAdmin, report);
  logger.info('Scheduled link audit completed', report.summary);
  return report;
}
