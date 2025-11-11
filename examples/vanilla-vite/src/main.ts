
import './style.css';
import * as Automerge from '@automerge/automerge';
import { Repo, DocHandle } from '@automerge/automerge-repo';
import { IndexedDBStorageAdapter } from '@automerge/automerge-repo-storage-indexeddb';
import { FirestoreNetworkAdapter } from 'listedb-sync-manager';
import { firebaseConfig } from './firebase-config';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

interface TextDoc {
  text: string;
}

const editor = document.getElementById('editor') as HTMLTextAreaElement;
const state = document.getElementById('state') as HTMLPreElement;

async function main() {
  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const firestore = getFirestore(app);

  const repo = new Repo({
    storage: new IndexedDBStorageAdapter(),
    network: [new FirestoreNetworkAdapter(firestore)],
  });

  let handle: DocHandle<TextDoc>;
  const docId = localStorage.getItem('docId');

  if (docId) {
    handle = repo.find<TextDoc>(docId);
  } else {
    handle = repo.create<TextDoc>();
    handle.change((d) => (d.text = ''));
    localStorage.setItem('docId', handle.url);
  }

  await handle.whenReady();

  editor.disabled = false;
  editor.value = handle.docSync()?.text || '';
  state.textContent = JSON.stringify(handle.docSync(), null, 2);

  handle.on('change', ({ doc }) => {
    editor.value = doc.text;
    state.textContent = JSON.stringify(doc, null, 2);
  });

  editor.addEventListener('input', () => {
    handle.change((d) => {
      d.text = editor.value;
    });
  });
}

main();
