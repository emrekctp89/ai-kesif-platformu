'use server';

import { generateTextWithGrok } from '@/lib/ai/grok';

export async function generateChallenge(prompt) {
  if (!prompt || prompt.trim().length < 5) {
    return { error: 'Lütfen bir konu belirtin.' };
  }

  const systemPrompt = `Sen yaratıcı ve eğitici yazılım challenge'ları oluşturan bir uzmansın.`;

  const userPrompt = `Kullanıcı şu konuda bir challenge istiyor: "${prompt}"

Lütfen şu yapıda bir challenge üret:
- Challenge başlığı
- Açıklama
- Gereksinimler (3-5 madde)
- Bonus görevler
- Zorluk seviyesi

Cevabı Türkçe ver.`;

  const result = await generateTextWithGrok(userPrompt, systemPrompt);

  if (result.error) {
    return { error: result.error };
  }

  return { challenge: result.text };
}
