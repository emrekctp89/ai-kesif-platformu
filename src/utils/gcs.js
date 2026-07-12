import { Storage } from '@google-cloud/storage';
import path from 'path';

let storageInstance = null;
let bucketInstance = null;

function getBucket() {
  if (bucketInstance) return bucketInstance;

  try {
    let storageOptions = {};
    if (process.env.GOOGLE_CREDENTIALS_JSON) {
      storageOptions.credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      storageOptions.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    }
    storageInstance = new Storage(storageOptions);

    const bucketName = process.env.GCS_BUCKET_NAME || 'aikesif-media';
    bucketInstance = storageInstance.bucket(bucketName);
    return bucketInstance;
  } catch (error) {
    console.error('GCS Başlatma Hatası (JSON formatı veya yetki hatalı olabilir):', error);
    throw new Error('Google Cloud Storage başlatılamadı. Lütfen JSON değişkenini kontrol edin.');
  }
}

/**
 * Dosyayı Google Cloud Storage'a yükler
 * @param {string} destination - Hedef klasör ve dosya adı (örn: avatars/123.jpg)
 * @param {Buffer|File|Blob} file - Yüklenecek dosya nesnesi
 * @param {string} contentType - Dosya türü (örn: image/jpeg)
 * @returns {Promise<string>} Yüklenen dosyanın public (genel) URL'si
 */
export const uploadToGCS = async (destination, file, contentType) => {
  let buffer;

  if (file instanceof Blob || typeof file.arrayBuffer === 'function') {
    const arrayBuffer = await file.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  } else if (Buffer.isBuffer(file)) {
    buffer = file;
  } else {
    throw new Error('Geçersiz dosya formatı. File, Blob veya Buffer bekleniyor.');
  }

  const bucket = getBucket();
  const fileRef = bucket.file(destination);

  await fileRef.save(buffer, {
    metadata: {
      contentType: contentType,
      cacheControl: 'public, max-age=31536000',
    },
  });

  return `https://storage.googleapis.com/${bucket.name}/${destination}`;
};

/**
 * Dosyayı Google Cloud Storage'dan siler
 * @param {string} filePath - Silinecek dosyanın yolu (örn: avatars/123.jpg)
 */
export const deleteFromGCS = async (filePath) => {
  if (!filePath) return;

  try {
    const bucket = getBucket();
    const fileRef = bucket.file(filePath);
    await fileRef.delete();
  } catch (error) {
    console.error('GCS Silme Hatası:', error);
    // Dosya bulunamadı hatasını yoksayabiliriz (zaten silinmiş demektir)
  }
};
