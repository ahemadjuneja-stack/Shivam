import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

export async function migrateOldVideos(): Promise<number> {
  try {
    const legacyCol = collection(db, 'showroom_videos');
    const snap = await getDocs(legacyCol);
    if (snap.empty) {
      console.log('[VideoMigration] No legacy videos in showroom_videos found to migrate.');
      return 0;
    }

    let count = 0;
    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      const id = docSnap.id;

      // Write mapped data to showroomVideos (camelCase)
      const newRef = doc(db, 'showroomVideos', id);
      await setDoc(newRef, {
        id,
        title: data.title || 'Showroom Video',
        videoUri: data.videoUri || data.videoUrl || '',
        videoUrl: data.videoUri || data.videoUrl || '',
        imageUri: data.imageUri || data.posterUrl || '',
        posterUrl: data.imageUri || data.posterUrl || '',
        quantity: typeof data.quantity === 'number' ? data.quantity : parseInt(data.orderQuantity || '0', 10),
        orderQuantity: data.quantity !== undefined ? String(data.quantity) : (data.orderQuantity || '0'),
        sortOrder: data.sortOrder || 0,
        fileSizeMb: data.fileSizeMb || 0,
        uploadedAt: data.uploadedAt || Date.now(),
        createdAt: data.createdAt || Date.now(),
        updatedAt: Date.now()
      }, { merge: true });

      // Delete from legacy showroom_videos (underscore)
      await deleteDoc(doc(db, 'showroom_videos', id));
      count++;
    }

    console.log(`[VideoMigration] Migrated ${count} videos from showroom_videos to showroomVideos.`);
    return count;
  } catch (err) {
    console.error('[VideoMigration] Error migrating old videos:', err);
    return 0;
  }
}
