import { ref, listAll, updateMetadata } from 'firebase/storage';
import { storage } from '../firebase';

/**
 * Recursively walk the ENTIRE Firebase Storage bucket starting from root
 * and set immutable long-term browser cacheControl headers on every file.
 */
export async function fixAllStorageCache(): Promise<number> {
  if (!storage) {
    console.warn('[FixStorageCache] Firebase Storage instance is not available.');
    return 0;
  }

  let fixedCount = 0;

  async function walkFolder(folderRef: ReturnType<typeof ref>): Promise<void> {
    try {
      const res = await listAll(folderRef);

      for (const item of res.items) {
        try {
          await updateMetadata(item, {
            cacheControl: 'public, max-age=31536000, immutable'
          });
          fixedCount++;
          if (fixedCount % 10 === 0) {
            console.log(`[FixStorageCache] Fixed ${fixedCount} files...`);
          }
        } catch (err) {
          console.warn(`[FixStorageCache] Failed to update metadata for ${item.fullPath}:`, err);
        }
      }

      for (const prefix of res.prefixes) {
        await walkFolder(prefix);
      }
    } catch (err) {
      console.warn(`[FixStorageCache] Error walking folder ${folderRef.fullPath}:`, err);
    }
  }

  const rootRef = ref(storage, '');
  await walkFolder(rootRef);

  console.log(`[FixStorageCache] Done! Fixed cacheControl for ${fixedCount} files total.`);
  return fixedCount;
}
