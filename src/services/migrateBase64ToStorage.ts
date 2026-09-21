import { collection, getDocs, updateDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';

/**
 * Convert data URI / base64 string to Blob
 */
export function dataUriToBlob(dataUri: string): Blob {
  const arr = dataUri.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const bstr = atob(arr[1] || arr[0]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Compress an image Blob client-side using HTML Canvas
 */
export async function compressCanvasImage(
  blob: Blob,
  maxWidth: number,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(blob);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (res) => {
          if (res) resolve(res);
          else resolve(blob);
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

/**
 * Directly upload Blob to Firebase Storage
 */
export async function uploadBlobToStorage(blob: Blob, path: string): Promise<string> {
  if (!storage) throw new Error('Firebase Storage instance is not available.');
  const fileRef = storageRef(storage, path);
  const snapshot = await uploadBytes(fileRef, blob, { contentType: blob.type || 'image/jpeg' });
  return await getDownloadURL(snapshot.ref);
}

export interface MigrationResult {
  totalDocsScanned: number;
  totalDocsMigrated: number;
  log: string[];
}

/**
 * One-time migration function to convert inline Base64 data URIs to Firebase Storage URLs
 */
export async function runBase64Migration(
  onProgress?: (message: string) => void
): Promise<MigrationResult> {
  const log: string[] = [];
  const addLog = (msg: string) => {
    console.log(`[Base64 Migration] ${msg}`);
    log.push(msg);
    if (onProgress) onProgress(msg);
  };

  addLog('Starting Base64 -> Firebase Storage migration scan...');

  const collectionsToScan = ['photos', 'catalog_photos', 'categories', 'subCategories', 'showroomVideos'];
  let totalDocsScanned = 0;
  let totalDocsMigrated = 0;

  for (const colName of collectionsToScan) {
    addLog(`Scanning collection '${colName}'...`);
    try {
      const snap = await getDocs(collection(db, colName));
      totalDocsScanned += snap.size;
      addLog(`Found ${snap.size} documents in '${colName}'.`);

      for (const docSnap of snap.docs) {
        const data = docSnap.data();
        let needsMigration = false;
        const updates: Record<string, any> = {};

        for (const [key, val] of Object.entries(data)) {
          if (typeof val === 'string' && (val.startsWith('data:image') || val.startsWith('data:video'))) {
            needsMigration = true;
            addLog(`Doc '${docSnap.id}' in '${colName}' has base64 in field '${key}' (~${Math.round(val.length / 1024)} KB). Migrating...`);

            try {
              const originalBlob = dataUriToBlob(val);
              const isVideo = val.startsWith('data:video') || (originalBlob.type && originalBlob.type.includes('video'));

              if (isVideo) {
                const storagePath = `migrated/${colName}/${docSnap.id}_video_${Date.now()}.mp4`;
                const videoUrl = await uploadBlobToStorage(originalBlob, storagePath);
                updates['videoUri'] = videoUrl;
                updates['videoUrl'] = videoUrl;
                updates[key] = videoUrl;
              } else {
                // Image: Compress full (max 1600px, 0.8) & thumbnail (max 480px, 0.7)
                const fullBlob = await compressCanvasImage(originalBlob, 1600, 0.8);
                const thumbBlob = await compressCanvasImage(originalBlob, 480, 0.7);

                const fullPath = `migrated/${colName}/${docSnap.id}_full_${Date.now()}.jpg`;
                const thumbPath = `migrated/${colName}/${docSnap.id}_thumb_${Date.now()}.jpg`;

                const [imageUrl, thumbnailUrl] = await Promise.all([
                  uploadBlobToStorage(fullBlob, fullPath),
                  uploadBlobToStorage(thumbBlob, thumbPath)
                ]);

                updates['imageUrl'] = imageUrl;
                updates['imageUri'] = imageUrl;
                updates['thumbnailUrl'] = thumbnailUrl;
                // Replace the base64 field with clean Storage URL
                updates[key] = thumbnailUrl || imageUrl;
              }
            } catch (err: any) {
              addLog(`ERROR migrating doc '${docSnap.id}' field '${key}': ${err?.message || err}`);
            }
          }
        }

        if (needsMigration && Object.keys(updates).length > 0) {
          await updateDoc(docSnap.ref, updates);
          totalDocsMigrated++;
          addLog(`Successfully updated doc '${docSnap.id}' in Firestore.`);
        }
      }
    } catch (err: any) {
      addLog(`ERROR scanning collection '${colName}': ${err?.message || err}`);
    }
  }

  addLog(`Migration complete! Total scanned: ${totalDocsScanned}, Total migrated: ${totalDocsMigrated}.`);
  return { totalDocsScanned, totalDocsMigrated, log };
}
