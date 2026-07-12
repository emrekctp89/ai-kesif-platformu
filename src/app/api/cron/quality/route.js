import { NextResponse } from 'next/server';
import { runToolQualityAutomation } from '@/app/actions/tools';

// Sadece Vercel Cron veya Google Cloud Scheduler tarafından tetiklenebilen uç nokta
export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // URL parametresinden veya Header'dan secret kontrolü
  const requestUrl = new URL(request.url);
  const secretParam = requestUrl.searchParams.get('secret');

  if (authHeader !== `Bearer ${cronSecret}` && secretParam !== cronSecret) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  try {
    // Mevcut Server Action'ı çağır
    const result = await runToolQualityAutomation();

    return NextResponse.json(
      {
        success: true,
        message: 'Kalite otomasyonu başarıyla tamamlandı.',
        details: result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Cron job hatası:', error);
    return NextResponse.json({ error: 'İşlem sırasında bir hata oluştu.' }, { status: 500 });
  }
}
