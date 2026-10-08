import { UPLOAD_LIMITS, type ImageUpload } from "@/lib/api";

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export function isAcceptedImage(file: Blob): boolean {
  return (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type);
}

type Decoded = { source: CanvasImageSource; width: number; height: number; release: () => void };

async function decode(blob: Blob): Promise<Decoded> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(blob, { imageOrientation: "from-image" });
    return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
  }
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.src = url;
  await img.decode();
  return {
    source: img,
    width: img.naturalWidth,
    height: img.naturalHeight,
    release: () => URL.revokeObjectURL(url),
  };
}

function encodeJpeg(image: Decoded, maxSide: number, quality: number): string {
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser can't prepare images for upload.");
  // JPEG has no transparency: paint white first so transparent PNG scans stay readable.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image.source, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  return dataUrl.slice(dataUrl.indexOf(",") + 1);
}

// Tried in order until every image fits in the request-size budget together.
const ATTEMPTS = [
  { side: UPLOAD_LIMITS.maxImageSide, quality: 0.85 },
  { side: 1400, quality: 0.78 },
  { side: 1200, quality: 0.72 },
  { side: 1000, quality: 0.65 },
];

/** Shrinks report photos in the browser to JPEG, keeping the total base64 under the upload limit. */
export async function prepareImages(blobs: Blob[]): Promise<ImageUpload[]> {
  const decoded: Decoded[] = [];
  try {
    for (const blob of blobs) {
      try {
        decoded.push(await decode(blob));
      } catch {
        throw new Error("One of the files couldn't be opened as an image. Remove it and try again.");
      }
    }
    for (const { side, quality } of ATTEMPTS) {
      const data = decoded.map((image) => encodeJpeg(image, side, quality));
      const total = data.reduce((sum, d) => sum + d.length, 0);
      if (total <= UPLOAD_LIMITS.maxTotalBase64Chars) {
        return data.map((d) => ({ data: d, mimeType: "image/jpeg" }));
      }
    }
    throw new Error("These photos are too large to send together. Try fewer pages at a time.");
  } finally {
    decoded.forEach((image) => image.release());
  }
}
