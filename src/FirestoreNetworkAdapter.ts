
import {
  NetworkAdapter,
  PeerId,
  RepoMessage,
  InboundMessage,
  Message,
} from '@automerge/automerge-repo';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  getDocs,
  Firestore,
  serverTimestamp,
  query,
  where,
  limit,
  orderBy,
  Timestamp,
} from 'firebase/firestore';

export class FirestoreNetworkAdapter extends NetworkAdapter {
  private firestore: Firestore;
  private collectionName: string;
  private peerId?: PeerId;

  constructor(firestore: Firestore, collectionName: string = 'messages') {
    super();
    this.firestore = firestore;
    this.collectionName = collectionName;
  }

  connect(peerId: PeerId) {
    this.peerId = peerId;
    this.emit('peer-candidate', { peerId });

    const q = query(
      collection(this.firestore, this.collectionName),
      where('timestamp', '>=', new Date())
    );

    onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          if (data.senderId !== this.peerId) {
            this.emit('message', {
              ...data,
              targetId: this.peerId,
            } as InboundMessage);
          }
        }
      });
    });
  }

  async send(message: RepoMessage) {
    const { type, senderId, targetId, ...rest } = message;
    const docRef = doc(collection(this.firestore, this.collectionName));
    await setDoc(docRef, {
      ...rest,
      type,
      senderId,
      targetId,
      timestamp: serverTimestamp(),
    });
  }

  disconnect() {
    // No-op
  }
}
