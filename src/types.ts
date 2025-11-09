import * as Automerge from '@automerge/automerge';

/**
 * Represents a document with CRDT metadata.
 */
export interface CRDTDocument<T> {
  id: string;
  data: T;
  crdt: {
    heads: Automerge.Heads;
    updatedAt: number;
    deleted: boolean;
  };
}

/**
 * Represents the interface for a local storage adapter (e.g., IndexedDB, SQLite).
 */
export interface LocalAdapter<T> {
  get(id: string): Promise<CRDTDocument<T> | null>;
  getAll(): Promise<CRDTDocument<T>[]>;
  put(doc: CRDTDocument<T>): Promise<void>;
  putAll(docs: CRDTDocument<T>[]): Promise<void>;
  delete(id: string): Promise<void>;
  deleteAll(ids: string[]): Promise<void>;
  transaction(fn: () => Promise<void>): Promise<void>;
}

/**
 * Represents the interface for a remote storage adapter (e.g., Firestore, Supabase).
 */
export interface RemoteAdapter<T> {
  watch(collection: string, callback: (docs: CRDTDocument<T>[]) => void): () => void;
  mutations(type: 'create' | 'update' | 'delete', payload: any): Promise<void>;
  transaction(fn: () => Promise<void>): Promise<void>;
  query(params: any): Promise<CRDTDocument<T>[]>;
  getSnapshot(collection: string): Promise<CRDTDocument<T>[]>;
}
