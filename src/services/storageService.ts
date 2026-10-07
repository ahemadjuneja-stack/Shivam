import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

export { storage };

/**
 * Universal Media Upload Pipeline for Dashboard
 * Uploads media files directly to Firebase Storage bucket "shivam-2bace.firebasestorage.app"
 * and returns the permanent HTTPS download link.
 */
export async function uploadDashboardMedia(
  fileOrBlob: File | Blob, 
  folder: 'catalog' | 'showroom_videos' | 'communication' | 'broadcasts' | 'home_banners' | 'brand_logos' | 'festival_products' | 'festival_groups', 
  idPrefix: string = 'media'
): Promise<string> {
  const fileName = (fileOrBlob as any).name;
  let ext = 'jpg';
  if (fileName && typeof fileName === 'string' && fileName.includes('.')) {
    ext = fileName.split('.').pop() || 'jpg';
  } else if (fileOrBlob.type) {
    if (fileOrBlob.type.includes('webm')) ext = 'webm';
    else if (fileOrBlob.type.includes('mp4')) ext = 'mp4';
    else if (fileOrBlob.type.includes('png')) ext = 'png';
    else if (fileOrBlob.type.includes('audio')) ext = 'webm';
    else if (fileOrBlob.type.includes('jpeg') || fileOrBlob.type.includes('jpg')) ext = 'jpg';
  }

  const cleanPrefix = idPrefix.replace(/[^a-zA-Z0-9_-]/g, '_');
  const uniquePath = `${folder}/${cleanPrefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
  const fileRef = ref(storage, uniquePath);
  const snapshot = await uploadBytes(fileRef, fileOrBlob, { contentType: fileOrBlob.type || undefined });
  return await getDownloadURL(snapshot.ref);
}

/**
 * Helper to convert a data URL or blob URL to Blob for upload
 */
export async function urlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return await res.blob();
}
