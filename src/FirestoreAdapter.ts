
import {
  collection,
  onSnapshot,
  doc as fireDoc,
  setDoc,
  getDocs,
  Firestore,
} from 'firebase/firestore';
import { RemoteAdapter, LocalDocument } from './types.js';

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

  watch(callback: (doc: LocalDocument) => void): () => void {
    const q = collection(this.firestore, this.collectionName);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' || change.type === 'modified') {
          const data = change.doc.data();
          const doc: LocalDocument = {
            id: change.doc.id,
            binary: new Uint8Array(data.binary),
          };
          callback(doc);
        }
      });
    });
    return unsubscribe;
  }

  async send(doc: LocalDocument): Promise<void> {
    const { id, binary } = doc;
    const docRef = fireDoc(this.firestore, this.collectionName, id);
    await setDoc(docRef, { binary: Array.from(binary) });
  }

  async getSnapshot(): Promise<LocalDocument[]> {
    const q = collection(this.firestore, this.collectionName);
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      binary: new Uint8Array(doc.data().binary),
    }));
  }
}
