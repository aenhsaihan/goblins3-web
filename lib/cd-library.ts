'use client';

import { Unzip, UnzipInflate } from 'fflate';

const DATABASE_NAME = 'goblins3-cd-library';
const DATABASE_VERSION = 1;
const FILE_STORE = 'files';
const META_STORE = 'meta';
const ACTIVE_LIBRARY_KEY = 'active-library';
const MAX_ARCHIVE_FILES = 5000;
const MAX_EXTRACTED_BYTES = 900 * 1024 * 1024;

export type CdLibraryMetadata = {
  key: typeof ACTIVE_LIBRARY_KEY;
  libraryId: string;
  root: string;
  fileCount: number;
  totalBytes: number;
  introSize: number;
  release: string;
  sourceName: string;
  importedAt: string;
};

type CdFileRecord = {
  key: string;
  libraryId: string;
  path: string;
  size: number;
  blob: Blob;
};

type ImportProgress = {
  phase: 'reading' | 'saving' | 'validating';
  percent: number;
  detail: string;
};

type ImportOptions = {
  sourceName: string;
  onProgress?: (progress: ImportProgress) => void;
};

const requestResult = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('Browser storage request failed.'));
  });

const transactionDone = (transaction: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () =>
      reject(
        transaction.error ??
          new Error('Browser storage transaction was cancelled.'),
      );
    transaction.onerror = () =>
      reject(
        transaction.error ?? new Error('Browser storage transaction failed.'),
      );
  });

const openDatabase = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(FILE_STORE)) {
        const files = database.createObjectStore(FILE_STORE, {
          keyPath: 'key',
        });
        files.createIndex('libraryId', 'libraryId', { unique: false });
      }
      if (!database.objectStoreNames.contains(META_STORE)) {
        database.createObjectStore(META_STORE, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('Could not open browser storage.'));
  });

const normalizePath = (input: string) => {
  const segments = input
    .replaceAll('\\', '/')
    .replace(/^[a-zA-Z]:\//, '')
    .split('/')
    .filter((segment) => segment && segment !== '.');

  if (segments.some((segment) => segment === '..')) return '';
  return segments.join('/');
};

const isJunkPath = (path: string) => {
  const lower = path.toLowerCase();
  return (
    !path ||
    lower.startsWith('__macosx/') ||
    lower.endsWith('/.ds_store') ||
    lower === '.ds_store' ||
    lower.endsWith('/thumbs.db') ||
    lower === 'thumbs.db'
  );
};

const putFile = async (record: CdFileRecord) => {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(FILE_STORE, 'readwrite');
    transaction.objectStore(FILE_STORE).put(record);
    await transactionDone(transaction);
  } finally {
    database.close();
  }
};

const deleteLibraryFiles = async (libraryId: string, keepRoot?: string) => {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(FILE_STORE, 'readwrite');
    const store = transaction.objectStore(FILE_STORE);
    const index = store.index('libraryId');
    const request = index.openCursor(IDBKeyRange.only(libraryId));
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      const record = cursor.value as CdFileRecord;
      const inRoot =
        keepRoot !== undefined &&
        (keepRoot === '' ||
          record.path === keepRoot ||
          record.path.startsWith(`${keepRoot}/`));
      if (!inRoot) cursor.delete();
      cursor.continue();
    };
    await transactionDone(transaction);
  } finally {
    database.close();
  }
};

const saveMetadata = async (metadata: CdLibraryMetadata) => {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(META_STORE, 'readwrite');
    transaction.objectStore(META_STORE).put(metadata);
    await transactionDone(transaction);
  } finally {
    database.close();
  }
};

const identifyCdRoot = (records: Array<{ path: string; size: number }>) => {
  const byLowerPath = new Map(
    records.map((record) => [record.path.toLowerCase(), record]),
  );
  const candidates = records
    .filter(
      (record) => record.path.split('/').at(-1)?.toLowerCase() === 'intro.stk',
    )
    .map((record) => {
      const slash = record.path.lastIndexOf('/');
      const root = slash < 0 ? '' : record.path.slice(0, slash);
      const markerPath = `${root ? `${root}/` : ''}mus_gob3.lic`.toLowerCase();
      return { intro: record, root, hasCdMarker: byLowerPath.has(markerPath) };
    })
    .filter((candidate) => candidate.hasCdMarker)
    .sort((a, b) => a.root.split('/').length - b.root.split('/').length);

  if (!candidates.length) {
    throw new Error(
      'This does not look like the Goblins 3 DOS CD edition. The folder must contain both intro.stk and mus_gob3.lic.',
    );
  }

  const selected = candidates[0];
  const releaseBySize: Record<number, string> = {
    612482: 'DOS CD v1.02',
    616220: 'DOS CD v1.02',
    619825: 'DOS CD v1.02',
  };

  return {
    root: selected.root,
    introSize: selected.intro.size,
    release: releaseBySize[selected.intro.size] ?? 'DOS CD edition',
  };
};

const finalizeImport = async (
  libraryId: string,
  records: Array<{ path: string; size: number }>,
  sourceName: string,
) => {
  const previousLibrary = await getCdLibraryMetadata();
  const match = identifyCdRoot(records);
  const prefix = match.root ? `${match.root}/` : '';
  const keptRecords = records.filter(
    (record) =>
      !prefix || record.path === match.root || record.path.startsWith(prefix),
  );

  await deleteLibraryFiles(libraryId, match.root);

  const metadata: CdLibraryMetadata = {
    key: ACTIVE_LIBRARY_KEY,
    libraryId,
    root: match.root,
    fileCount: keptRecords.length,
    totalBytes: keptRecords.reduce((sum, record) => sum + record.size, 0),
    introSize: match.introSize,
    release: match.release,
    sourceName,
    importedAt: new Date().toISOString(),
  };

  await saveMetadata(metadata);
  if (previousLibrary && previousLibrary.libraryId !== libraryId) {
    await deleteLibraryFiles(previousLibrary.libraryId).catch(() => {});
  }
  return metadata;
};

