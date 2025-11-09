"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("./style.css");
const automerge_1 = __importDefault(require("@automerge/automerge"));
const listedb_sync_manager_1 = require("listedb-sync-manager");
const firebase_config_1 = require("./firebase-config");
const editor = document.getElementById('editor');
const state = document.getElementById('state');
const docId = 'collaborative-text-doc';
// Initialize adapters
const localAdapter = new listedb_sync_manager_1.InMemoryAdapter();
const remoteAdapter = new listedb_sync_manager_1.FirestoreAdapter(firebase_config_1.firebaseConfig, 'documents');
// Initialize SyncManager
const syncManager = new listedb_sync_manager_1.SyncManager(localAdapter, remoteAdapter);
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
        const newDoc = automerge_1.default.from({ text: '' });
        localAdapter.put(docId, automerge_1.default.save(newDoc));
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
