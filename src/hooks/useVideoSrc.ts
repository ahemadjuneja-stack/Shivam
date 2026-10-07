import { useState, useEffect } from 'react';
import { getLocalVideo } from '../services/localDB';

export const useVideoSrc = (uri?: string) => {
  const [src, setSrc] = useState<string | undefined>(uri?.startsWith('indexeddb://') ? undefined : uri);

  useEffect(() => {
    if (!uri) {
      setSrc(undefined);
      return;
    }

    if (uri.startsWith('indexeddb://')) {
      const localId = uri.replace('indexeddb://', '');
      let objectUrl: string | undefined;

      getLocalVideo(localId).then(file => {
        if (file) {
          objectUrl = URL.createObjectURL(file);
          setSrc(objectUrl);
        } else {
          console.warn('Local video not found in IndexedDB:', localId);
          setSrc(undefined);
        }
      });

      return () => {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
      };
    } else {
      setSrc(uri);
    }
  }, [uri]);

  return src;
};
