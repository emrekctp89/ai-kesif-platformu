import { Storage } from '@google-cloud/storage';
import path from 'path';

// Google Cloud Storage istemcisini başlat
const storage = new Storage({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

const bucketName = process.env.GCS_BUCKET_NAME || 'aikesif-media';
const bucket = storage.bucket(bucketName);

/**
 * Dosyayı Google Cloud Storage'a yükler
 * @param {string} destination - Hedef klasör ve dosya adı (örn: avatars/123.jpg)
 * @param {Buffer|File|Blob} file - Yüklenecek dosya nesnesi
 * @param {string} contentType - Dosya türü (örn: image/jpeg)
 * @returns {Promise<string>} Yüklenen dosyanın public (genel) URL'si
 */
export const uploadToGCS = async (destination, file, contentType) => {
  let buffer;

  // File veya Blob objesiyse ArrayBuffer'a çevirip Buffer yapıyoruz
  if (file instanceof Blob || typeof file.arrayBuffer === 'function') {
    const arrayBuffer = await file.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  } else if (Buffer.isBuffer(file)) {
    buffer = file;
  } else {
    throw new Error('Geçersiz dosya formatı. File, Blob veya Buffer bekleniyor.');
  }

  const fileRef = bucket.file(destination);

  await fileRef.save(buffer, {
    metadata: {
      contentType: contentType,
      // CDN ve önbellek kontrolü için:
      cacheControl: 'public, max-age=31536000',
    },
  });

  // Public URL oluşturma
  return `https://storage.googleapis.com/${bucketName}/${destination}`;
};

/**
 * Dosyayı Google Cloud Storage'dan siler
 * @param {string} filePath - Silinecek dosyanın yolu (örn: avatars/123.jpg)
 */
export const deleteFromGCS = async (filePath) => {
  if (!filePath) return;

  try {
    const fileRef = bucket.file(filePath);
    await fileRef.delete();
  } catch (error) {
    console.error('GCS Silme Hatası:', error);
    // Dosya bulunamadı hatasını yoksayabiliriz (zaten silinmiş demektir)
  }
};
