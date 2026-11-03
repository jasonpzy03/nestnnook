// Vercel deployments must never write room photos to the ephemeral function filesystem,
// even when NODE_ENV has accidentally been configured as development.
export function localUploadsEnabled(): boolean {
  return (
    process.env.ALLOW_LOCAL_UPLOADS === 'true' &&
    process.env.NODE_ENV !== 'production' &&
    !process.env.VERCEL
  );
}

export function blobUploadsEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}