const explainStorageError = (error: unknown) => {
  if (error instanceof DOMException && error.name === 'QuotaExceededError') {
    return new Error(
      'This browser ran out of local storage while copying the CD. Free some device space, then try again.',
    );
  }
  return error instanceof Error ? error : new Error(String(error));
};

export async function getCdLibraryMetadata() {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(META_STORE, 'readonly');
    const result = await requestResult(
      transaction.objectStore(META_STORE).get(ACTIVE_LIBRARY_KEY),
    );
    return (result as CdLibraryMetadata | undefined) ?? null;
  } finally {
    database.close();
  }
}

export async function clearCdLibrary() {
  const metadata = await getCdLibraryMetadata();
  const database = await openDatabase();
  try {
    const transaction = database.transaction(META_STORE, 'readwrite');
    transaction.objectStore(META_STORE).delete(ACTIVE_LIBRARY_KEY);
    await transactionDone(transaction);
  } finally {
    database.close();
  }
  if (metadata) await deleteLibraryFiles(metadata.libraryId);
}

export async function importCdFolder(files: FileList, options: ImportOptions) {
  const libraryId = crypto.randomUUID();
  const records: Array<{ path: string; size: number }> = [];

  try {
    await navigator.storage?.persist?.().catch(() => false);
    const usableFiles = Array.from(files).filter((file) => file.size > 0);
    for (let index = 0; index < usableFiles.length; index += 1) {
      const file = usableFiles[index];
      const directoryFile = file as File & { webkitRelativePath?: string };
      const path = normalizePath(directoryFile.webkitRelativePath || file.name);
      if (isJunkPath(path)) continue;

      options.onProgress?.({
        phase: 'saving',
        percent: Math.round(((index + 1) / usableFiles.length) * 92),
        detail: `Copying ${index + 1} of ${usableFiles.length} files…`,
      });
      await putFile({
        key: `${libraryId}:${path}`,
        libraryId,
        path,
        size: file.size,
        blob: file,
      });
      records.push({ path, size: file.size });
    }

    options.onProgress?.({
      phase: 'validating',
      percent: 96,
      detail: 'Checking the CD edition…',
    });
    return await finalizeImport(libraryId, records, options.sourceName);
  } catch (error) {
    await deleteLibraryFiles(libraryId).catch(() => {});
    throw explainStorageError(error);
  }
}

export async function importCdZip(file: File, options: ImportOptions) {
  const libraryId = crypto.randomUUID();
  const records: Array<{ path: string; size: number }> = [];
  let writeQueue = Promise.resolve();
  let extractionError: Error | null = null;
  let extractedBytes = 0;
  let extractedFiles = 0;

  try {
    await navigator.storage?.persist?.().catch(() => false);

    const unzipper = new Unzip((entry) => {
      const path = normalizePath(entry.name);
      if (!path || entry.name.endsWith('/') || isJunkPath(path)) return;
      extractedFiles += 1;
      if (extractedFiles > MAX_ARCHIVE_FILES) {
        extractionError = new Error(
          'This ZIP contains too many files to be a Goblins 3 CD folder.',
        );
        return;
      }

      const chunks: ArrayBuffer[] = [];
      let size = 0;
      entry.ondata = (error, data, final) => {
        if (error) {
          extractionError = error;
          return;
        }
        if (data.length) {
          extractedBytes += data.length;
          if (extractedBytes > MAX_EXTRACTED_BYTES) {
            extractionError = new Error(
              'This ZIP expands beyond the safe 900 MB import limit.',
            );
            entry.terminate();
            return;
          }
          const copy = new Uint8Array(data.length);
          copy.set(data);
          chunks.push(copy.buffer);
          size += data.length;
        }
        if (!final) return;

        const blob = new Blob(chunks, { type: 'application/octet-stream' });
        records.push({ path, size });
        writeQueue = writeQueue.then(() =>
          putFile({
            key: `${libraryId}:${path}`,
            libraryId,
            path,
            size,
            blob,
          }),
        );
      };
      entry.start();
    });
    unzipper.register(UnzipInflate);

    const chunkSize = 1024 * 1024;
    for (let offset = 0; offset < file.size; offset += chunkSize) {
      const end = Math.min(file.size, offset + chunkSize);
      const chunk = new Uint8Array(await file.slice(offset, end).arrayBuffer());
      unzipper.push(chunk, end === file.size);
      if (extractionError) throw extractionError;
      options.onProgress?.({
        phase: 'reading',
        percent: Math.max(1, Math.round((end / file.size) * 78)),
        detail: `Reading CD archive… ${Math.round((end / file.size) * 100)}%`,
      });
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    }

    options.onProgress?.({
      phase: 'saving',
      percent: 84,
      detail: 'Saving CD files on this device…',
    });
    await writeQueue;
    if (extractionError) throw extractionError;

    options.onProgress?.({
      phase: 'validating',
      percent: 96,
      detail: 'Checking the CD edition…',
    });
    return await finalizeImport(libraryId, records, options.sourceName);
  } catch (error) {
    await writeQueue.catch(() => {});
    await deleteLibraryFiles(libraryId).catch(() => {});
    throw explainStorageError(error);
  }
}

export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 100 * 1024 * 1024 ? 0 : 1)} MB`;
}
