import { v2 } from '@google-cloud/translate';
import path from 'path';

let translateInstance = null;

function getTranslateClient() {
  if (translateInstance) return translateInstance;

  try {
    let translateOptions = {};
    if (process.env.GOOGLE_CREDENTIALS_JSON) {
      translateOptions.credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      translateOptions.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    }
    translateInstance = new v2.Translate(translateOptions);
    return translateInstance;
  } catch (error) {
    console.error('Translation Başlatma Hatası:', error);
    throw new Error(
      'Google Cloud Translation başlatılamadı. Lütfen JSON değişkenini kontrol edin.'
    );
  }
}

/**
 * Verilen metni hedef dile çevirir.
 * @param {string|string[]} text - Çevrilecek metin veya metin dizisi
 * @param {string} targetLanguage - Hedef dil kodu (örn: 'tr' Türkçe için, 'en' İngilizce için)
 * @returns {Promise<string|string[]>} Çevrilmiş metin(ler)
 */
export async function translateText(text, targetLanguage = 'tr') {
  if (!text) return text;

  try {
    const translate = getTranslateClient();
    const [translations] = await translate.translate(text, targetLanguage);

    // Eğer dizi geldiyse diziyi, tek metin geldiyse tek metni döndür.
    return translations;
  } catch (error) {
    console.error('Google Cloud Translation Hatası:', error);
    throw new Error('Çeviri işlemi sırasında bir hata oluştu.');
  }
}
