import type { TagEntity } from '../types/index.js';
import { getCollectionData, saveDocumentData, deleteDocumentData } from '../lib/firebase';

const TAGS_STORAGE_KEY = 'puskesmas_cms_tags';
const FIRESTORE_COLLECTION = 'cms_tags';

const INITIAL_TAGS: TagEntity[] = [
  { id: 'tag-1', name: 'Stunting', slug: 'stunting', usageCount: 12, createdAt: new Date().toISOString() },
  { id: 'tag-2', name: 'Vaksinasi', slug: 'vaksinasi', usageCount: 8, createdAt: new Date().toISOString() },
  { id: 'tag-3', name: 'Posyandu', slug: 'posyandu', usageCount: 15, createdAt: new Date().toISOString() },
  { id: 'tag-4', name: 'Demam Berdarah', slug: 'demam-berdarah', usageCount: 5, createdAt: new Date().toISOString() },
  { id: 'tag-5', name: 'Kesehatan Ibu', slug: 'kesehatan-ibu', usageCount: 10, createdAt: new Date().toISOString() }
];

function getStoredTags(): TagEntity[] {
  try {
    const data = localStorage.getItem(TAGS_STORAGE_KEY);
    if (!data) {
      localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(INITIAL_TAGS));
      return INITIAL_TAGS;
    }
    return JSON.parse(data);
  } catch {
    return INITIAL_TAGS;
  }
}

function saveStoredTags(tags: TagEntity[]) {
  try {
    localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(tags));
  } catch (err) {
    console.error('Failed to save tags:', err);
  }
}

export const tagService = {
  async getTags(): Promise<TagEntity[]> {
    try {
      const cloudData = await getCollectionData<TagEntity>(
        FIRESTORE_COLLECTION,
        TAGS_STORAGE_KEY,
        INITIAL_TAGS
      );
      return (cloudData && cloudData.length > 0 ? cloudData : getStoredTags()).sort((a, b) => b.usageCount - a.usageCount);
    } catch {
      return getStoredTags().sort((a, b) => b.usageCount - a.usageCount);
    }
  },

  async addOrGetTag(tagName: string): Promise<TagEntity> {
    const normalized = tagName.trim();
    if (!normalized) throw new Error('Nama tag tidak boleh kosong');

    const slug = normalized.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
    const tags = getStoredTags();

    const existing = tags.find(t => t.slug === slug || t.name.toLowerCase() === normalized.toLowerCase());
    if (existing) {
      existing.usageCount += 1;
      saveStoredTags(tags);
      saveDocumentData(FIRESTORE_COLLECTION, existing.id, existing, TAGS_STORAGE_KEY).catch(() => {});
      return existing;
    }

    const newTag: TagEntity = {
      id: `tag-${Date.now()}`,
      name: normalized,
      slug,
      usageCount: 1,
      createdAt: new Date().toISOString()
    };

    saveStoredTags([...tags, newTag]);
    saveDocumentData(FIRESTORE_COLLECTION, newTag.id, newTag, TAGS_STORAGE_KEY).catch(() => {});
    return newTag;
  },

  async deleteTag(id: string): Promise<void> {
    const tags = getStoredTags();
    saveStoredTags(tags.filter(t => t.id !== id));
    deleteDocumentData(FIRESTORE_COLLECTION, id, TAGS_STORAGE_KEY).catch(() => {});
  }
};
