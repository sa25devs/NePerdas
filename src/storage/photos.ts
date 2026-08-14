import {
  copyAsync,
  deleteAsync,
  documentDirectory,
  makeDirectoryAsync,
} from 'expo-file-system/legacy';

const PHOTOS_DIR = `${documentDirectory ?? ''}photos/`;

async function ensurePhotosDir(): Promise<void> {
  if (!documentDirectory) return;
  await makeDirectoryAsync(PHOTOS_DIR, { intermediates: true });
}

/** Copy a captured/picked image into app documents and return the new URI. */
export async function persistPhoto(
  sourceUri: string,
  itemId: string,
): Promise<string> {
  await ensurePhotosDir();
  const ext = sourceUri.toLowerCase().includes('.png') ? 'png' : 'jpg';
  const dest = `${PHOTOS_DIR}${itemId}.${ext}`;
  await copyAsync({ from: sourceUri, to: dest });
  return dest;
}

export async function deletePhoto(uri: string | null): Promise<void> {
  if (!uri) return;
  try {
    await deleteAsync(uri, { idempotent: true });
  } catch {
    // ignore missing files
  }
}
