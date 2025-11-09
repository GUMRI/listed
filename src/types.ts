
/**
 * Represents a document stored locally.
 * The document is stored as a binary representation of an Automerge document.
 */
export interface LocalDocument {
  id: string;
  binary: Uint8Array;
}

/**
 * Represents a sync message exchanged between peers.
 */
export interface SyncMessage {
  docId: string;
  message: Uint8Array;
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
 * It is responsible for sending and receiving sync messages.
 */
export interface RemoteAdapter {
  /**
   * Subscribes to incoming sync messages from the remote peer.
   * The callback will be invoked for each message received.
   * @param callback A function to handle incoming sync messages.
   * @returns An unsubscribe function.
   */
  watch(callback: (message: SyncMessage) => void): () => void;

  /**
   * Sends a sync message to the remote peer.
   * @param message The sync message to send.
   */
  send(message: SyncMessage): Promise<void>;

  /**
   * Fetches the initial state of all documents from the remote peer.
   * This is used during the bootstrap process.
   * @returns A promise that resolves to an array of all remote documents.
   */
  getSnapshot(): Promise<LocalDocument[]>;
}
