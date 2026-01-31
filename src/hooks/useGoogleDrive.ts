import { useState, useCallback, useEffect } from 'react';
import driveService from '../services/driveService';
import localStorageService from '../services/localStorageService';
import { useAuth } from '../contexts/AuthContext';
import type {
    DriveItem,
    FolderPath,
    UseGoogleDriveReturn,
    NavigateByPathResult,
    AuthContextType,
    StorageService
} from '../types';

/**
 * useGoogleDrive Hook - Dual mode: localStorage (offline) or Google Drive (online)
 * Follows Strategy pattern - switches between storage implementations
 */
export function useGoogleDrive(): UseGoogleDriveReturn {
    // Cast useAuth return to typed interface since AuthContext is not yet migrated
    const { accessToken, isAuthenticated } = useAuth() as AuthContextType;

    const [items, setItems] = useState<DriveItem[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isInitialized, setIsInitialized] = useState<boolean>(false);
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [folderPath, setFolderPath] = useState<FolderPath[]>([]);
    const [isSyncing, setIsSyncing] = useState<boolean>(false);

    // Get the current storage service based on auth state
    const getService = useCallback((): StorageService => {
        return isAuthenticated ? driveService : localStorageService;
    }, [isAuthenticated]);

    // Initialize folder
    useEffect(() => {
        initializeFolder();
    }, [isAuthenticated, accessToken]);

    const loadItems = useCallback(async (folderId: string | null = null) => {
        setIsLoading(true);
        setError(null);
        try {
            const service = getService();
            const loadedItems = await service.listItems(folderId);

            // Sort: Pinned folders, Unpinned folders, Pinned files, Unpinned files
            loadedItems.sort((a, b) => {
                if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
                // Both are same type (both folders or both files)
                // Check pinning
                if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
                // Both same pin status, sort by name
                return a.name.localeCompare(b.name);
            });

            setItems(loadedItems);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setIsLoading(false);
        }
    }, [getService]);

    const initializeFolder = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const service = getService();
            const folderId = await service.initializeAppFolder();
            setCurrentFolderId(folderId);
            setFolderPath([{ id: folderId, name: 'MyGNotes.com' }]);
            setIsInitialized(true);
            await loadItems(folderId);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setIsLoading(false);
        }
    }, [getService, loadItems]);

    const refresh = useCallback(async () => {
        await loadItems(currentFolderId);
    }, [loadItems, currentFolderId]);

    const navigateToFolder = useCallback(async (folderId: string, folderName: string) => {
        setCurrentFolderId(folderId);
        setFolderPath(prev => [...prev, { id: folderId, name: folderName }]);
        await loadItems(folderId);
    }, [loadItems]);

    const navigateUp = useCallback(async () => {
        if (folderPath.length <= 1) return;
        const newPath = folderPath.slice(0, -1);
        const parentFolder = newPath[newPath.length - 1];
        setFolderPath(newPath);
        setCurrentFolderId(parentFolder.id);
        await loadItems(parentFolder.id);
    }, [folderPath, loadItems]);

    const navigateToPath = useCallback(async (index: number) => {
        // Handle -1 as navigation to root
        if (index === -1 || index === 0) {
            const rootFolder = folderPath[0];
            setFolderPath([rootFolder]);
            setCurrentFolderId(rootFolder.id);
            await loadItems(rootFolder.id);
            return;
        }

        if (index >= folderPath.length - 1) return;
        const newPath = folderPath.slice(0, index + 1);
        const targetFolder = newPath[newPath.length - 1];
        setFolderPath(newPath);
        setCurrentFolderId(targetFolder.id);
        await loadItems(targetFolder.id);
    }, [folderPath, loadItems]);

    const createFolder = useCallback(async (name: string): Promise<DriveItem> => {
        setIsLoading(true);
        setError(null);
        try {
            const service = getService();
            const folder = await service.createFolder(name, currentFolderId);
            await refresh();
            return folder;
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [getService, currentFolderId, refresh]);

    const createFile = useCallback(async (name: string, content: string = ''): Promise<DriveItem> => {
        setIsLoading(true);
        setError(null);
        try {
            const service = getService();
            const file = await service.createFile(name, content, currentFolderId);
            await refresh();
            return file;
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [getService, currentFolderId, refresh]);

    const getFileContent = useCallback(async (fileId: string, parentId: string | null = null): Promise<string> => {
        const service = getService();
        try {
            // Use explicit parentId if provided, otherwise fallback to currentFolderId
            // This is crucial for encryption when opening files from search/URL (where currentFolderId might not be the parent)
            return await service.getFileContent(fileId, parentId || currentFolderId);
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            setError(message);
            throw err;
        }
    }, [getService, currentFolderId]);

    const updateFileContent = useCallback(async (fileId: string, content: string, parentId: string | null = null): Promise<void> => {
        const service = getService();
        try {
            // Use explicit parentId if provided, otherwise fallback to currentFolderId
            await service.updateFileContent(fileId, content, parentId || currentFolderId);
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            setError(message);
            throw err;
        }
    }, [getService, currentFolderId]);

    const renameItem = useCallback(async (itemId: string, newName: string): Promise<void> => {
        setIsLoading(true);
        setError(null);
        try {
            const service = getService();
            await service.renameItem(itemId, newName);
            await refresh();
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [getService, refresh]);

    const deleteItem = useCallback(async (itemId: string): Promise<boolean> => {
        setIsLoading(true);
        setError(null);
        try {
            const service = getService();
            await service.deleteItem(itemId);
            await refresh();
            return true;
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [getService, refresh]);

    /**
     * Move an item to a different folder
     * @param {string} itemId - ID of item to move
     * @param {string} targetFolderId - ID of destination folder
     */
    const moveItem = useCallback(async (itemId: string, targetFolderId: string): Promise<void> => {
        setIsLoading(true);
        setError(null);
        try {
            const service = getService();
            await service.moveItem(itemId, targetFolderId);
            await refresh();
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [getService, refresh]);

    /**
     * Toggle the pinned status of an item
     */
    const togglePin = useCallback(async (itemId: string): Promise<void> => {
        setIsLoading(true);
        setError(null);
        try {
            // Find current status to toggle it
            const item = items.find(i => i.id === itemId);
            if (!item) return;

            const service = getService();
            await service.updateItemMetadata(itemId, { isPinned: !item.isPinned });
            await refresh();
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [getService, refresh, items]);

    // Sync localStorage data to Google Drive
    const syncToGoogleDrive = useCallback(async (): Promise<void> => {
        if (!isAuthenticated) return;
        if (!localStorageService.hasLocalData()) return;

        setIsSyncing(true);
        try {
            // Get all local items
            const localItems = localStorageService.getAllItemsFlat();

            // Create items in Google Drive
            const idMapping: Record<string, string> = {}; // Map local IDs to Drive IDs

            // Ensure app folder ID is available
            const appFolderId = await driveService.initializeAppFolder();

            // First, create all folders
            for (const item of localItems.filter(i => i.isFolder)) {
                // Ensure parentId is treated as string, handling potential nulls
                const itemParentId = item.parentId || 'local-root';

                const parentDriveId = itemParentId === 'local-root'
                    ? appFolderId
                    : idMapping[itemParentId];

                const folder = await driveService.createFolder(item.name, parentDriveId);
                idMapping[item.id] = folder.id;
            }

            // Then, create all files
            for (const item of localItems.filter(i => !i.isFolder)) {
                // Ensure parentId is treated as string
                const itemParentId = item.parentId || 'local-root';

                const parentDriveId = itemParentId === 'local-root'
                    ? appFolderId
                    : idMapping[itemParentId];

                // Cast to any because getAllItemsFlat returns FlatItem which has 'content' property
                // but DriveItem doesn't, and we need content here
                const content = (item as any).content || '';
                await driveService.createFile(item.name, content, parentDriveId);
            }

            // Clear local storage after sync
            localStorageService.clearData();

            // Refresh to show Drive items
            await initializeFolder();
        } catch (err) {
            console.error('Sync failed:', err);
            const message = err instanceof Error ? err.message : String(err);
            setError('Failed to sync local data: ' + message);
        } finally {
            setIsSyncing(false);
        }
    }, [isAuthenticated, initializeFolder]);

    /**
     * Navigate to a path by name segments (e.g., ['docker', 'docker basics.md'])
     */
    const navigateByPath = useCallback(async (pathSegments: string[]): Promise<NavigateByPathResult> => {
        if (!pathSegments || pathSegments.length === 0) return { folder: null, file: null };

        const service = getService();
        let currentId = await service.initializeAppFolder();
        const builtPath: FolderPath[] = [{ id: currentId, name: 'MyGNotes.com' }];

        for (let i = 0; i < pathSegments.length; i++) {
            const segmentName = decodeURIComponent(pathSegments[i]);
            const currentItems = await service.listItems(currentId);
            const found = currentItems.find(item => item.name === segmentName);

            if (!found) break;

            if (found.isFolder) {
                currentId = found.id;
                builtPath.push({ id: found.id, name: found.name });
            } else {
                setFolderPath(builtPath);
                setCurrentFolderId(currentId);
                await loadItems(currentId);
                return { folder: builtPath[builtPath.length - 1] as DriveItem, file: found };
            }
        }

        setFolderPath(builtPath);
        setCurrentFolderId(currentId);
        await loadItems(currentId);
        // Cast the last folder in path to DriveItem (it has compatible structure)
        const lastFolder = builtPath[builtPath.length - 1];
        // We need to construct a DriveItem from FolderPath
        const driveFolder: DriveItem = {
            id: lastFolder.id,
            name: lastFolder.name,
            isFolder: true
        };

        return { folder: driveFolder, file: null };
    }, [getService, loadItems]);

    /**
     * Get the current path as URL-friendly names
     */
    const getPathNames = useCallback((): string[] => {
        return folderPath.slice(1).map(p => p.name);
    }, [folderPath]);

    /**
     * Create or open daily note for today
     * Creates "Daily Note" folder if it doesn't exist
     * Creates a note with today's date as filename if it doesn't exist
     * Returns the note file
     */
    const createOrOpenDailyNote = useCallback(async (): Promise<DriveItem | null> => {
        try {
            const service = getService();
            const today = new Date();
            const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            const fileName = `${dateStr}.md`;

            // Get root folder ID
            const rootFolderId = await service.initializeAppFolder();

            // List items at root to find or create Daily Note folder
            const rootItems = await service.listItems(rootFolderId);
            let dailyNoteFolder = rootItems.find(item => item.isFolder && item.name === 'Daily Note');

            if (!dailyNoteFolder) {
                // Create Daily Note folder at root
                dailyNoteFolder = await service.createFolder('Daily Note', rootFolderId);
            }

            // List items in Daily Note folder
            const dailyNoteItems = await service.listItems(dailyNoteFolder.id);
            let todayNote = dailyNoteItems.find(item => !item.isFolder && item.name === fileName);

            if (!todayNote) {
                // Create today's note in Daily Note folder
                todayNote = await service.createFile(fileName, '', dailyNoteFolder.id);
            }

            // Navigate to the Daily Note folder
            setCurrentFolderId(dailyNoteFolder.id);
            setFolderPath([{ id: rootFolderId, name: 'MyGNotes.com' }, { id: dailyNoteFolder.id, name: 'Daily Note' }]);
            await loadItems(dailyNoteFolder.id);

            return todayNote;
        } catch (err) {
            console.error('Failed to create/open daily note:', err);
            setError('Failed to create daily note');
            return null;
        }
    }, [getService, loadItems]);

    return {
        items,
        isLoading,
        error,
        isInitialized,
        currentFolderId,
        folderPath,
        isSyncing,
        navigateToFolder,
        navigateUp,
        navigateToPath,
        navigateByPath,
        getPathNames,
        createFolder,
        createFile,
        getFileContent,
        updateFileContent,
        renameItem,
        deleteItem,
        moveItem,
        togglePin,
        syncToGoogleDrive,
        createOrOpenDailyNote,
        hasLocalData: localStorageService.hasLocalData(),
    };
}

export default useGoogleDrive;
