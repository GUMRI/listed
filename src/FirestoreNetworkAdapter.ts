
import {
  NetworkAdapterInterface,
  PeerId,
  RepoMessage,
  InboundMessage,
} from '@automerge/automerge-repo';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  Firestore,
  serverTimestamp,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { EventEmitter } from 'eventemitter3';

export class FirestoreNetworkAdapter extends EventEmitter<any> implements NetworkAdapterInterface {
  private firestore: Firestore;
  private collectionName: string;
  private peerId?: PeerId;
  private unsubscribe?: () => void;

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

    this.unsubscribe = onSnapshot(q, (snapshot) => {
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
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}
