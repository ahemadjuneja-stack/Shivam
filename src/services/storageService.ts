import { storage, uploadMediaToStorage, type MediaFolder } from '../firebase';
import { compressCanvasImage, dataUriToBlob, uploadBlobToStorage } from './migrateBase64ToStorage';

export { storage, uploadMediaToStorage, compressCanvasImage, dataUriToBlob, type MediaFolder };

/**
 * Guard that prevents writing inline base64 string fields to Firestore
 */
export function guardNoBase64InDoc(data: Record<string, any>): void {
  if (!data || typeof data !== 'object') return;

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string' && value.startsWith('data:')) {
      throw new Error(
        `[Base64 Protection Guard] Writing inline base64 string to Firestore is forbidden for field '${key}'. Please upload the asset to Storage first.`
      );
    }
  }
}

/**
 * Compress photo client-side (full: 1600px wide, quality 0.8; thumbnail: 480px wide, quality 0.7)
 * and upload both to Firebase Storage. Returns { imageUrl, thumbnailUrl }.
 */
export async function compressAndUploadPhoto(
  fileOrDataUrl: File | Blob | string,
  folder: MediaFolder = 'catalog',
  prefix: string = 'photo'
): Promise<{ imageUrl: string; thumbnailUrl: string }> {
  let blob: Blob;

  if (typeof fileOrDataUrl === 'string') {
    if (fileOrDataUrl.startsWith('http://') || fileOrDataUrl.startsWith('https://')) {
      return { imageUrl: fileOrDataUrl, thumbnailUrl: fileOrDataUrl };
    }
    if (fileOrDataUrl.startsWith('data:')) {
      blob = dataUriToBlob(fileOrDataUrl);
    } else {
      const res = await fetch(fileOrDataUrl);
      blob = await res.blob();
    }
  } else {
    blob = fileOrDataUrl;
  }

  // Generate compressed full image & thumbnail via canvas
  const fullBlob = await compressCanvasImage(blob, 1600, 0.8);
  const thumbBlob = await compressCanvasImage(blob, 640, 0.7);

  const timestamp = Date.now();
  const fullPath = `${folder}/${prefix}_full_${timestamp}.jpg`;
  const thumbPath = `${folder}/${prefix}_thumb_${timestamp}.jpg`;

  const [imageUrl, thumbnailUrl] = await Promise.all([
    uploadBlobToStorage(fullBlob, fullPath),
    uploadBlobToStorage(thumbBlob, thumbPath)
  ]);

  return { imageUrl, thumbnailUrl };
}
