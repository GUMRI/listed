
import * as Automerge from '@automerge/automerge';
import { LocalAdapter, RemoteAdapter, LocalDocument } from './types.js';
/**
 * Manages the synchronization of Automerge documents between a local and remote adapter.
 */
export class SyncManager<T> {
  private localAdapter: LocalAdapter;
  private remoteAdapter: RemoteAdapter;
  private documents: Map<string, Automerge.Doc<T>> = new Map();
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
      this.notifySubscribers(doc.id);
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
          this.notifySubscribers(doc.id);
        } else {
          this.documents.set(doc.id, Automerge.load<T>(doc.binary));
          this.notifySubscribers(doc.id);
        }
      }
    }

    this.watchRemote();
  }

  /**
   * Subscribes to incoming document changes from the remote adapter.
   */
  watchRemote(): () => void {
    return this.remoteAdapter.watch(this.handleIncomingDocument.bind(this));
  }

  /**
   * Handles an incoming document from the remote adapter.
   * @param remoteDoc The incoming document.
   */
  private async handleIncomingDocument(remoteDoc: LocalDocument): Promise<void> {
    const { id, binary } = remoteDoc;
    const localDoc = this.documents.get(id);


//console.log(uint8ArrayToJson(binary));

    if (localDoc) {
      const mergedDoc = Automerge.merge(localDoc, Automerge.load<T>(binary));
      this.documents.set(id, mergedDoc);
    } else {
      this.documents.set(id, Automerge.load<T>(binary));
    }

    await this.localAdapter.put(id, Automerge.save(this.documents.get(id)!));
    this.notifySubscribers(id);
  }

  /**
   * Creates a new document, saves it locally, and sends it to the remote.
   * @param docId The ID of the new document.
   * @param initialDoc The initial state of the document.
   */
  async createDocument(docId: string, initialDoc: T): Promise<void> {
    if (this.documents.has(docId)) {
      throw new Error(`Document already exists: ${docId}`);
    }

    const newDoc = Automerge.from(initialDoc as any);
    this.documents.set(docId, newDoc);
    this.notifySubscribers(docId);
    const binary = Automerge.save(newDoc);
    await this.localAdapter.put(docId, binary);

    if (this.isOnline) {
      await this.remoteAdapter.send({ id: docId, binary });
    }
  }

  /**
   * Applies a local change to a document, saves it, and triggers synchronization.
   * @param docId The ID of the document to change.
   * @param changeFn The function that applies the change.
   */
  async updateDocument(docId: string, changeFn: (doc: T) => void): Promise<void> {
    const doc = this.documents.get(docId);
    if (!doc) {
      throw new Error(`Document not found: ${docId}`);
    }

    const newDoc = Automerge.change(doc, changeFn);
    this.documents.set(docId, newDoc);
    this.notifySubscribers(docId);
    const binary = Automerge.save(newDoc);
    await this.localAdapter.put(docId, binary);

    if (this.isOnline) {
      await this.remoteAdapter.send({ id: docId, binary });
    }
  }

  /**
   * Synchronizes all documents with the remote peer.
   */
  private synchronizeAll(): void {
    for (const [docId, doc] of this.documents.entries()) {
      const binary = Automerge.save(doc);
      this.remoteAdapter.send({ id: docId, binary });
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
