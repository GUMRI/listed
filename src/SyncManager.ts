import * as Automerge from '@automerge/automerge';
import { LocalAdapter, RemoteAdapter, CRDTDocument } from './types';

/**
 * The SyncManager class is responsible for synchronizing data between a local and remote adapter.
 */
export class SyncManager<T> {
  private localAdapter: LocalAdapter<T>;
  private remoteAdapter: RemoteAdapter<T>;
  private collectionName: string;
  private isOnline: boolean = navigator.onLine;
  private localChangesQueue: CRDTDocument<T>[] = [];
  private remoteChangesQueue: CRDTDocument<T>[] = [];
  private syncState: Automerge.SyncState;

  constructor(
    localAdapter: LocalAdapter<T>,
    remoteAdapter: RemoteAdapter<T>,
    collectionName: string
  ) {
    this.localAdapter = localAdapter;
    this.remoteAdapter = remoteAdapter;
    this.collectionName = collectionName;
    this.syncState = Automerge.initSyncState();
    window.addEventListener('online', () => (this.isOnline = true));
    window.addEventListener('offline', () => (this.isOnline = false));
  }

  /**
   * Initializes the SyncManager, loads initial data, and detects divergence.
   */
  async bootstrap(): Promise<void> {
    if (!this.isOnline) {
      console.log('Offline. Skipping bootstrap.');
      return;
    }

    const localDocs = await this.localAdapter.getAll();
    const remoteDocs = await this.remoteAdapter.getSnapshot(this.collectionName);

    // Pseudocode for divergence detection and initial sync
    // 1. Compare local and remote docs
    // 2. If local changes exist, push them
    // 3. If remote changes exist, pull them
    // 4. Update checkpoint
  }

  /**
   * Watches for remote changes and merges them into the local database.
   */
  watchRemote(): () => void {
    return this.remoteAdapter.watch(this.collectionName, (remoteDocs) => {
      this.remoteChangesQueue.push(...remoteDocs);
      this.processRemoteChanges();
    });
  }

  /**
   * Enqueues a local change to be pushed to the remote adapter.
   * @param doc The document to be enqueued.
   */
  enqueue(doc: CRDTDocument<T>): void {
    this.localChangesQueue.push(doc);
    this.processLocalChanges();
  }

  /**
   * Pushes local changes to the remote adapter.
   */
  private async push(): Promise<void> {
    if (!this.isOnline || this.localChangesQueue.length === 0) {
      return;
    }

    // Pseudocode for pushing local changes
    // 1. Send queued local changes to remote in a batch
    // 2. Update checkpoint
  }

  /**
   * Pulls remote changes and merges them into the local database.
   */
  private async pull(): Promise<void> {
    if (this.remoteChangesQueue.length === 0) {
      return;
    }

    // Pseudocode for pulling remote changes
    // 1. Fetch remote changes
    // 2. Merge with local using Automerge.merge()
    // 3. Update local checkpoint
  }

  /**
   * Processes the queue of local changes.
   */
  private async processLocalChanges(): Promise<void> {
    await this.push();
  }

  /**
   * Processes the queue of remote changes.
   */
  private async processRemoteChanges(): Promise<void> {
    await this.pull();
  }

  /**
   * Merges a remote document with a local document.
   * @param localDoc The local document.
   * @param remoteDoc The remote document.
   * @returns The merged document.
   */
  private merge(localDoc: Automerge.Doc<T>, remoteDoc: Automerge.Doc<T>): Automerge.Doc<T> {
    return Automerge.merge(localDoc, remoteDoc);
  }

  /**
   * Checks if there are local changes to be pushed.
   * @returns True if there are local changes, false otherwise.
   */
  hasLocalChange(): boolean {
    return this.localChangesQueue.length > 0;
  }

  /**
   * Checks if there are remote changes to be pulled.
   * @returns True if there are remote changes, false otherwise.
   */
  hasRemoteChange(): boolean {
    return this.remoteChangesQueue.length > 0;
  }
}
