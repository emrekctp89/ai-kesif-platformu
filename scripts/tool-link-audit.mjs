import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_TIMEOUT_MS = 7000;
const DEFAULT_CONCURRENCY = 5;
const MIN_TIMEOUT_MS = 5000;
const MAX_TIMEOUT_MS = 10000;
const DEACTIVATE_CONFIRMATION = "DEACTIVATE_INVALID_TOOLS";
const REPORT_DIRECTORY = path.join(os.tmpdir(), "tool-link-audits");
const DEFINITELY_INVALID_STATUSES = new Set([404, 410, 451]);
const REVIEW_ONLY_STATUSES = new Set([401, 403, 408, 425, 429, 500, 502, 503, 504]);

function parseArgs(argv) {
  const options = {
    timeoutMs: DEFAULT_TIMEOUT_MS,
    concurrency: DEFAULT_CONCURRENCY,
    limit: null,
    deactivate: false,
    confirm: "",
  };

  for (const arg of argv) {
    if (arg === "--deactivate") {
      options.deactivate = true;
      continue;
    }

    if (arg.startsWith("--timeout=")) {
      options.timeoutMs = Number.parseInt(arg.split("=")[1] || "", 10);
      continue;
    }

    if (arg.startsWith("--concurrency=")) {
      options.concurrency = Number.parseInt(arg.split("=")[1] || "", 10);
      continue;
    }

    if (arg.startsWith("--limit=")) {
      options.limit = Number.parseInt(arg.split("=")[1] || "", 10);
      continue;
    }

    if (arg.startsWith("--confirm=")) {
      options.confirm = arg.slice("--confirm=".length);
      continue;
    }

    if (arg === "--help") {
      printHelp();
      process.exit(0);
    }

    throw new Error(`Bilinmeyen argüman: ${arg}`);
  }

  if (!Number.isInteger(options.timeoutMs) || options.timeoutMs < MIN_TIMEOUT_MS || options.timeoutMs > MAX_TIMEOUT_MS) {
    throw new Error(`timeout ${MIN_TIMEOUT_MS}-${MAX_TIMEOUT_MS} ms arasında olmalı.`);
  }

  if (!Number.isInteger(options.concurrency) || options.concurrency < 1 || options.concurrency > 20) {
    throw new Error("concurrency 1-20 arasında olmalı.");
  }

  if (options.limit !== null && (!Number.isInteger(options.limit) || options.limit < 1)) {
    throw new Error("limit pozitif bir tam sayı olmalı.");
  }

  if (options.deactivate && options.confirm !== DEACTIVATE_CONFIRMATION) {
    throw new Error(
      `Pasife alma için --confirm=${DEACTIVATE_CONFIRMATION} parametresi gerekli.`
    );
  }

  return options;
}

function printHelp() {
  console.log(`
Kullanım:
  npm run tools:audit-links
  npm run tools:audit-links -- --limit=25
  npm run tools:audit-links -- --deactivate --confirm=${DEACTIVATE_CONFIRMATION}

Varsayılan davranış:
  - Onaylı araçları tarar
  - Sonuçları araç kayıtlarına yazar
  - Ayrıntılı JSON raporunu geçici klasöre kaydeder

Opsiyonlar:
  --timeout=7000        Her link için zaman aşımı (5000-10000 ms)
  --concurrency=5       Aynı anda kontrol edilecek link sayısı
  --limit=50            İlk N aracı test etmek için sınır
  --deactivate          Kesin kırık linkleri is_approved=false yap
  --confirm=...         Pasife alma onayı
  --help                Yardımı göster
`.trim());
}

function getEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} ortam değişkeni eksik.`);
  }
  return value;
}

function normalizeUrl(rawLink) {
  const candidate = String(rawLink || "").trim();
  if (!candidate) {
    return { ok: false, reason: "Link boş." };
  }

  try {
    const url = new URL(candidate);
    if (!["http:", "https:"].includes(url.protocol)) {
      return { ok: false, reason: "Yalnızca http/https desteklenir." };
    }
    return { ok: true, url };
  } catch {
    return { ok: false, reason: "Geçersiz URL." };
  }
}

function shouldSkipUrl(url) {
  const hostname = url.hostname.toLowerCase();
  const normalizedHostname = hostname.replace(/^\[|\]$/g, "");

  if (
    normalizedHostname === "localhost" ||
    normalizedHostname === "127.0.0.1" ||
    normalizedHostname === "::1"
  ) {
    return "localhost adresi atlandı";
  }

  if (
    normalizedHostname === "example.com" ||
    normalizedHostname === "example.org" ||
    normalizedHostname === "example.net" ||
    normalizedHostname.endsWith(".example") ||
    normalizedHostname.endsWith(".invalid") ||
    normalizedHostname.endsWith(".local") ||
    normalizedHostname.endsWith(".test")
  ) {
    return "test domaini atlandı";
  }

  return null;
}

function getErrorCode(error) {
  return (
    error?.cause?.code ||
    error?.code ||
    error?.cause?.errno ||
    error?.errno ||
    null
  );
}

function classifyFetchError(error) {
  const message = String(error?.message || error || "").trim() || "Bilinmeyen ağ hatası";
  const code = getErrorCode(error);

  if (error?.name === "AbortError") {
    return {
      status: "review",
      reason: "Zaman aşımı",
      errorDetail: message,
    };
  }

  if (code === "ENOTFOUND") {
    return {
      status: "invalid",
      reason: "DNS hatası",
      errorDetail: message,
    };
  }

  if (code === "ECONNREFUSED" || code === "ECONNRESET" || code === "EHOSTUNREACH" || code === "ENETUNREACH") {
    return {
      status: "invalid",
      reason: "Bağlantı hatası",
      errorDetail: `${code}: ${message}`,
    };
  }

  if (
    code === "CERT_HAS_EXPIRED" ||
    code === "DEPTH_ZERO_SELF_SIGNED_CERT" ||
    code === "ERR_TLS_CERT_ALTNAME_INVALID"
  ) {
    return {
      status: "invalid",
      reason: "SSL sertifika hatası",
      errorDetail: `${code}: ${message}`,
    };
  }

  if (code === "EAI_AGAIN") {
    return {
      status: "review",
      reason: "Geçici DNS hatası",
      errorDetail: `${code}: ${message}`,
    };
  }

  return {
    status: "review",
    reason: "Beklenmeyen ağ hatası",
    errorDetail: code ? `${code}: ${message}` : message,
  };
}

async function closeResponse(response) {
  try {
    await response.body?.cancel();
  } catch {
    // no-op
  }
}

async function fetchForAudit(url, method, timeoutMs) {
  const response = await fetch(url, {
    method,
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      "user-agent": "AI Tool Platform Link Audit/1.0",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "cache-control": "no-cache",
    },
  });

  return response;
}

function buildResult(tool, overrides) {
  return {
    toolId: tool.id,
    name: tool.name,
    slug: tool.slug,
    link: tool.link,
    ...overrides,
  };
}

function classifyHttpResponse(response, method) {
  const httpStatus = response.status;
  const finalUrl = response.url || null;

  if (response.ok) {
    return {
      status: "valid",
      reason: `${method} ${httpStatus}`,
      httpStatus,
      finalUrl,
      errorDetail: null,
    };
  }

  if (DEFINITELY_INVALID_STATUSES.has(httpStatus)) {
    return {
      status: "invalid",
      reason: `HTTP ${httpStatus}`,
      httpStatus,
      finalUrl,
      errorDetail: `Sunucu ${httpStatus} döndürdü.`,
    };
  }

  if (REVIEW_ONLY_STATUSES.has(httpStatus)) {
    return {
      status: "review",
      reason: `HTTP ${httpStatus}`,
      httpStatus,
      finalUrl,
      errorDetail: `Sunucu ${httpStatus} döndürdü.`,
    };
  }

  return {
    status: "invalid",
    reason: `HTTP ${httpStatus}`,
    httpStatus,
    finalUrl,
    errorDetail: `Sunucu ${httpStatus} döndürdü.`,
  };
}

async function validateToolLink(tool, timeoutMs) {
  const normalized = normalizeUrl(tool.link);
  if (!normalized.ok) {
    return buildResult(tool, {
      status: "invalid",
      reason: normalized.reason,
      httpStatus: null,
      finalUrl: null,
      errorDetail: normalized.reason,
    });
  }

  const skippedReason = shouldSkipUrl(normalized.url);
  if (skippedReason) {
    return buildResult(tool, {
      status: "skipped",
      reason: skippedReason,
      httpStatus: null,
      finalUrl: normalized.url.toString(),
      errorDetail: skippedReason,
    });
  }

  try {
    const headResponse = await fetchForAudit(normalized.url, "HEAD", timeoutMs);
    const headClassification = classifyHttpResponse(headResponse, "HEAD");

    if (headClassification.status === "valid") {
      await closeResponse(headResponse);
      return buildResult(tool, headClassification);
    }

    if (DEFINITELY_INVALID_STATUSES.has(headResponse.status)) {
      await closeResponse(headResponse);
      return buildResult(tool, headClassification);
    }

    await closeResponse(headResponse);
  } catch (error) {
    const classifiedError = classifyFetchError(error);
    if (classifiedError.status === "invalid") {
      return buildResult(tool, {
        httpStatus: null,
        finalUrl: normalized.url.toString(),
        ...classifiedError,
      });
    }
  }

  try {
    const getResponse = await fetchForAudit(normalized.url, "GET", timeoutMs);
    const classification = classifyHttpResponse(getResponse, "GET");
    await closeResponse(getResponse);
    return buildResult(tool, classification);
  } catch (error) {
    const classifiedError = classifyFetchError(error);
    return buildResult(tool, {
      httpStatus: null,
      finalUrl: normalized.url.toString(),
      ...classifiedError,
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
    validLinks: results.filter((item) => item.status === "valid"),
    invalidLinks: results.filter((item) => item.status === "invalid"),
    needsReview: results.filter((item) => item.status === "review"),
    skippedLinks: results.filter((item) => item.status === "skipped"),
  };
}

async function writeReport(report) {
  await mkdir(REPORT_DIRECTORY, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filePath = path.join(REPORT_DIRECTORY, `tool-link-audit-${stamp}.json`);
  await writeFile(filePath, JSON.stringify(report, null, 2), "utf8");
  return filePath;
}

async function updateAuditMetadata(supabase, results, checkedAt) {
  for (const result of results) {
    const payload = {
      link_check_status: result.status,
      link_check_error: result.errorDetail,
      link_check_http_status: result.httpStatus,
      link_checked_at: checkedAt,
      link_deactivated_at: null,
      link_deactivation_reason: null,
    };

    const { error } = await supabase.from("tools").update(payload).eq("id", result.toolId);
    if (error) {
      throw new Error(`Tool ${result.toolId} audit metadata update başarısız: ${error.message}`);
    }
  }
}

async function deactivateInvalidTools(supabase, invalidLinks, checkedAt) {
  for (const result of invalidLinks) {
    const payload = {
      is_approved: false,
      link_check_status: result.status,
      link_check_error: result.errorDetail,
      link_check_http_status: result.httpStatus,
      link_checked_at: checkedAt,
      link_deactivated_at: checkedAt,
      link_deactivation_reason: result.reason,
    };

    const { error } = await supabase.from("tools").update(payload).eq("id", result.toolId);
    if (error) {
      throw new Error(`Tool ${result.toolId} pasife alınamadı: ${error.message}`);
    }
  }
}

function logSummary(summary) {
  console.log("");
  console.log("Link doğrulama özeti");
  console.log("---------------------");
  console.log(`Taranan araç: ${summary.scannedCount}`);
  console.log(`Geçerli link: ${summary.validCount}`);
  console.log(`Kesin kırık link: ${summary.invalidCount}`);
  console.log(`Manuel inceleme gereken: ${summary.reviewCount}`);
  console.log(`Atlanan: ${summary.skippedCount}`);
  console.log(`Pasife alınan: ${summary.deactivatedCount}`);
}

function logList(title, items) {
  if (items.length === 0) return;

  console.log("");
  console.log(title);
  console.log("-".repeat(title.length));
  for (const item of items) {
    console.log(
      `#${item.toolId} ${item.name} -> ${item.link} [${item.reason}${item.httpStatus ? ` / ${item.httpStatus}` : ""}]`
    );
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = getEnv("SUPABASE_SERVICE_KEY");
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  let query = supabase
    .from("tools")
    .select("id, name, slug, link, is_approved")
    .eq("is_approved", true)
    .order("id", { ascending: true });

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data: tools, error } = await query;
  if (error) {
    throw new Error(`Onaylı araçlar okunamadı: ${error.message}`);
  }

  if (!tools || tools.length === 0) {
    console.log("Onaylı araç bulunamadı.");
    return;
  }

  console.log(`${tools.length} onaylı araç linki kontrol ediliyor...`);

  const results = await mapWithConcurrency(
    tools,
    options.concurrency,
    (tool) => validateToolLink(tool, options.timeoutMs)
  );

  const checkedAt = new Date().toISOString();
  await updateAuditMetadata(supabase, results, checkedAt);

  const grouped = groupResults(results);
  let deactivatedCount = 0;

  if (options.deactivate && grouped.invalidLinks.length > 0) {
    await deactivateInvalidTools(supabase, grouped.invalidLinks, checkedAt);
    deactivatedCount = grouped.invalidLinks.length;
  }

  const report = {
    generatedAt: checkedAt,
    timeoutMs: options.timeoutMs,
    concurrency: options.concurrency,
    deactivateApplied: options.deactivate,
    summary: {
      scannedCount: results.length,
      validCount: grouped.validLinks.length,
      invalidCount: grouped.invalidLinks.length,
      reviewCount: grouped.needsReview.length,
      skippedCount: grouped.skippedLinks.length,
      deactivatedCount,
    },
    validLinks: grouped.validLinks,
    invalidLinks: grouped.invalidLinks,
    needsReview: grouped.needsReview,
    skippedLinks: grouped.skippedLinks,
  };

  const reportPath = await writeReport(report);

  logSummary(report.summary);
  logList("Kesin kırık linkler", grouped.invalidLinks);
  logList("Manuel inceleme gereken linkler", grouped.needsReview);
  logList("Atlanan linkler", grouped.skippedLinks);

  console.log("");
  console.log(`JSON raporu: ${reportPath}`);
  console.log("Araç kayıtlarındaki audit alanları güncellendi.");

  if (!options.deactivate && grouped.invalidLinks.length > 0) {
    console.log(
      `Bu araçları pasife almak için şu komutu kullanın:\n` +
        `npm run tools:audit-links -- --deactivate --confirm=${DEACTIVATE_CONFIRMATION}`
    );
  }
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
