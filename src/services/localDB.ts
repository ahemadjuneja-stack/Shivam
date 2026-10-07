import { openDB } from 'idb';

const DB_NAME = 'ShowroomVideosDB';
const STORE_NAME = 'videos';

export const initDB = async () => {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
};

export const saveLocalVideo = async (id: string, file: File) => {
  const db = await initDB();
  await db.put(STORE_NAME, file, id);
};

export const getLocalVideo = async (id: string): Promise<File | undefined> => {
  const db = await initDB();
  return db.get(STORE_NAME, id);
};

export const deleteLocalVideo = async (id: string) => {
  const db = await initDB();
  await db.delete(STORE_NAME, id);
};
