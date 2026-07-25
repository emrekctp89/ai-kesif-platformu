import logger from '@/utils/logger';
import { createAdminClient } from '@/utils/supabase/admin';
import { runScheduledScrapeQueue } from '@/lib/toolScrape/scheduler';

function alertDescription(report) {
  const base =
    `Kâşif zamanlanmış scrape: ${report.candidateCount} aday bulundu, ` +
    `${report.failureCount} hata, ${report.retryCount} retry.`;
  return report.quota.remaining === 0 ? `${base} Çalışma kotası tamamen kullanıldı.` : base;
}

async function createScrapeAlert(admin, report) {
  if (report.candidateCount === 0 && report.failureCount === 0) return null;

  const { data, error } = await admin
    .from('admin_alerts')
    .insert({
      alert_type: report.failureCount > 0 ? 'tool_scrape_attention' : 'tool_scrape_candidates',
      description: alertDescription(report),
      status: 'Açık',
      link: '/admin',
      metadata: {
        category_slug: report.categorySlug,
        quota: report.quota,
        candidate_names: report.candidates.map((candidate) => candidate.name),
        candidate_links: report.candidates.map((candidate) => candidate.link),
        failures: report.failures.slice(0, 5),
        completed_at: report.completedAt,
      },
    })
    .select('id')
    .maybeSingle();

  if (error) throw new Error(`Scrape admin uyarısı oluşturulamadı: ${error.message}`);
  return data?.id || null;
}

export async function runScheduledToolScrape(options = {}) {
  const admin = createAdminClient();
  const { data: catalogTools, error: catalogError } = await admin
    .from('tools')
    .select('id, name, slug, link, is_approved')
    .limit(5000);
  if (catalogError) throw new Error(`Scrape katalog indeksi okunamadı: ${catalogError.message}`);

  const report = await runScheduledScrapeQueue({
    ...options,
    catalogTools: catalogTools || [],
  });

  try {
    report.alertId = await createScrapeAlert(admin, report);
  } catch (error) {
    logger.error('Scheduled scrape alert failed:', error);
    report.alertError = error instanceof Error ? error.message : String(error);
  }

  return report;
}
