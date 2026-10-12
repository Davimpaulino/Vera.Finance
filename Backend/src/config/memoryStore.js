import { randomUUID } from 'node:crypto';

// Banco em memória com o subconjunto da API do Firestore que os models usam.
// Serve para rodar a API sem credenciais do Firebase (modo demo) e nos testes.

const clone = v => (v === undefined ? undefined : structuredClone(v));

function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function setPath(obj, path, value) {
  const keys = path.split('.');
  let o = obj;
  keys.slice(0, -1).forEach(k => {
    if (typeof o[k] !== 'object' || o[k] === null) o[k] = {};
    o = o[k];
  });
  o[keys[keys.length - 1]] = value;
}

function deepMerge(target, src) {
  Object.entries(src).forEach(([k, v]) => {
    if (
      v &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      typeof target[k] === 'object' &&
      target[k] &&
      !Array.isArray(target[k])
    ) {
      deepMerge(target[k], v);
    } else {
      target[k] = clone(v);
    }
  });
  return target;
}

class DocSnapshot {
  constructor(ref, data) {
    this.ref = ref;
    this.id = ref.id;
    this._data = data;
    this.exists = data !== undefined;
  }
  data() {
    return clone(this._data);
  }
}

class QuerySnapshot {
  constructor(docs) {
    this.docs = docs;
    this.size = docs.length;
    this.empty = docs.length === 0;
  }
  forEach(fn) {
    this.docs.forEach(fn);
  }
}

class DocRef {
  constructor(store, path) {
    this._store = store;
    this.path = path;
    this.id = path.split('/').pop();
  }
  collection(name) {
    return new CollectionRef(this._store, `${this.path}/${name}`);
  }
  async get() {
    return new DocSnapshot(this, this._store.docs.get(this.path));
  }
  async set(data, opts = {}) {
    const prev = this._store.docs.get(this.path);
    this._store.docs.set(
      this.path,
      opts.merge && prev ? deepMerge(clone(prev), data) : clone(data)
    );
  }
  async update(data) {
    const prev = this._store.docs.get(this.path);
    if (!prev)
      throw Object.assign(new Error(`Documento não encontrado: ${this.path}`), { code: 5 });
    const next = clone(prev);
    Object.entries(data).forEach(([k, v]) => setPath(next, k, clone(v)));
    this._store.docs.set(this.path, next);
  }
  async delete() {
    this._store.docs.delete(this.path);
  }
}

const OPS = {
  '==': (a, b) => a === b,
  '!=': (a, b) => a !== b,
  '<': (a, b) => a < b,
  '<=': (a, b) => a <= b,
  '>': (a, b) => a > b,
  '>=': (a, b) => a >= b,
  in: (a, b) => b.includes(a),
  'array-contains': (a, b) => Array.isArray(a) && a.includes(b)
};

class Query {
  constructor(store, path, filters = [], order = [], max = null) {
    this._store = store;
    this._path = path;
    this._filters = filters;
    this._order = order;
    this._max = max;
  }
  where(field, op, value) {
    return new Query(
      this._store,
      this._path,
      [...this._filters, [field, op, value]],
      this._order,
      this._max
    );
  }
  orderBy(field, dir = 'asc') {
    return new Query(
      this._store,
      this._path,
      this._filters,
      [...this._order, [field, dir]],
      this._max
    );
  }
  limit(n) {
    return new Query(this._store, this._path, this._filters, this._order, n);
  }
  async get() {
    const prefix = this._path + '/';
    let rows = [];
    for (const [path, data] of this._store.docs) {
      if (!path.startsWith(prefix) || path.slice(prefix.length).includes('/')) continue;
      if (this._filters.every(([f, op, v]) => OPS[op](getPath(data, f), v))) {
        rows.push(new DocSnapshot(new DocRef(this._store, path), data));
      }
    }
    this._order.forEach(([f, dir]) => {
      rows = rows.sort((a, b) => {
        const x = getPath(a._data, f);
        const y = getPath(b._data, f);
        const c = x < y ? -1 : x > y ? 1 : 0;
        return dir === 'desc' ? -c : c;
      });
    });
    if (this._max != null) rows = rows.slice(0, this._max);
    return new QuerySnapshot(rows);
  }
}

class CollectionRef extends Query {
  constructor(store, path) {
    super(store, path);
    this.path = path;
  }
  doc(id = randomUUID().replace(/-/g, '').slice(0, 20)) {
    return new DocRef(this._store, `${this.path}/${id}`);
  }
  async add(data) {
    const ref = this.doc();
    await ref.set(data);
    return ref;
  }
}

class Batch {
  constructor() {
    this._ops = [];
  }
  set(ref, data, opts) {
    this._ops.push(() => ref.set(data, opts));
    return this;
  }
  update(ref, data) {
    this._ops.push(() => ref.update(data));
    return this;
  }
  delete(ref) {
    this._ops.push(() => ref.delete());
    return this;
  }
  async commit() {
    for (const op of this._ops) await op();
  }
}

export class MemoryFirestore {
  constructor() {
    this.docs = new Map();
  }
  collection(name) {
    return new CollectionRef(this, name);
  }
  doc(path) {
    return new DocRef(this, path);
  }
  batch() {
    return new Batch();
  }
}
