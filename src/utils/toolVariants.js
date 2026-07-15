export function getToolVariants(tool) {
  return Array.isArray(tool?.tool_variants) ? tool.tool_variants : [];
}

export function getActiveToolVariants(tool) {
  return getToolVariants(tool).filter((variant) => !variant?.is_original && variant?.is_active);
}

export function getEditableToolVariants(tool) {
  return getToolVariants(tool).filter((variant) => !variant?.is_original);
}

export function getOriginalToolVariant(tool) {
  const originalVariant = getToolVariants(tool).find((variant) => variant?.is_original);

  return (
    originalVariant || {
      id: tool?.id ? `original-${tool.id}` : 'original',
      title: tool?.name || 'Araç',
      description: tool?.description || '',
      impressions: 0,
      clicks: 0,
    }
  );
}

export function formatRating(value) {
  const rating = Number(value);
  return Number.isFinite(rating) ? rating.toFixed(1) : '0.0';
}
