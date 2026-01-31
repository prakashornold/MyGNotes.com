import cryptoService from './cryptoService';
import type { DriveItem, StorageService, ItemMetadata } from '../types';

const STORAGE_KEY = 'mygnotes_data';

interface LocalItem {
    id: string;
    name: string;
    isFolder: boolean;
    parentId: string | null;
    children?: string[];
    content?: string;
    createdAt: string;
    modifiedAt?: string;
    mimeType?: string;
    isPinned?: boolean;
}

interface LocalStorageData {
    rootId: string;
    items: Record<string, LocalItem>;
}

interface FlatItem extends LocalItem {
    path: string[];
}

class LocalStorageService implements StorageService {
    private data: LocalStorageData;

    constructor() {
        this.data = this.loadData();
    }

    private loadData(): LocalStorageData {
        try {
            let stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) {
                stored = localStorage.getItem('secure_notes_data');
                if (stored) {
                    localStorage.setItem(STORAGE_KEY, stored);
                    localStorage.removeItem('secure_notes_data');
                }
            }
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.error('Failed to load from localStorage:', e);
        }

        return this.getDefaultData();
    }

    private getDefaultData(): LocalStorageData {
        return {
            rootId: 'local-root',
            items: {
                'local-root': {
                    id: 'local-root',
                    name: 'MyGNotes.com',
                    isFolder: true,
                    parentId: null,
                    children: [],
                    createdAt: new Date().toISOString(),
                }
            }
        };
    }

    private saveData(): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
        } catch (e) {
            console.error('Failed to save to localStorage:', e);
        }
    }

    private generateId(): string {
        return 'local-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    async initializeAppFolder(): Promise<string> {
        return this.data.rootId;
    }

    async listItems(parentId: string | null = null): Promise<DriveItem[]> {
        const folderId = parentId || this.data.rootId;
        const parent = this.data.items[folderId];

        if (!parent) return [];

        return (parent.children || [])
            .map(id => this.data.items[id])
            .filter(Boolean)
            .map(item => ({
                id: item.id,
                name: item.name,
                isFolder: item.isFolder,
                mimeType: item.mimeType || (item.isFolder ? 'application/vnd.google-apps.folder' : 'text/plain'),
                modifiedTime: item.modifiedAt || item.createdAt,
                isPinned: item.isPinned || false,
                parentId: item.parentId,
            }))
            .sort((a, b) => {
                if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
                return a.name.localeCompare(b.name);
            });
    }

    async createFolder(name: string, parentId: string | null = null): Promise<DriveItem> {
        const folderId = parentId || this.data.rootId;
        const id = this.generateId();
        const now = new Date().toISOString();

        const folder: LocalItem = {
            id,
            name,
            isFolder: true,
            parentId: folderId,
            children: [],
            createdAt: now,
            modifiedAt: now,
        };

        this.data.items[id] = folder;

        const parent = this.data.items[folderId];
        if (parent) {
            parent.children = [...(parent.children || []), id];
        }

        this.saveData();

        return { id, name, isFolder: true, parentId: folderId };
    }

    async createFile(name: string, content: string = '', parentId: string | null = null): Promise<DriveItem> {
        const folderId = parentId || this.data.rootId;
        const id = this.generateId();
        const now = new Date().toISOString();
        const fileName = /\.(txt|md)$/.test(name) ? name : `${name}.txt`;

        let finalContent = content;
        // Encrypt if folder is locked AND has been unlocked (has key)
        if (cryptoService.canEncryptFolder(folderId)) {
            const folderKey = cryptoService.getFolderKey(folderId);
            if (folderKey && content) {
                finalContent = await cryptoService.encryptWithKey(content, folderKey);
            }
        }

        const file: LocalItem = {
            id,
            name: fileName,
            isFolder: false,
            parentId: folderId,
            content: finalContent,
            createdAt: now,
            modifiedAt: now,
        };

        this.data.items[id] = file;

        const parent = this.data.items[folderId];
        if (parent) {
            parent.children = [...(parent.children || []), id];
        }

        this.saveData();

        return { id, name: fileName, isFolder: false, parentId: folderId };
    }

    async getFileContent(fileId: string, parentId: string | null = null): Promise<string> {
        const file = this.data.items[fileId];
        let content = file?.content || '';

        const folderId = parentId || file?.parentId;

        // Decrypt if folder is locked, file is encrypted, AND folder has been unlocked
        if (folderId && cryptoService.isLockedFolder(folderId)) {
            const folderKey = cryptoService.getFolderKey(folderId);
            if (folderKey && cryptoService.isEncrypted(content)) {
                try {
                    content = await cryptoService.decryptWithKey(content, folderKey);
                } catch (e) {
                    console.error('Failed to decrypt file:', e);
                }
            }
        }

        return content;
    }

    async updateFileContent(fileId: string, content: string, parentId: string | null = null): Promise<void> {
        const file = this.data.items[fileId];
        if (file) {
            const folderId = parentId || file.parentId;

            let finalContent = content;
            // Encrypt if folder is locked AND has been unlocked (has key)
            if (folderId && cryptoService.canEncryptFolder(folderId)) {
                const folderKey = cryptoService.getFolderKey(folderId);
                if (folderKey && content) {
                    finalContent = await cryptoService.encryptWithKey(content, folderKey);
                }
            }

            file.content = finalContent;
            file.modifiedAt = new Date().toISOString();
            this.saveData();
        }
    }

    async renameItem(itemId: string, newName: string): Promise<void> {
        const item = this.data.items[itemId];
        if (item) {
            item.name = newName;
            item.modifiedAt = new Date().toISOString();
            this.saveData();
        }
    }

    async deleteItem(itemId: string): Promise<boolean> {
        const item = this.data.items[itemId];
        if (!item) return false;

        const parent = item.parentId ? this.data.items[item.parentId] : null;
        if (parent) {
            parent.children = (parent.children || []).filter(id => id !== itemId);
        }

        if (item.isFolder && item.children) {
            for (const childId of item.children) {
                await this.deleteItem(childId);
            }
        }

        delete this.data.items[itemId];
        this.saveData();
        return true;
    }

    async moveItem(itemId: string, targetFolderId: string): Promise<void> {
        const item = this.data.items[itemId];
        const targetFolder = this.data.items[targetFolderId];

        if (!item || !targetFolder || !targetFolder.isFolder) {
            throw new Error('Invalid move operation');
        }

        if (item.isFolder && this.isDescendant(targetFolderId, itemId)) {
            throw new Error('Cannot move folder into itself');
        }

        const currentParent = item.parentId ? this.data.items[item.parentId] : null;
        if (currentParent) {
            currentParent.children = (currentParent.children || []).filter(id => id !== itemId);
        }

        targetFolder.children = [...(targetFolder.children || []), itemId];
        item.parentId = targetFolderId;
        item.modifiedAt = new Date().toISOString();

        this.saveData();
    }

    private isDescendant(targetId: string, parentId: string): boolean {
        const parent = this.data.items[parentId];
        if (!parent || !parent.children) return false;

        for (const childId of parent.children) {
            if (childId === targetId) return true;
            if (this.isDescendant(targetId, childId)) return true;
        }
        return false;
    }

    getAllData(): LocalStorageData {
        return this.data;
    }

    getAllItemsFlat(): FlatItem[] {
        const items: FlatItem[] = [];
        const traverse = (parentId: string, path: string[] = []): void => {
            const parent = this.data.items[parentId];
            if (!parent) return;

            for (const childId of (parent.children || [])) {
                const item = this.data.items[childId];
                if (item) {
                    items.push({
                        ...item,
                        path: [...path, parent.name],
                    });
                    if (item.isFolder) {
                        traverse(childId, [...path, parent.name]);
                    }
                }
            }
        };

        traverse(this.data.rootId);
        return items;
    }

    clearData(): void {
        this.data = this.getDefaultData();
        this.saveData();
    }

    hasLocalData(): boolean {
        const root = this.data.items[this.data.rootId];
        return !!(root?.children && root.children.length > 0);
    }

    async updateItemMetadata(itemId: string, metadata: ItemMetadata): Promise<void> {
        const item = this.data.items[itemId];
        if (item) {
            if (metadata.isPinned !== undefined) {
                item.isPinned = metadata.isPinned;
            }
            item.modifiedAt = new Date().toISOString();
            this.saveData();
        }
    }
}

export const localStorageService = new LocalStorageService();
export default localStorageService;
