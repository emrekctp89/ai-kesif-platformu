export function formatPricing(pricingString, t) {
  if (!pricingString) return null;

  let formatted = pricingString;

  // Replace known Turkish pricing words with translations
  const replacements = {
    Ücretsiz: t('free'),
    Aylık: t('monthly'),
    Yıllık: t('yearly'),
    'Tek Seferlik': t('oneTime'),
    Kredi: t('credits'),
    Ücretli: t('paid'),
  };

  Object.entries(replacements).forEach(([trWord, enWord]) => {
    // Basic string replace, assuming the format is usually like "Aylık $20" or "Ücretsiz"
    if (enWord) {
      formatted = formatted.replace(new RegExp(trWord, 'gi'), enWord);
    }
  });

  return formatted;
}
