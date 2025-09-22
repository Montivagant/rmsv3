export interface PreparedImage {
  dataUrl: string;
  mimeType: string;
  width: number;
  height: number;
  size: number;
  fileName?: string;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = (error) => reject(error);
    image.src = dataUrl;
  });
}

function calculateSizeFromDataUrl(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1];
  if (!base64) return 0;
  return Math.round((base64.length * 3) / 4);
}

export async function prepareImageForMenuItem(file: File, maxDimension = 256): Promise<PreparedImage> {
  const originalDataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(originalDataUrl);

  let targetWidth = image.width;
  let targetHeight = image.height;

  const maxInput = Math.max(image.width, image.height);
  if (maxInput > maxDimension) {
    const scale = maxDimension / maxInput;
    targetWidth = Math.round(image.width * scale);
    targetHeight = Math.round(image.height * scale);
  }

  let finalDataUrl = originalDataUrl;
  if (targetWidth !== image.width || targetHeight !== image.height) {
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to initialise canvas context');
    ctx.drawImage(image, 0, 0, targetWidth, targetHeight);
    const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    finalDataUrl = canvas.toDataURL(mimeType, 0.85);
  }

  return {
    dataUrl: finalDataUrl,
    mimeType: file.type || 'image/jpeg',
    width: targetWidth,
    height: targetHeight,
    size: calculateSizeFromDataUrl(finalDataUrl),
    fileName: file.name,
  };
}
