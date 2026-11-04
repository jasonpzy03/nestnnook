const MB = 1024 * 1024;

/** Resize large camera photos before sending them through the API proxy. */
export async function preparePhoto(file: File): Promise<File> {
  if (!file.size) throw new Error('This photo is empty. Choose another photo.');
  if (file.size > 25 * MB) throw new Error('Choose a photo smaller than 25 MB.');
  const supported =
    /image\/(jpeg|png|webp)/i.test(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name);
  const heic = /image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
  if (!supported && !heic) throw new Error('Choose a JPEG, PNG, WebP or HEIC/HEIF photo.');
  if (supported && file.size <= MB) return file;

  const url = URL.createObjectURL(file);
  const photo = new Image();
  const canvas = document.createElement('canvas');
  try {
    const load = (source: string) =>
      new Promise<void>((resolve, reject) => {
        photo.onload = () => resolve();
        photo.onerror = () =>
          reject(
            new Error(
              heic
                ? 'This browser cannot read HEIC photos. Export the photo as JPEG, or choose a screenshot of it.'
                : 'This photo could not be read. Try exporting it as JPEG or choosing another photo.',
            ),
          );
        photo.src = source;
      });
    try {
      await load(url);
    } catch (error) {
      if (!heic) throw error;
      let convertedUrl: string | undefined;
      try {
        // Load the decoder only when the browser cannot decode an iPhone photo itself.
        const { default: convert } = await import('heic2any');
        const result = await convert({ blob: file, toType: 'image/jpeg', quality: 0.85 });
        const converted = Array.isArray(result) ? result[0] : result;
        if (!converted) throw new Error('No image was converted.');
        convertedUrl = URL.createObjectURL(converted);
        await load(convertedUrl);
      } catch {
        throw new Error(
          'This HEIC/HEIF photo could not be converted. Export it as JPEG or choose a screenshot of it, then retry.',
        );
      } finally {
        if (convertedUrl) URL.revokeObjectURL(convertedUrl);
      }
    }
    if (!photo.naturalWidth || !photo.naturalHeight)
      throw new Error('This photo could not be read. Choose another photo.');
    const scale = Math.min(1, 1920 / Math.max(photo.naturalWidth, photo.naturalHeight));
    canvas.width = Math.max(1, Math.round(photo.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(photo.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not prepare this photo. Try a smaller JPEG photo.');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(photo, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.85, 0.7, 0.55]) {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', quality),
      );
      if (blob && blob.size <= 2 * MB)
        return new File([blob], 'room-photo.jpg', { type: 'image/jpeg' });
    }
    throw new Error('This photo is still too large. Choose a smaller photo.');
  } finally {
    URL.revokeObjectURL(url);
    canvas.width = canvas.height = 0;
  }
}
