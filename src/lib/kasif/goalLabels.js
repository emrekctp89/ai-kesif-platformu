/**
 * Kâşif goal id → kullanıcıya gösterilecek etiketler.
 */

export const GOAL_LABELS = {
  tr: {
    'meeting-notes': 'Toplantı notları',
    'coding-assistant': 'Kod asistanı',
    'image-generation': 'Görsel üretim',
    'video-generation': 'Video üretim',
    'voice-generation': 'Seslendirme',
    'music-generation': 'Müzik üretim',
    'workflow-automation': 'Otomasyon',
    'data-analysis': 'Veri analizi',
    'content-writing': 'İçerik yazımı',
    translation: 'Çeviri',
    'presentation-creation': 'Sunum',
    'logo-design': 'Logo tasarım',
    'ui-design': 'UI/UX tasarım',
    'chatbot-assistant': 'Sohbet asistanı',
    'email-writing': 'E-posta yazımı',
    'seo-optimization': 'SEO',
    'customer-support': 'Müşteri destek',
    'ecommerce-copy': 'E-ticaret metni',
    'sales-crm': 'Satış / CRM',
    'learning-tutor': 'Öğrenme asistanı',
    'legal-review': 'Hukuki inceleme',
    'three-d-generation': '3D üretim',
  },
  en: {
    'meeting-notes': 'Meeting notes',
    'coding-assistant': 'Coding assistant',
    'image-generation': 'Image generation',
    'video-generation': 'Video generation',
    'voice-generation': 'Voice generation',
    'music-generation': 'Music generation',
    'workflow-automation': 'Automation',
    'data-analysis': 'Data analysis',
    'content-writing': 'Content writing',
    translation: 'Translation',
    'presentation-creation': 'Presentation',
    'logo-design': 'Logo design',
    'ui-design': 'UI/UX design',
    'chatbot-assistant': 'Chat assistant',
    'email-writing': 'Email writing',
    'seo-optimization': 'SEO',
    'customer-support': 'Customer support',
    'ecommerce-copy': 'Ecommerce copy',
    'sales-crm': 'Sales / CRM',
    'learning-tutor': 'Learning tutor',
    'legal-review': 'Legal review',
    'three-d-generation': '3D generation',
  },
};

export function formatKasifGoalLabel(goal, locale = 'tr') {
  const key = String(goal || '').trim();
  if (!key) return '';
  const pack = GOAL_LABELS[locale] || GOAL_LABELS.tr;
  return pack[key] || GOAL_LABELS.tr[key] || key;
}

export function formatKasifGoalLabels(goals = [], locale = 'tr') {
  return (Array.isArray(goals) ? goals : [])
    .map((goal) => formatKasifGoalLabel(goal, locale))
    .filter(Boolean);
}
