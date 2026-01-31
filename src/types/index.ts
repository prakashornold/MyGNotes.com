// Core types for MyGNotes.com application - Following Interface Segregation Principle

// ============== Domain Types ==============

export interface DriveItem {
    id: string;
    name: string;
    isFolder: boolean;
    mimeType?: string;
    modifiedTime?: string;
    size?: string;
    isPinned?: boolean;
    parentId?: string | null;
}

export interface FolderPath {
    id: string;
    name: string;
    isFile?: boolean;
}

export interface User {
    id: string;
    email: string;
    name: string;
    picture?: string;
    given_name?: string;
    family_name?: string;
}

// ============== Storage Service Interface (Strategy Pattern) ==============

export interface StorageService {
    listItems(parentId?: string | null): Promise<DriveItem[]>;
    createFolder(name: string, parentId?: string | null): Promise<DriveItem>;
    createFile(name: string, content?: string, parentId?: string | null): Promise<DriveItem>;
    getFileContent(fileId: string, parentId?: string | null): Promise<string>;
    updateFileContent(fileId: string, content: string, parentId?: string | null): Promise<void>;
    renameItem(itemId: string, newName: string): Promise<void>;
    deleteItem(itemId: string): Promise<boolean>;
    moveItem(itemId: string, targetFolderId: string): Promise<void>;
    updateItemMetadata(itemId: string, metadata: ItemMetadata): Promise<void>;
    initializeAppFolder(): Promise<string>;
}

export interface ItemMetadata {
    isPinned?: boolean;
}

// ============== Auth Types ==============

export interface AuthContextType {
    user: User | null;
    accessToken: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    signIn: () => void;
    signOut: () => void;
}

export interface GoogleTokenResponse {
    access_token: string;
    expires_in?: number;
    token_type?: string;
    scope?: string;
}

// ============== Theme Types ==============

export type Theme = 'light' | 'dark';

export interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

// ============== Hook Return Types ==============

export interface UseGoogleDriveReturn {
    items: DriveItem[];
    isLoading: boolean;
    error: string | null;
    isInitialized: boolean;
    currentFolderId: string | null;
    folderPath: FolderPath[];
    isSyncing: boolean;
    navigateToFolder: (folderId: string, folderName: string) => void;
    navigateUp: () => void;
    navigateToPath: (index: number) => void;
    navigateByPath: (pathSegments: string[]) => Promise<NavigateByPathResult>;
    getPathNames: () => string[];
    createFolder: (name: string) => Promise<DriveItem>;
    createFile: (name: string) => Promise<DriveItem>;
    getFileContent: (fileId: string, parentId?: string | null) => Promise<string>;
    updateFileContent: (fileId: string, content: string, parentId?: string | null) => Promise<void>;
    renameItem: (itemId: string, newName: string) => Promise<void>;
    deleteItem: (itemId: string) => Promise<boolean>;
    moveItem: (itemId: string, targetFolderId: string) => Promise<void>;
    togglePin: (itemId: string) => Promise<void>;
    syncToGoogleDrive: () => Promise<void>;
    createOrOpenDailyNote: () => Promise<DriveItem | null>;
    hasLocalData: boolean;
}

export interface NavigateByPathResult {
    folder: DriveItem | null;
    file: DriveItem | null;
}

export interface UseDragAndDropReturn {
    isDragging: boolean;
    draggedItem: DriveItem | null;
    dropTargetId: string | null;
    handleDragStart: (e: React.DragEvent, item: DriveItem) => void;
    handleDragEnd: () => void;
    handleDragOver: (e: React.DragEvent, targetId: string) => void;
    handleDragLeave: () => void;
    handleDrop: (e: React.DragEvent, targetFolder: DriveItem) => void;
}

// ============== Component Props ==============

export interface FileGridProps {
    items: DriveItem[];
    searchQuery?: string;
    isLoading?: boolean;
    onItemClick?: (item: DriveItem) => void;
    onItemDoubleClick?: (item: DriveItem) => void;
    onItemEdit?: (item: DriveItem) => void;
    onItemView?: (item: DriveItem) => void;
    onRename?: (itemId: string, newName: string) => void;
    onDelete?: (itemId: string) => void;
    onMoveItem?: (itemId: string, targetFolderId: string) => void;
    onLockFolder?: (folderId: string) => void;
    onUnlockFolder?: (folderId: string) => void;
    onTogglePin?: (itemId: string) => void;
}

export interface NoteEditorProps {
    file: DriveItem | null;
    content: string;
    isLoading?: boolean;
    onContentChange: (content: string) => void;
    onSave: (content: string) => Promise<void>;
    onBack: () => void;
    isSaving?: boolean;
    viewOnly?: boolean;
}

export interface NavbarProps {
    user: User | null;
    isAuthenticated: boolean;
    breadcrumbs: FolderPath[]; // Maps to breadcrumbs prop in component
    onNavigate: (index: number) => void;
    onNavigateUp?: () => void; // Optional in Navbar.jsx
    onSearch?: (query: string) => void;
    onNewFolder: () => void; // Maps to onNewFolder
    onNewFile: () => void;   // Maps to onNewFile
    onDailyNote: () => void; // Maps to onDailyNote
    searchQuery?: string;
    onSignIn: () => void;
    onSignOut?: () => void;
    isLoading?: boolean;
    isSyncing?: boolean;
    onMenuClick?: () => void;
    onLogoClick?: () => void;
}

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export interface CreateItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'folder' | 'file';
    onSubmit: (name: string) => void;
}

export interface PasswordModalProps {
    isOpen: boolean;
    isSetup?: boolean;
    folderName?: string;
    onSubmit: (password: string) => void;
    onSkip?: () => void;
    error?: string;
    isLoading?: boolean;
}

export interface HeaderProps {
    user: User | null;
    isAuthenticated: boolean;
    onSignIn: () => void;
    onSignOut: () => void;
    showNav?: boolean;
}

export interface SidebarProps {
    items: DriveItem[];
    folderPath: FolderPath[];
    currentFolderId: string | null;
    isLoading: boolean;
    selectedItem: DriveItem | null;
    onSelectItem: (item: DriveItem) => void;
    onNavigateToFolder: (folderId: string, folderName: string) => void;
    onNavigateUp: () => void;
    onNavigateToPath: (index: number) => void;
    onCreateFolder: (name: string) => Promise<void>;
    onCreateFile: (name: string) => Promise<DriveItem | null>;
    onRename: (itemId: string, newName: string) => Promise<void>;
    onDelete: (itemId: string) => Promise<void>;
    user: User | null;
    onSignOut: () => void;
    // Responsive props
    isOpen?: boolean;
    onClose?: () => void;
    isMobile?: boolean;
}

export interface HomePageProps {
    onGetStarted: () => void;
}

export interface LoginProps {
    // No props, uses useAuth internally
}

export interface UserDropdownProps {
    user: User | null;
    onSignOut: () => void;
}

// ============== Google API Types ==============

export interface GoogleConfig {
    clientId: string;
    scopes: string;
}

// Window augmentation for Google Identity Services
declare global {
    interface Window {
        google?: {
            accounts: {
                oauth2: {
                    initTokenClient: (config: {
                        client_id: string;
                        scope: string;
                        callback: (response: GoogleTokenResponse) => void;
                    }) => { requestAccessToken: () => void };
                    revoke: (token: string) => void;
                };
            };
        };
    }
}
