import { APP_FOLDER_NAME } from '../config/google';
import cryptoService from './cryptoService';
import type { DriveItem, StorageService, ItemMetadata } from '../types';

interface DriveFileResponse {
    id: string;
    name: string;
    mimeType: string;
    modifiedTime?: string;
    size?: string;
    parents?: string[];
    appProperties?: {
        isPinned?: string;
        isEncrypted?: string;
    };
}

interface DriveListResponse {
    files: DriveFileResponse[];
}

interface DriveErrorResponse {
    error?: {
        message?: string;
    };
}

class DriveService implements StorageService {
    private accessToken: string | null = null;
    private appFolderId: string | null = null;

    setAccessToken(token: string): void {
        this.accessToken = token;
    }

    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const url = `https://www.googleapis.com/drive/v3${endpoint}`;
        const response = await fetch(url, {
            ...options,
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        if (!response.ok) {
            const error: DriveErrorResponse = await response.json();
            throw new Error(error.error?.message || 'Drive API error');
        }

        return response.json();
    }

    private async createMetadata(metadata: Record<string, unknown>): Promise<DriveFileResponse> {
        const response = await fetch('https://www.googleapis.com/drive/v3/files', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(metadata),
        });

        if (!response.ok) {
            const error: DriveErrorResponse = await response.json();
            throw new Error(error.error?.message || 'Create failed');
        }

        return response.json();
    }

    private async uploadFile(
        metadata: Record<string, unknown>,
        content: string,
        contentType: string = 'text/plain'
    ): Promise<DriveFileResponse> {
        const boundary = '-------314159265358979323846';
        const delimiter = `\r\n--${boundary}\r\n`;
        const closeDelimiter = `\r\n--${boundary}--`;

        const body = delimiter +
            'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            `Content-Type: ${contentType}; charset=UTF-8\r\n\r\n` +
            content +
            closeDelimiter;

        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': `multipart/related; boundary="${boundary}"`,
            },
            body,
        });

        if (!response.ok) {
            const error: DriveErrorResponse = await response.json();
            throw new Error(error.error?.message || 'Upload failed');
        }

        return response.json();
    }

    async initializeAppFolder(): Promise<string> {
        const query = `name='${APP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
        const result = await this.request<DriveListResponse>(
            `/files?q=${encodeURIComponent(query)}&fields=files(id,name)`
        );

        if (result.files?.length > 0) {
            this.appFolderId = result.files[0].id;
            return this.appFolderId;
        }

        const folder = await this.createMetadata({
            name: APP_FOLDER_NAME,
            mimeType: 'application/vnd.google-apps.folder',
        });

        this.appFolderId = folder.id;
        return this.appFolderId;
    }

    async listItems(parentId: string | null = null): Promise<DriveItem[]> {
        const folderId = parentId || this.appFolderId;
        if (!folderId) {
            throw new Error('App folder not initialized');
        }

        const query = `'${folderId}' in parents and trashed=false`;
        const fields = 'files(id,name,mimeType,modifiedTime,size,appProperties,parents)';
        const result = await this.request<DriveListResponse>(
            `/files?q=${encodeURIComponent(query)}&fields=${fields}&orderBy=folder,name`
        );

        return result.files.map(file => ({
            id: file.id,
            name: file.name,
            isFolder: file.mimeType === 'application/vnd.google-apps.folder',
            mimeType: file.mimeType,
            modifiedTime: file.modifiedTime,
            size: file.size,
            isPinned: file.appProperties?.isPinned === 'true',
            isEncrypted: file.appProperties?.isEncrypted === 'true',
            parentId: file.parents?.[0] || null,
        }));
    }

    async createFolder(name: string, parentId: string | null = null): Promise<DriveItem> {
        const folderId = parentId || this.appFolderId;
        if (!folderId) {
            throw new Error('App folder not initialized');
        }

        const folder = await this.createMetadata({
            name,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [folderId],
        });

        return {
            id: folder.id,
            name: folder.name,
            isFolder: true,
            parentId: folderId,
        };
    }

    async createFile(name: string, content: string = '', parentId: string | null = null): Promise<DriveItem> {
        const folderId = parentId || this.appFolderId;
        if (!folderId) {
            throw new Error('App folder not initialized');
        }

        const fileName = /\.(txt|md)$/.test(name) ? name : `${name}.txt`;

        const file = await this.uploadFile({
            name: fileName,
            mimeType: 'text/plain',
            parents: [folderId],
        }, content);

        return {
            id: file.id,
            name: file.name,
            isFolder: false,
            parentId: folderId,
        };
    }

    async getFileContent(fileId: string): Promise<string> {
        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch file content');
        }

        const content = await response.text();

        if (cryptoService.isItemEncrypted(fileId) && cryptoService.isEncrypted(content)) {
            return await cryptoService.decryptData(content);
        }

        return content;
    }

    async updateFileContent(fileId: string, content: string): Promise<void> {
        let finalContent = content;

        if (cryptoService.isItemEncrypted(fileId)) {
            finalContent = await cryptoService.encryptData(content);
        }

        const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'text/plain',
            },
            body: finalContent,
        });

        if (!response.ok) {
            throw new Error('Failed to update file');
        }
    }

    async renameItem(itemId: string, newName: string): Promise<void> {
        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${itemId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: newName }),
        });

        if (!response.ok) {
            const error: DriveErrorResponse = await response.json();
            throw new Error(error.error?.message || 'Rename failed');
        }
    }

    async deleteItem(itemId: string): Promise<boolean> {
        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${itemId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ trashed: true }),
        });

        if (!response.ok) {
            const error: DriveErrorResponse = await response.json();
            throw new Error(error.error?.message || 'Delete failed');
        }

        return true;
    }

    async moveItem(itemId: string, targetFolderId: string): Promise<void> {
        const fileInfo = await this.request<{ parents?: string[] }>(`/files/${itemId}?fields=parents`);
        const previousParents = fileInfo.parents?.join(',') || '';

        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files/${itemId}?addParents=${targetFolderId}&removeParents=${previousParents}`,
            {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            const error: DriveErrorResponse = await response.json();
            throw new Error(error.error?.message || 'Move failed');
        }
    }

    async updateItemMetadata(itemId: string, metadata: ItemMetadata): Promise<void> {
        const appProperties: Record<string, string> = {};

        if (metadata.isPinned !== undefined) {
            appProperties.isPinned = String(metadata.isPinned);
        }

        if (metadata.isEncrypted !== undefined) {
            appProperties.isEncrypted = String(metadata.isEncrypted);
        }

        // Don't send empty appProperties
        if (Object.keys(appProperties).length === 0) {
            return;
        }

        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${itemId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ appProperties }),
        });

        if (!response.ok) {
            const error: DriveErrorResponse = await response.json();
            throw new Error(error.error?.message || 'Update metadata failed');
        }
    }
}

export const driveService = new DriveService();
export default driveService;
