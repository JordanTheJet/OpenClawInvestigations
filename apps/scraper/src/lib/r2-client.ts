import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { createHash } from 'crypto';

export function createR2Client() {
  return new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT!,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

export async function uploadToR2(
  client: S3Client,
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<void> {
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

export async function objectExists(client: S3Client, key: string): Promise<boolean> {
  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
      })
    );
    return true;
  } catch {
    return false;
  }
}

export function computeHash(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

export function generateR2Key(source: string, hash: string, fileName: string): string {
  const ext = fileName.split('.').pop() || 'bin';
  return `${source}/${hash.slice(0, 2)}/${hash.slice(2, 4)}/${hash}.${ext}`;
}
