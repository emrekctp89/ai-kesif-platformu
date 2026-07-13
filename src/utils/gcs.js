import { Storage } from '@google-cloud/storage';
import { getGoogleClientOptions, getGcsBucketName } from '@/utils/googleCredentials';

let storageClient = null;
let bucketClient = null;

function getStorage() {
  if (!storageClient) {
    storageClient = new Storage(getGoogleClientOptions());
  }
  return storageClient;
}

function getBucket() {
  if (!bucketClient) {
    bucketClient = getStorage().bucket(getGcsBucketName());
  }
  return bucketClient;
}

/**
 * Convert various file shapes to Buffer.
 * @param {Buffer|Blob|File|{ arrayBuffer: Function }} file
 */
async function toBuffer(file) {
  if (Buffer.isBuffer(file)) return file;
  if (file instanceof Blob || typeof file?.arrayBuffer === 'function') {
    const arrayBuffer = await file.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
  throw new Error('Geçersiz dosya formatı. File, Blob veya Buffer bekleniyor.');
}

/**
 * Public object URL for a GCS object path.
 * @param {string} objectPath
 */
export function getPublicGcsUrl(objectPath) {
  const bucketName = getGcsBucketName();
  const clean = String(objectPath || '').replace(/^\/+/, '');
  return `https://storage.googleapis.com/${bucketName}/${clean}`;
}

/**
 * Extract object path from a GCS public URL (or return path as-is).
 * @param {string} urlOrPath
 * @returns {string|null}
 */
export function gcsPathFromUrl(urlOrPath) {
  if (!urlOrPath) return null;
  const raw = String(urlOrPath).trim();
  if (!raw) return null;

  if (!raw.startsWith('http://') && !raw.startsWith('https://')) {
    return raw.replace(/^\/+/, '');
  }

  try {
    const url = new URL(raw);
    const bucketName = getGcsBucketName();

    if (url.hostname === 'storage.googleapis.com') {
      const parts = url.pathname.replace(/^\/+/, '').split('/');
      if (parts[0] === bucketName) {
        return parts.slice(1).join('/');
      }
      return parts.slice(1).join('/') || null;
    }

    if (url.hostname === 'storage.cloud.google.com') {
      const parts = url.pathname.replace(/^\/+/, '').split('/');
      return parts.slice(1).join('/') || null;
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Upload a file to Google Cloud Storage.
 * @param {string} destination - Object path (e.g. avatars/uid/file.jpg)
 * @param {Buffer|Blob|File} file
 * @param {string} contentType
 * @returns {Promise<string>} Public URL
 */
export const uploadToGCS = async (destination, file, contentType) => {
  const buffer = await toBuffer(file);
  const objectPath = String(destination || '').replace(/^\/+/, '');
  if (!objectPath) {
    throw new Error('GCS destination path zorunludur.');
  }

  const fileRef = getBucket().file(objectPath);

  await fileRef.save(buffer, {
    resumable: false,
    metadata: {
      contentType: contentType || 'application/octet-stream',
      cacheControl: 'public, max-age=31536000',
    },
  });

  return getPublicGcsUrl(objectPath);
};

/**
 * Delete an object from GCS by path or public URL.
 * @param {string} filePathOrUrl
 */
export const deleteFromGCS = async (filePathOrUrl) => {
  const objectPath = gcsPathFromUrl(filePathOrUrl);
  if (!objectPath) return;

  try {
    await getBucket().file(objectPath).delete({ ignoreNotFound: true });
  } catch (error) {
    if (error?.code !== 404) {
      console.error('GCS Silme Hatası:', error);
    }
  }
};
