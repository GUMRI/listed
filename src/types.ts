
/**
 * Represents a document stored locally or remotely.
 * The document is stored as a binary representation of an Automerge document.
 */
export interface LocalDocument {
  id: string;
  binary: Uint8Array;
}

/**
 * Represents the interface for a local storage adapter (e.g., IndexedDB, SQLite).
 * It is responsible for storing and retrieving Automerge documents as binary blobs.
 */
export interface LocalAdapter {
  get(id: string): Promise<Uint8Array | null>;
  getAll(): Promise<LocalDocument[]>;
  put(id: string, binary: Uint8Array): Promise<void>;
  putAll(docs: LocalDocument[]): Promise<void>;
  delete(id: string): Promise<void>;
  deleteAll(ids: string[]): Promise<void>;
}

/**
 * Represents the interface for a remote storage adapter (e.g., a WebSocket server, Firestore).
 * It is responsible for sending and receiving full document binaries.
 */
export interface RemoteAdapter {
  /**
   * Subscribes to incoming document changes from the remote peer.
   * The callback will be invoked for each document received.
   * @param callback A function to handle incoming documents.
   * @returns An unsubscribe function.
   */
  watch(callback: (doc: LocalDocument) => void): () => void;

  /**
   * Sends a full document binary to the remote peer.
   * @param doc The document to send.
   */
  send(doc: LocalDocument): Promise<void>;

  /**
   * Fetches the initial state of all documents from the remote peer.
   * This is used during the bootstrap process.
   * @returns A promise that resolves to an array of all remote documents.
   */
  getSnapshot(): Promise<LocalDocument[]>;
}
