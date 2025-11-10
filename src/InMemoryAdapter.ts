
import { LocalAdapter, LocalDocument } from './types.js';

/**
 * An in-memory implementation of the LocalAdapter interface for testing and demonstration.
 */
export class InMemoryAdapter implements LocalAdapter {
  private documents: Map<string, Uint8Array> = new Map();

  async get(id: string): Promise<Uint8Array | null> {
    return this.documents.get(id) || null;
  }

  async getAll(): Promise<LocalDocument[]> {
    const docs: LocalDocument[] = [];
    for (const [id, binary] of this.documents.entries()) {
      docs.push({ id, binary });
    }
    return docs;
  }

  async put(id: string, binary: Uint8Array): Promise<void> {
    this.documents.set(id, binary);
  }

  async putAll(docs: LocalDocument[]): Promise<void> {
    for (const doc of docs) {
      this.documents.set(doc.id, doc.binary);
    }
  }

  async delete(id: string): Promise<void> {
    this.documents.delete(id);
  }

  async deleteAll(ids: string[]): Promise<void> {
    for (const id of ids) {
      this.documents.delete(id);
    }
  }
}
