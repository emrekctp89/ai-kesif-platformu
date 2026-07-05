'use server';

import { generateTextWithGrok } from '@/lib/ai/grok';

export async function getProjectSuggestions(projectDescription) {
  if (!projectDescription || projectDescription.trim().length < 10) {
    return { error: 'Lütfen proje açıklamasını daha detaylı yazın.' };
  }

  const systemPrompt = `Öneriler:
Kullanıcının proje fikrine göre gerçekçi, uygulanabilir ve modern teknoloji stack'leri öner.
Cevabı Türkçe ver.`;

  const prompt = `Kullanıcı şu proje fikrini verdi: "${projectDescription}"

Lütfen şu formatta öneriler üret:
1. Proje adı önerisi
2. Kullanılması önerilen ana teknolojiler
3. MVP için önerilen özellikler
4. Potansiyel zorluklar
5. Tahmini geliştirme süresi

Cevabını Türkçe ver.`;

  const result = await generateTextWithGrok(prompt, systemPrompt);

  if (result.error) {
    return { error: result.error };
  }

  return { suggestion: result.text };
}
