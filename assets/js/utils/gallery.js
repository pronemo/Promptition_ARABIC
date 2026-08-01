/**
 * Promptition — Personal Image Library
 * utils/gallery.js
 *
 * IndexedDB-backed storage for the user's uploaded images and their
 * extracted metadata. Images are stored as data URLs so the library works
 * fully offline. API is promise-based with an in-memory cache.
 */

const DB_NAME = "promptition";
const DB_VERSION = 1;
const STORE = "library";

let dbPromise = null;

/** Open (and create if needed) the library database. */
function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB is not available"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("addedAt", "addedAt");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("Could not open the library database"));
  });
  return dbPromise;
}

function run(mode, fn) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const store = tx.objectStore(STORE);
        const req = fn(store);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error || new Error("Library operation failed"));
      })
  );
}

/**
 * Save an image record to the library.
 * @param {{id:string, name:string, type:string, size:number, addedAt:number, dataUrl:string, meta:Object}} record
 */
export function saveImage(record) {
  return run("readwrite", (store) => store.put(record));
}

/** Return all library records, newest first. */
export async function listImages() {
  const items = await run("readonly", (store) => store.getAll());
  return items.sort((a, b) => b.addedAt - a.addedAt);
}

/** Return a single record by id. */
export function getImage(id) {
  return run("readonly", (store) => store.get(id));
}

/** Delete a record by id. */
export function deleteImage(id) {
  return run("readwrite", (store) => store.delete(id));
}

/** Remove every record from the library. */
export function clearLibrary() {
  return run("readwrite", (store) => store.clear());
}

/** Resolve whether a record already exists. */
export function hasImage(id) {
  return getImage(id).then(Boolean);
}
