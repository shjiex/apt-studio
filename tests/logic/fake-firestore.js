// A stand-in for 'firebase/firestore' that keeps documents in memory, for
// check-account.mjs. It follows the rules of the real Firestore that most often
// break a first save: no `undefined` values, no list directly inside a list, and
// a document may hold 1 MiB (1,048,576 bytes) at most.

export const store = new Map(); // path, such as "users/abc/rooms/room-1", to the document's data

function checkValue(value, path, insideList) {
  if (value === undefined) throw new Error(`Unsupported field value: undefined (at ${path})`);
  if (Array.isArray(value)) {
    if (insideList) throw new Error(`Nested arrays are not supported (at ${path})`);
    value.forEach((entry, index) => checkValue(entry, `${path}[${index}]`, true));
  } else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, entry]) => checkValue(entry, `${path}.${key}`, false));
  }
}

export function doc(db, ...parts) {
  return { path: parts.join('/'), id: parts[parts.length - 1] };
}

export function collection(db, ...parts) {
  return { path: parts.join('/') };
}

export async function setDoc(ref, data, options = {}) {
  checkValue(data, ref.path, false);
  const next = options.merge ? { ...(store.get(ref.path) || {}), ...data } : data;
  // The real limit counts bytes a little differently; the length of the JSON text is close and a bit strict.
  const size = Buffer.byteLength(JSON.stringify(next));
  if (size > 1048576) throw new Error(`Document ${ref.path} is ${size} bytes, over the 1,048,576 byte limit`);
  store.set(ref.path, JSON.parse(JSON.stringify(next)));
}

export async function getDoc(ref) {
  const data = store.get(ref.path);
  return { exists: () => data !== undefined, data: () => data };
}

export async function getDocs(ref) {
  const found = [];
  for (const [path, data] of store) {
    const rest = path.slice(ref.path.length + 1);
    // only documents directly inside this collection
    if (path.startsWith(`${ref.path}/`) && !rest.includes('/')) found.push({ id: rest, data: () => data });
  }
  return { forEach: (run) => found.forEach(run) };
}

export async function deleteDoc(ref) {
  store.delete(ref.path);
}
