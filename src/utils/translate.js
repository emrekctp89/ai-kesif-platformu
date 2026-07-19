import logger from '@/utils/logger';
import { v2 } from '@google-cloud/translate';
import { getGoogleClientOptions } from '@/utils/googleCredentials';

let translateClient = null;

function getTranslateClient() {
  if (!translateClient) {
    translateClient = new v2.Translate(getGoogleClientOptions());
  }
  return translateClient;
}

/**
 * Translates text into the requested target language using Google Cloud Translation.
 *
 * @param {string} text
 * @param {string} targetLanguage
 * @returns {Promise<string>}
 */
export async function translateText(text, targetLanguage = 'tr') {
  if (!text) return text;
  if (!targetLanguage) {
    throw new Error('Hedef dil kodu zorunludur.');
  }

  try {
    const translate = getTranslateClient();
    const [translations] = await translate.translate(text, targetLanguage);
    return translations;
  } catch (error) {
    logger.error('Google Cloud Translation Hatası:', error);
    throw new Error('Çeviri işlemi sırasında bir hata oluştu.');
  }
}
