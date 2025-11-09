
import Automerge from '@automerge/automerge';
import { LocalAdapter, RemoteAdapter, SyncMessage, LocalDocument } from './types';

/**
 * Manages the synchronization of Automerge documents between a local and remote adapter.
 * Synchronization is performed on a per-document basis using Automerge's sync protocol.
 */
export class SyncManager<T> {
  private localAdapter: LocalAdapter;
  private remoteAdapter: RemoteAdapter;
  private documents: Map<string, Automerge.Doc<T>> = new Map();
  private syncStates: Map<string, Automerge.SyncState> = new Map();
  private subscribers: Map<string, ((doc: Automerge.Doc<T>) => void)[]> = new Map();
  private isOnline: boolean = navigator.onLine;

  constructor(localAdapter: LocalAdapter, remoteAdapter: RemoteAdapter) {
    this.localAdapter = localAdapter;
    this.remoteAdapter = remoteAdapter;

    window.addEventListener('online', () => {
      this.isOnline = true;
      this.synchronizeAll();
    });
    window.addEventListener('offline', () => (this.isOnline = false));
  }

  /**
   * Initializes the SyncManager by loading local and remote documents
   * and starting the synchronization process.
   */
  async bootstrap(): Promise<void> {
    const localDocs = await this.localAdapter.getAll();
    for (const doc of localDocs) {
      this.documents.set(doc.id, Automerge.load<T>(doc.binary));
      this.syncStates.set(doc.id, Automerge.initSyncState());
    }

    if (this.isOnline) {
      const remoteDocs = await this.remoteAdapter.getSnapshot();
      for (const doc of remoteDocs) {
        const localDoc = this.documents.get(doc.id);
        if (localDoc) {
          // Document exists locally, merge remote changes
          const mergedDoc = Automerge.merge(localDoc, Automerge.load<T>(doc.binary));
          this.documents.set(doc.id, mergedDoc);
          this.localAdapter.put(doc.id, Automerge.save(mergedDoc));
        } else {
          // Document only exists remotely, load it
          this.documents.set(doc.id, Automerge.load<T>(doc.binary));
          this.syncStates.set(doc.id, Automerge.initSyncState());
        }
      }
    }

    // Start listening for remote changes
    this.watchRemote();

    // Initial sync of all documents
    this.synchronizeAll();
  }

  /**
   * Subscribes to incoming sync messages from the remote adapter.
   */
  watchRemote(): () => void {
    return this.remoteAdapter.watch(this.handleIncomingMessage.bind(this));
  }

  /**
   * Handles an incoming sync message from the remote adapter.
   * @param message The incoming sync message.
   */
  private async handleIncomingMessage(message: SyncMessage): Promise<void> {
    const { docId, message: syncMessage } = message;
    let doc = this.documents.get(docId);
    let syncState = this.syncStates.get(docId);

    if (!doc) {
      doc = Automerge.init<T>();
    }
    if (!syncState) {
      syncState = Automerge.initSyncState();
    }

    const [newDoc, newSyncState, patch] = Automerge.receiveSyncMessage(doc, syncState, syncMessage);
    this.documents.set(docId, newDoc);
    this.syncStates.set(docId, newSyncState);
    this.notifySubscribers(docId);

    // Persist the updated document locally
    await this.localAdapter.put(docId, Automerge.save(newDoc));

    // If there are changes to send back, generate a response message
    const [responseSyncState, responseMessage] = Automerge.generateSyncMessage(newDoc, newSyncState);
    if (responseMessage) {
      this.syncStates.set(docId, responseSyncState);
      await this.remoteAdapter.send({ docId, message: responseMessage });
    }
  }

  /**
   * Applies a local change to a document and triggers synchronization.
   * @param docId The ID of the document to change.
   * @param changeFn The function that applies the change.
   */
  async updateDocument(docId: string, changeFn: (doc: T) => void): Promise<void> {
    let doc = this.documents.get(docId);
    if (!doc) {
      throw new Error(`Document not found: ${docId}`);
    }

    const newDoc = Automerge.change(doc, changeFn);
    this.documents.set(docId, newDoc);
    this.notifySubscribers(docId);
    await this.localAdapter.put(docId, Automerge.save(newDoc));

    this.synchronize(docId);
  }

  /**
   * Synchronizes a specific document with the remote peer.
   * @param docId The ID of the document to synchronize.
   */
  private async synchronize(docId: string): Promise<void> {
    if (!this.isOnline) {
      return;
    }

    const doc = this.documents.get(docId);
    const syncState = this.syncStates.get(docId);

    if (!doc || !syncState) {
      return;
    }

    const [newSyncState, message] = Automerge.generateSyncMessage(doc, syncState);
    this.syncStates.set(docId, newSyncState);

    if (message) {
      await this.remoteAdapter.send({ docId, message });
    }
  }

  /**
   * Synchronizes all documents with the remote peer.
   */
  private synchronizeAll(): void {
    for (const docId of this.documents.keys()) {
      this.synchronize(docId);
    }
  }

  /**
   * Returns a document by its ID.
   * @param docId The ID of the document to retrieve.
   * @returns The Automerge document, or undefined if not found.
   */
  getDocument(docId: string): Automerge.Doc<T> | undefined {
    return this.documents.get(docId);
  }

  /**
   * Subscribes to changes for a specific document.
   * @param docId The ID of the document to subscribe to.
   * @param callback The callback to invoke when the document changes.
   * @returns An unsubscribe function.
   */
  subscribe(docId: string, callback: (doc: Automerge.Doc<T>) => void): () => void {
    if (!this.subscribers.has(docId)) {
      this.subscribers.set(docId, []);
    }
    this.subscribers.get(docId)!.push(callback);

    return () => {
      const subs = this.subscribers.get(docId);
      if (subs) {
        const index = subs.indexOf(callback);
        if (index > -1) {
          subs.splice(index, 1);
        }
      }
    };
  }

  /**
   * Notifies all subscribers of a document change.
   * @param docId The ID of the document that changed.
   */
  private notifySubscribers(docId: string): void {
    const doc = this.documents.get(docId);
    if (doc) {
      const subs = this.subscribers.get(docId);
      if (subs) {
        subs.forEach((callback) => callback(doc));
      }
    }
  }
}
