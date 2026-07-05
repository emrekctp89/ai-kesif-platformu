/**
 * Grok API Integration (xAI)
 * Gerçek Grok API çağrıları için utility
 */

const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';
const GROK_MODEL = 'grok-2-latest';

interface GrokMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GrokResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  error?: {
    message: string;
  };
}

/**
 * Grok ile metin üretimi
 */
export async function generateTextWithGrok(
  prompt: string,
  systemPrompt?: string
): Promise<{ text: string; error?: string }> {
  const apiKey = process.env.XAI_API_KEY;

  if (!apiKey) {
    return {
      text: '',
      error: 'XAI_API_KEY bulunamadı. Lütfen environment variable olarak ekleyin.',
    };
  }

  const messages: GrokMessage[] = [];

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }

  messages.push({ role: 'user', content: prompt });

  try {
    const response = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROK_MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        text: '',
        error: `Grok API Hatası: ${response.status} - ${errorData.error?.message || response.statusText}`,
      };
    }

    const data: GrokResponse = await response.json();

    if (data.error) {
      return {
        text: '',
        error: data.error.message,
      };
    }

    const text = data.choices?.[0]?.message?.content || '';

    return { text };
  } catch (error: any) {
    return {
      text: '',
      error: `Grok API çağrısı başarısız: ${error.message}`,
    };
  }
}

/**
 * Basit Grok çağrısı (system prompt olmadan)
 */
export async function askGrok(prompt: string): Promise<string> {
  const result = await generateTextWithGrok(prompt);
  return result.text || result.error || 'Bir hata oluştu.';
}
