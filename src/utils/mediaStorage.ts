/**
 * Lightweight IndexedDB Media Blob Store + Image Compressor
 * Prevents localStorage 5MB quota errors when Executive Admins upload large photos, videos, or templates.
 */

const DB_NAME = 'ifest_2027_media_blobs';
const STORE_NAME = 'media';
const DB_VERSION = 1;

function openMediaDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveMediaDataUrl(id: string, dataUrl: string): Promise<string> {
  const db = await openMediaDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(dataUrl, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return `idb://${id}`;
}

export async function getMediaDataUrl(ref: string): Promise<string | null> {
  if (!ref.startsWith('idb://')) return ref;
  const id = ref.slice('idb://'.length);
  const db = await openMediaDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => resolve((req.result as string) || null);
    req.onerror = () => resolve(null);
  });
}

export async function deleteMediaDataUrl(ref?: string): Promise<void> {
  if (!ref || !ref.startsWith('idb://')) return;
  const id = ref.slice('idb://'.length);
  try {
    const db = await openMediaDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Ignore cleanup errors
  }
}

export async function clearAllMediaBlobs(): Promise<void> {
  try {
    const db = await openMediaDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Ignore
  }
}

/**
 * Compresses an uploaded image smoothly while retaining HD clarity (max 1600px)
 */
export function compressImageFile(file: File, maxDimension = 1600, quality = 0.86): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      if (!src) {
        reject(new Error('Empty image data'));
        return;
      }
      // Keep SVG or tiny images untouched
      if (file.type === 'image/svg+xml' || file.size < 140 * 1024) {
        resolve(src);
        return;
      }
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(src);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(src);
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}
