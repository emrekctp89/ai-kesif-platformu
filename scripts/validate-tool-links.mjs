import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const DEFAULT_TIMEOUT_MS = 7000;
const MIN_TIMEOUT_MS = 1000;
const MAX_EMAIL_PREVIEW_ITEMS = 15;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const SKIPPED_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^\[?::1\]?$/,
  /^0\.0\.0\.0$/,
  /\.localhost$/i,
  /\.local$/i,
  /^test(?:[.-]|$)/i,
  /\.test$/i,
  /^example(?:[.-]|$)/i,
  /\.example$/i,
  /\.invalid$/i,
];

function printHelp() {
  console.log(`
Tool link validation utility

Usage:
  node scripts/validate-tool-links.mjs [options]

Options:
  --cleanup=none|soft|hard   Cleanup mode (default: none)
  --confirm                  Required for soft/hard cleanup to execute
  --timeout=7000             Per-link timeout in milliseconds
  --limit=50                 Validate only the first N approved tools
  --output-dir=./scripts/reports
                             Directory for CSV and JSON reports
  --admin-email=name@site    Override admin summary email address
  --no-email                 Skip sending the summary email
  --help                     Show this message

Examples:
  node scripts/validate-tool-links.mjs
  node scripts/validate-tool-links.mjs --cleanup=soft --confirm
  node scripts/validate-tool-links.mjs --cleanup=hard --confirm --timeout=10000
`.trim());
}

function getArgValue(arg) {
  const separatorIndex = arg.indexOf("=");
  if (separatorIndex === -1) return null;
  const value = arg.slice(separatorIndex + 1).trim();
  return value || null;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function parseArgs(argv) {
  const options = {
    cleanup: "none",
    confirm: false,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    limit: null,
    outputDir: path.join(process.cwd(), "scripts", "reports"),
    adminEmail: process.env.ADMIN_EMAIL || "",
    sendEmail: true,
    help: false,
  };

  for (const arg of argv) {
    if (arg === "--confirm") {
      options.confirm = true;
      continue;
    }
    if (arg === "--help") {
      options.help = true;
      continue;
    }
    if (arg === "--no-email") {
      options.sendEmail = false;
      continue;
    }
    if (arg.startsWith("--cleanup=")) {
      const value = getArgValue(arg);
      if (!value) throw new Error("Cleanup mode cannot be empty.");
      options.cleanup = value;
      continue;
    }
    if (arg.startsWith("--timeout=")) {
      const value = getArgValue(arg);
      if (!value) throw new Error("Timeout value cannot be empty.");
      options.timeoutMs = Number(value);
      continue;
    }
    if (arg.startsWith("--limit=")) {
      const value = getArgValue(arg);
      if (!value) throw new Error("Limit value cannot be empty.");
      options.limit = Number(value);
      continue;
    }
    if (arg.startsWith("--output-dir=")) {
      const value = getArgValue(arg);
      if (!value) throw new Error("Output directory cannot be empty.");
      options.outputDir = path.resolve(value);
      continue;
    }
    if (arg.startsWith("--admin-email=")) {
      const value = getArgValue(arg);
      if (!value) throw new Error("Admin email cannot be empty.");
      options.adminEmail = value;
      continue;
    }
  }

  if (!["none", "soft", "hard"].includes(options.cleanup)) {
    throw new Error(`Unsupported cleanup mode: ${options.cleanup}`);
  }
  if (!Number.isFinite(options.timeoutMs) || options.timeoutMs < MIN_TIMEOUT_MS) {
    throw new Error(`Timeout must be a number greater than or equal to ${MIN_TIMEOUT_MS} ms.`);
  }
  if (options.limit !== null && (!Number.isInteger(options.limit) || options.limit <= 0)) {
    throw new Error("Limit must be a positive integer.");
  }

  options.dryRun = options.cleanup === "none" || !options.confirm;
  return options;
}

function getRequiredEnv(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) {
    throw new Error(`${name} environment variable is required.`);
  }
  return value;
}

function createSupabaseAdminClient() {
  return createClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("SUPABASE_SERVICE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

export function normalizeCandidateUrl(rawValue) {
  const value = String(rawValue || "").trim();
  if (!value) return null;

  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    const url = new URL(withProtocol);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

export function getSkipReason(urlString) {
  const normalizedUrl = normalizeCandidateUrl(urlString);
  if (!normalizedUrl) return "Invalid URL";

  const hostname = new URL(normalizedUrl).hostname.toLowerCase();
  const matchedPattern = SKIPPED_HOST_PATTERNS.some((pattern) => pattern.test(hostname));
  if (!matchedPattern) return null;

  return `Skipped test/local domain: ${hostname}`;
}

function serializeError(error) {
  if (!error) return "Unknown error";
  if (error.name === "AbortError") return "Request timed out";
  return error.message || String(error);
}

async function requestUrl(url, { method, timeoutMs, redirect = "follow" }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      redirect,
      signal: controller.signal,
      headers: {
        "user-agent": "ai-kesif-platform-link-validator/1.0",
      },
    });
    await response.body?.cancel?.();
    return { response };
  } catch (error) {
    return { error };
  } finally {
    clearTimeout(timeout);
  }
}

