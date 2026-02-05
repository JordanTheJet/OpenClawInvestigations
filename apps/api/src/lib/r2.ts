export async function getSignedUrl(
  bucket: R2Bucket,
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  // For R2, we'll use a simple approach - generate a presigned URL pattern
  // In production, you'd want to use proper R2 presigned URLs
  const object = await bucket.head(key);
  if (!object) {
    throw new Error(`Object not found: ${key}`);
  }
  // Return direct R2 URL (requires public bucket or auth)
  return `https://r2.openclaw.dev/${key}`;
}

export async function uploadDocument(
  bucket: R2Bucket,
  key: string,
  data: ArrayBuffer | ReadableStream,
  contentType: string
): Promise<void> {
  await bucket.put(key, data, {
    httpMetadata: { contentType },
  });
}

export async function getDocument(bucket: R2Bucket, key: string): Promise<R2ObjectBody | null> {
  return bucket.get(key);
}

export async function deleteDocument(bucket: R2Bucket, key: string): Promise<void> {
  await bucket.delete(key);
}
