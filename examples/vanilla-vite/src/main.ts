
import './style.css';
import Automerge from '@automerge/automerge';
import { SyncManager, FirestoreAdapter, InMemoryAdapter } from 'listedb-sync-manager';
import { firebaseConfig } from './firebase-config';

interface TextDoc {
  text: string;
}

const editor = document.getElementById('editor') as HTMLTextAreaElement;
const state = document.getElementById('state') as HTMLPreElement;

const docId = 'collaborative-text-doc';

// Initialize adapters
const localAdapter = new InMemoryAdapter();
const remoteAdapter = new FirestoreAdapter(firebaseConfig, 'documents');

// Initialize SyncManager
const syncManager = new SyncManager<TextDoc>(localAdapter, remoteAdapter);

// Subscribe to document changes
syncManager.subscribe(docId, (doc) => {
  editor.value = doc.text;
  state.textContent = JSON.stringify(doc, null, 2);
});

// Bootstrap the SyncManager
syncManager.bootstrap().then(() => {
  let doc = syncManager.getDocument(docId);
  if (!doc) {
    // Create the document if it doesn't exist
    const newDoc = Automerge.from({ text: '' });
    localAdapter.put(docId, Automerge.save(newDoc));
    syncManager.updateDocument(docId, (d) => {
      d.text = '';
    });
  }
});

// Handle editor input
editor.addEventListener('input', () => {
  syncManager.updateDocument(docId, (doc) => {
    doc.text = editor.value;
  });
});