export async function validateToolLink(rawUrl, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const normalizedUrl = normalizeCandidateUrl(rawUrl);
  if (!normalizedUrl) {
    return {
      category: "skipped",
      reason: "Invalid URL",
      finalUrl: null,
      statusCode: null,
      checkedWith: null,
    };
  }

  const skipReason = getSkipReason(normalizedUrl);
  if (skipReason) {
    return {
      category: "skipped",
      reason: skipReason,
      finalUrl: normalizedUrl,
      statusCode: null,
      checkedWith: null,
    };
  }

  const headAttempt = await requestUrl(normalizedUrl, {
    method: "HEAD",
    timeoutMs,
    redirect: "manual",
  });

  if (headAttempt.response) {
    const { response } = headAttempt;

    if (response.ok) {
      return {
        category: "valid",
        reason: `HEAD ${response.status}`,
        finalUrl: normalizedUrl,
        statusCode: response.status,
        checkedWith: "HEAD",
      };
    }

    if (REDIRECT_STATUSES.has(response.status)) {
      const location = response.headers.get("location");
      if (!location) {
        return {
          category: "broken",
          reason: `Redirect response without location header (${response.status})`,
          finalUrl: normalizedUrl,
          statusCode: response.status,
          checkedWith: "HEAD",
        };
      }

      const redirectUrl = new URL(location, normalizedUrl).toString();
      const redirectSkipReason = getSkipReason(redirectUrl);
      if (redirectSkipReason) {
        return {
          category: "skipped",
          reason: redirectSkipReason,
          finalUrl: redirectUrl,
          statusCode: response.status,
          checkedWith: "HEAD",
        };
      }

      const redirectAttempt = await requestUrl(redirectUrl, {
        method: "GET",
        timeoutMs,
        redirect: "follow",
      });

      if (redirectAttempt.response?.ok) {
        return {
          category: "redirect",
          reason: `${response.status} redirect to ${redirectAttempt.response.url}`,
          finalUrl: redirectAttempt.response.url,
          statusCode: redirectAttempt.response.status,
          checkedWith: "HEAD→GET",
        };
      }

      return {
        category: "broken",
        reason: redirectAttempt.error
          ? `Redirect target error: ${serializeError(redirectAttempt.error)}`
          : `Redirect target returned ${redirectAttempt.response?.status || "unknown status"}`,
        finalUrl: redirectAttempt.response?.url || redirectUrl,
        statusCode: redirectAttempt.response?.status || response.status,
        checkedWith: "HEAD→GET",
      };
    }
  }

  const getAttempt = await requestUrl(normalizedUrl, {
    method: "GET",
    timeoutMs,
    redirect: "follow",
  });

  if (getAttempt.response?.ok) {
    const finalUrl = getAttempt.response.url || normalizedUrl;
    const isRedirected = finalUrl !== normalizedUrl || getAttempt.response.redirected;
    return {
      category: isRedirected ? "redirect" : "valid",
      reason: `${getAttempt.response.status}${isRedirected ? ` via ${finalUrl}` : ""}`,
      finalUrl,
      statusCode: getAttempt.response.status,
      checkedWith: "GET",
    };
  }

  const failureReason = getAttempt.error
    ? serializeError(getAttempt.error)
    : `HTTP ${getAttempt.response?.status || "unknown"}`;

  return {
    category: "broken",
    reason: failureReason,
    finalUrl: getAttempt.response?.url || normalizedUrl,
    statusCode: getAttempt.response?.status || headAttempt.response?.status || null,
    checkedWith: getAttempt.error ? "GET" : "HEAD→GET",
  };
}

function toPercent(part, total) {
  if (!total) return "0.0%";
  return `${((part / total) * 100).toFixed(1)}%`;
}

function buildRecommendations(summary) {
  const recommendations = [];

  if (summary.brokenCount > 0) {
    recommendations.push(
      "Review broken tools first; soft-delete them before using permanent deletion."
    );
  }
  if (summary.redirectCount > 0) {
    recommendations.push("Update redirected links in the database to their final destination.");
  }
  if (summary.skippedCount > 0) {
    recommendations.push(
      "Inspect skipped localhost/test/invalid entries manually before approving them again."
    );
  }
  if (summary.executedCleanup === "none") {
    recommendations.push(
      "Re-run the utility with --cleanup=soft --confirm after reviewing the dry-run report."
    );
  }

  return recommendations;
}

