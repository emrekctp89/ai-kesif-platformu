const SENSITIVE_KEY_PATTERN =
  /email|token|secret|password|authorization|cookie|customer|user|prompt|message/i;

function sanitizeDetails(details = {}) {
  return Object.fromEntries(
    Object.entries(details).map(([key, value]) => [
      key,
      SENSITIVE_KEY_PATTERN.test(key) ? "[redacted]" : value,
    ])
  );
}

export function logServerError(context, error, details) {
  const payload = {
    level: "error",
    context,
    message: error instanceof Error ? error.message : String(error),
    digest: error?.digest,
    details: sanitizeDetails(details),
    timestamp: new Date().toISOString(),
  };

  console.error("[app-error]", JSON.stringify(payload));
}
