
import {
  NetworkAdapterInterface,
  PeerId,
  RepoMessage,
  Message,
  NetworkAdapterEvents,
  PeerMetadata,
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
  getDoc,
  deleteDoc,
} from 'firebase/firestore';
import { EventEmitter } from 'eventemitter3';

export class FirestoreNetworkAdapter extends EventEmitter<NetworkAdapterEvents> implements NetworkAdapterInterface {
  private firestore: Firestore;
  private collectionName: string;
  peerId?: PeerId;
  private ready = false;
  private unsubscribe?: () => void;

  constructor(firestore: Firestore, collectionName: string = 'messages') {
    super();
    this.firestore = firestore;
    this.collectionName = collectionName;
  }

  async connect(peerId: PeerId, peerMetadata?: PeerMetadata) {
    this.peerId = peerId;
    this.emit('peer-candidate', { peerId, peerMetadata: peerMetadata || {} });

    // Get a reliable server timestamp
    const tempDoc = doc(collection(this.firestore, 'heartbeats'));
    await setDoc(tempDoc, { timestamp: serverTimestamp() });
    const snapshot = await getDoc(tempDoc);
    const serverTime = (snapshot.data()?.timestamp as Timestamp) || new Timestamp(new Date().getTime() / 1000, 0);
    await deleteDoc(tempDoc);

    this.ready = true;
    this.emit('ready', { network: this });

    const q = query(
      collection(this.firestore, this.collectionName),
      where('timestamp', '>=', serverTime)
    );

    this.unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          if (data.senderId !== this.peerId) {
            this.emit('message', data as Message);
          }
        }
      });
    });
  }

  send(message: Message) {
    const docRef = doc(collection(this.firestore, this.collectionName));
    setDoc(docRef, {
      ...message,
      timestamp: serverTimestamp(),
    });
  }

  disconnect() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  isReady() {
    return this.ready;
  }

  whenReady() {
    return new Promise<void>((resolve) => {
      if (this.ready) {
        resolve();
      } else {
        this.once('ready', () => resolve());
      }
    });
  }
}