function buildCsv(rows) {
  const headers = [
    "tool_id",
    "tool_name",
    "slug",
    "original_link",
    "category",
    "status_code",
    "final_url",
    "checked_with",
    "reason",
    "cleanup_action",
  ];

  const escapeCell = (value) =>
    `"${String(value ?? "")
      .replace(/"/g, '""')
      .replace(/\r?\n/g, " ")}"`;

  return [
    headers.join(","),
    ...rows.map((row) =>
      [
        row.id,
        row.name,
        row.slug,
        row.link,
        row.validation.category,
        row.validation.statusCode,
        row.validation.finalUrl,
        row.validation.checkedWith,
        row.validation.reason,
        row.cleanupAction,
      ]
        .map(escapeCell)
        .join(",")
    ),
  ].join("\n");
}

async function writeReports(report, outputDir) {
  await fs.mkdir(outputDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const csvPath = path.join(outputDir, `tool-link-validation-${timestamp}.csv`);
  const jsonPath = path.join(outputDir, `tool-link-validation-${timestamp}.json`);

  await fs.writeFile(csvPath, buildCsv(report.rows), "utf8");
  await fs.writeFile(jsonPath, JSON.stringify(report, null, 2), "utf8");

  return { csvPath, jsonPath };
}

async function sendSummaryEmail(report, options, attachments) {
  if (!options.sendEmail) return { skipped: "Email sending disabled with --no-email." };
  if (!options.adminEmail) return { skipped: "ADMIN_EMAIL is not configured." };
  if (!process.env.RESEND_API_KEY) return { skipped: "RESEND_API_KEY is not configured." };
  if (!process.env.RESEND_FROM_EMAIL) {
    return { skipped: "RESEND_FROM_EMAIL is not configured." };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.RESEND_FROM_EMAIL;
  const brokenPreview = report.brokenTools
    .slice(0, MAX_EMAIL_PREVIEW_ITEMS)
    .map(
      (tool) =>
        `<li><strong>${escapeHtml(tool.name)}</strong> — ${escapeHtml(tool.link)} (${escapeHtml(
          tool.validation.reason
        )})</li>`
    )
    .join("");

  const html = `
    <h2>Tool link validation summary</h2>
    <p><strong>Cleanup mode:</strong> ${report.summary.executedCleanup}</p>
    <p><strong>Total checked:</strong> ${report.summary.totalChecked}</p>
    <ul>
      <li>Valid: ${report.summary.validCount} (${report.summary.validPercent})</li>
      <li>Redirects: ${report.summary.redirectCount} (${report.summary.redirectPercent})</li>
      <li>Broken: ${report.summary.brokenCount} (${report.summary.brokenPercent})</li>
      <li>Skipped: ${report.summary.skippedCount} (${report.summary.skippedPercent})</li>
    </ul>
    <p><strong>Tools changed:</strong> ${report.summary.changedCount}</p>
    <p><strong>CSV:</strong> ${attachments.csvPath}</p>
    <p><strong>JSON:</strong> ${attachments.jsonPath}</p>
    ${brokenPreview ? `<h3>Broken link preview</h3><ul>${brokenPreview}</ul>` : ""}
  `;

  const { data, error } = await resend.emails.send({
    from,
    to: [options.adminEmail],
    subject: `Tool link validation summary (${report.summary.brokenCount} broken)`,
    html,
  });

  if (error) {
    return { error: error.message || "Unknown email error" };
  }

  return { success: true, id: data?.id || null };
}

async function fetchApprovedTools(supabase, limit) {
  let query = supabase
    .from("tools")
    .select("id, name, slug, link, is_approved, created_at, updated_at")
    .eq("is_approved", true)
    .order("created_at", { ascending: true });

  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function applyCleanup(supabase, brokenRows, cleanupMode) {
  if (cleanupMode === "none" || brokenRows.length === 0) {
    return { changedCount: 0, changedIds: [] };
  }

  const ids = brokenRows.map((row) => row.id);

  if (cleanupMode === "soft") {
    const { error } = await supabase
      .from("tools")
      .update({
        is_approved: false,
        updated_at: new Date().toISOString(),
      })
      .in("id", ids);

    if (error) throw error;
  } else {
    const { error } = await supabase.from("tools").delete().in("id", ids);
    if (error) throw error;
  }

  return { changedCount: ids.length, changedIds: ids };
}

function summarizeReport(rows, options, cleanupResult) {
  const totalChecked = rows.length;
  const validCount = rows.filter((row) => row.validation.category === "valid").length;
  const redirectCount = rows.filter((row) => row.validation.category === "redirect").length;
  const brokenCount = rows.filter((row) => row.validation.category === "broken").length;
  const skippedCount = rows.filter((row) => row.validation.category === "skipped").length;

  const summary = {
    runAt: new Date().toISOString(),
    totalChecked,
    validCount,
    validPercent: toPercent(validCount, totalChecked),
    redirectCount,
    redirectPercent: toPercent(redirectCount, totalChecked),
    brokenCount,
    brokenPercent: toPercent(brokenCount, totalChecked),
    skippedCount,
    skippedPercent: toPercent(skippedCount, totalChecked),
    cleanupMode: options.cleanup,
    dryRun: options.dryRun,
    executedCleanup: options.dryRun ? "none" : options.cleanup,
    changedCount: cleanupResult.changedCount,
  };

  return {
    summary,
    recommendations: buildRecommendations(summary),
  };
}

function printConsoleSummary(report, attachments, emailResult) {
  const { summary } = report;
  console.log("\nLink validation completed.");
  console.log(`Checked:    ${summary.totalChecked}`);
  console.log(`Valid:      ${summary.validCount} (${summary.validPercent})`);
  console.log(`Redirects:  ${summary.redirectCount} (${summary.redirectPercent})`);
  console.log(`Broken:     ${summary.brokenCount} (${summary.brokenPercent})`);
  console.log(`Skipped:    ${summary.skippedCount} (${summary.skippedPercent})`);
  console.log(`Cleanup:    ${summary.executedCleanup}`);
  console.log(`Changed:    ${summary.changedCount}`);
  console.log(`CSV report: ${attachments.csvPath}`);
  console.log(`JSON log:   ${attachments.jsonPath}`);

  if (report.brokenTools.length > 0) {
    console.log("\nBroken tools:");
    for (const tool of report.brokenTools) {
      console.log(`- ${tool.name} (${tool.link}) -> ${tool.validation.reason}`);
    }
  }

  if (report.recommendations.length > 0) {
    console.log("\nRecommendations:");
    for (const recommendation of report.recommendations) {
      console.log(`- ${recommendation}`);
    }
  }

  if (emailResult?.success) {
    console.log(`\nAdmin summary email sent (${emailResult.id || "no id"}).`);
  } else if (emailResult?.skipped) {
    console.log(`\nAdmin summary email skipped: ${emailResult.skipped}`);
  } else if (emailResult?.error) {
    console.log(`\nAdmin summary email failed: ${emailResult.error}`);
  }

  if (report.summary.cleanupMode !== "none" && report.summary.dryRun) {
    console.log("\nCleanup was not executed because --confirm was not provided.");
  }
}

export async function runToolLinkValidation(rawOptions = {}) {
  const options = {
    ...rawOptions,
    timeoutMs: rawOptions.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  };
  const supabase = createSupabaseAdminClient();
  const tools = await fetchApprovedTools(supabase, options.limit ?? null);

  const rows = [];
  for (const tool of tools) {
    const validation = await validateToolLink(tool.link, {
      timeoutMs: options.timeoutMs,
    });
    rows.push({
      ...tool,
      validation,
      cleanupAction:
        validation.category === "broken" && !options.dryRun && options.cleanup !== "none"
          ? options.cleanup
          : "none",
    });
  }

  const brokenRows = rows.filter((row) => row.validation.category === "broken");
  const cleanupResult = options.dryRun
    ? { changedCount: 0, changedIds: [] }
    : await applyCleanup(supabase, brokenRows, options.cleanup);

  const reportBase = summarizeReport(rows, options, cleanupResult);
  const report = {
    ...reportBase,
    rows,
    brokenTools: brokenRows,
    toolsToRemoveOrDisable: brokenRows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      link: row.link,
      reason: row.validation.reason,
      recommendedAction: options.cleanup === "hard" ? "delete" : "disable",
    })),
    auditTrail: {
      changedIds: cleanupResult.changedIds,
      changedTools: rows.filter((row) => cleanupResult.changedIds.includes(row.id)),
    },
  };

  const attachments = await writeReports(report, options.outputDir);
  const emailResult = await sendSummaryEmail(report, options, attachments);

  return { report, attachments, emailResult };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const { report, attachments, emailResult } = await runToolLinkValidation(options);
  printConsoleSummary(report, attachments, emailResult);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("Tool link validation failed:", error);
    process.exitCode = 1;
  });
}
