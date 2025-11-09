
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  getDocs,
  Firestore,
} from 'firebase/firestore';
import { RemoteAdapter, SyncMessage, LocalDocument } from './types';

/**
 * An implementation of the RemoteAdapter interface for Firestore.
 */
export class FirestoreAdapter implements RemoteAdapter {
  private firestore: Firestore;
  private collectionName: string;

  constructor(firestore: Firestore, collectionName: string) {
    this.firestore = firestore;
    this.collectionName = collectionName;
  }

  watch(callback: (message: SyncMessage) => void): () => void {
    const q = collection(this.firestore, this.collectionName);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' || change.type === 'modified') {
          const data = change.doc.data();
          const message: SyncMessage = {
            docId: change.doc.id,
            message: new Uint8Array(data.message),
          };
          callback(message);
        }
      });
    });
    return unsubscribe;
  }

  async send(message: SyncMessage): Promise<void> {
    const { docId, message: syncMessage } = message;
    const docRef = doc(this.firestore, this.collectionName, docId);
    await setDoc(docRef, { message: Array.from(syncMessage) });
  }

  async getSnapshot(): Promise<LocalDocument[]> {
    const q = collection(this.firestore, this.collectionName);
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      binary: new Uint8Array(doc.data().message),
    }));
  }
}
