import {
  copyAsync,
  deleteAsync,
  documentDirectory,
  getInfoAsync,
  makeDirectoryAsync,
} from 'expo-file-system/legacy';

const REL_DIR = 'photos';

function documentsRoot(): string | null {
  return documentDirectory ?? null;
}

function photosDir(): string | null {
  const root = documentsRoot();
  if (!root) return null;
  return `${root}${REL_DIR}/`;
}

function relativePhotoPath(itemId: string, ext: 'jpg' | 'png'): string {
  return `${REL_DIR}/${itemId}.${ext}`;
}

function toRelativePhotoRef(
  stored: string | null,
  itemId?: string,
): string | null {
  if (stored) {
    if (stored.startsWith(`${REL_DIR}/`)) return stored;
    const match = stored.match(/(?:^|\/)photos\/([^/?#]+)$/i);
    if (match) return `${REL_DIR}/${match[1]}`;
  }
  if (itemId) return relativePhotoPath(itemId, 'jpg');
  return null;
}

async function fileExists(uri: string): Promise<boolean> {
  try {
    const info = await getInfoAsync(uri);
    return info.exists;
  } catch {
    return false;
  }
}

/**
 * Resolve a stored photo ref to a loadable file URI.
 * iOS changes the Documents container UUID between installs, so only
 * relative paths (photos/{id}.jpg) are stable.
 */
export function resolvePhotoUri(
  stored: string | null,
  itemId?: string,
): string | null {
  if (!stored && !itemId) return null;
  const root = documentsRoot();
  const relative = toRelativePhotoRef(stored, itemId);
  if (root && relative) return `${root}${relative}`;
  return stored;
}

async function findPhotoForItem(itemId: string): Promise<string | null> {
  for (const ext of ['jpg', 'png'] as const) {
    const relative = relativePhotoPath(itemId, ext);
    const uri = resolvePhotoUri(relative);
    if (uri && (await fileExists(uri))) return relative;
  }
  return null;
}

async function ensurePhotosDir(): Promise<string> {
  const dir = photosDir();
  if (!dir) {
    throw new Error('Document directory is not available');
  }
  await makeDirectoryAsync(dir, { intermediates: true });
  return dir;
}

/** Copy a captured/picked image into app documents and return a relative path. */
export async function persistPhoto(
  sourceUri: string,
  itemId: string,
): Promise<string> {
  const dir = await ensurePhotosDir();
  const ext = sourceUri.toLowerCase().includes('.png') ? 'png' : 'jpg';
  const relative = relativePhotoPath(itemId, ext);
  const dest = `${dir}${itemId}.${ext}`;
  if (await fileExists(dest)) {
    await deleteAsync(dest, { idempotent: true });
  }
  await copyAsync({ from: sourceUri, to: dest });
  return relative;
}

/**
 * Rewrite a stored URI to a relative documents path, recovering files after
 * the iOS sandbox UUID changes. Copies leftover cache files if they still exist.
 */
export async function migratePhotoRef(
  stored: string | null,
  itemId: string,
): Promise<string | null> {
  if (!stored) return (await findPhotoForItem(itemId)) ?? null;

  const relative = toRelativePhotoRef(stored, itemId);
  const resolved = relative ? resolvePhotoUri(relative) : null;
  if (resolved && (await fileExists(resolved))) {
    return relative;
  }

  const found = await findPhotoForItem(itemId);
  if (found) return found;

  if (await fileExists(stored)) {
    try {
      return await persistPhoto(stored, itemId);
    } catch {
      return relative;
    }
  }

  return relative;
}

export async function deletePhoto(
  uri: string | null,
  itemId?: string,
): Promise<void> {
  const candidates = new Set<string>();
  const resolved = resolvePhotoUri(uri, itemId);
  if (resolved) candidates.add(resolved);
  if (itemId) {
    for (const ext of ['jpg', 'png'] as const) {
      const alt = resolvePhotoUri(relativePhotoPath(itemId, ext));
      if (alt) candidates.add(alt);
    }
  }
  for (const path of candidates) {
    try {
      await deleteAsync(path, { idempotent: true });
    } catch {
      // ignore missing files
    }
  }
}
