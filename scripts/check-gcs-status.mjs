import { readFileSync, existsSync } from 'node:fs';
import { Storage } from '@google-cloud/storage';

function loadEnvLocal() {
  if (!existsSync('.env.local')) return;
  const t = readFileSync('.env.local', 'utf8');
  for (const line of t.split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i < 0) continue;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    v = v.replace(/\\n/g, '\n').replace(/\\"/g, '"');
    if (!(k in process.env) || !process.env[k]) process.env[k] = v;
  }
}

loadEnvLocal();

const bucketName = process.env.GCS_BUCKET_NAME || 'aikesif-media';
const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const hasJson = Boolean(process.env.GCP_SERVICE_ACCOUNT_JSON?.trim());

console.log('--- GCS check ---');
console.log('bucket:', bucketName);
console.log('keyFilename set:', Boolean(keyFile), keyFile || '');
console.log('GCP_SERVICE_ACCOUNT_JSON set:', hasJson);
console.log('credentials file exists:', keyFile ? existsSync(keyFile) : false);

let clientOptions = {};
if (process.env.GCP_SERVICE_ACCOUNT_JSON?.trim()) {
  try {
    let raw = process.env.GCP_SERVICE_ACCOUNT_JSON.trim();
    if (!raw.startsWith('{')) {
      raw = Buffer.from(raw, 'base64').toString('utf8');
    }
    clientOptions = { credentials: JSON.parse(raw) };
    console.log('auth mode: GCP_SERVICE_ACCOUNT_JSON');
  } catch (e) {
    console.log('auth mode: JSON parse FAILED:', e.message);
  }
} else if (keyFile) {
  clientOptions = { keyFilename: keyFile };
  console.log('auth mode: keyFilename');
}

const storage = new Storage(clientOptions);
const bucket = storage.bucket(bucketName);

try {
  // Object-level probe only. storage.buckets.get is NOT required for uploads
  // (objectAdmin can write while buckets.get returns 403).
  try {
    const [exists] = await bucket.exists();
    console.log('bucket.exists():', exists, '(optional; 403 means missing buckets.get IAM)');
  } catch (e) {
    console.log(
      'bucket.exists(): SKIP',
      e.code || '',
      '(ok if service account is object-level only)'
    );
  }

  const testPath = `_healthcheck/${Date.now()}.txt`;
  const file = bucket.file(testPath);
  await file.save(Buffer.from('gcs-ok'), {
    resumable: false,
    metadata: { contentType: 'text/plain', cacheControl: 'no-store' },
  });
  console.log('upload: OK', testPath);

  const [buf] = await file.download();
  console.log('download: OK', buf.toString());

  await file.delete({ ignoreNotFound: true });
  console.log('delete: OK');

  console.log(
    'public URL pattern:',
    `https://storage.googleapis.com/${bucketName}/<object>`
  );
  console.log('RESULT: PASS — credentials + object read/write work');
} catch (error) {
  console.log('RESULT: FAIL');
  console.log('code:', error.code || error.statusCode || 'n/a');
  console.log('message:', error.message);
  process.exit(1);
}
