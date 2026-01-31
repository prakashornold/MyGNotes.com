import { useState, useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { useGoogleDrive } from './hooks/useGoogleDrive';
import { Header } from './components/Layout/Header';
import { Footer } from './components/Layout/Footer';
import { HomePage } from './components/HomePage/HomePage';
import { Navbar } from './components/Navbar/Navbar';
// Sidebar removed per user request
import { FileGrid } from './components/FileGrid/FileGrid';
import { NoteEditor } from './components/Editor/NoteEditor';
import { MarkdownViewer } from './components/Viewer/MarkdownViewer';
import { isMarkdownFile } from './utils/fileUtils';
import { CreateItemModal } from './components/Modal/Modal';
import { PasswordModal } from './components/Modal/PasswordModal';
import cryptoService from './services/cryptoService';
import './App.css';
import type { DriveItem } from './types';

/**
 * Main Application - MyGNotes.com
 * - Logged in users: Show file grid directly
 * - Logged out users: Show home page
 */
function AppContent() {
    const { user, isAuthenticated, isLoading: authLoading, signIn, signOut } = useAuth();
    const {
        items,
        isLoading: driveLoading,
        error,
        folderPath,
        isSyncing,
        isInitialized,
        navigateToFolder,
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
        hasLocalData,
    } = useGoogleDrive();

    // React Router hooks for URL-based navigation
    const location = useLocation();
    const navigate = useNavigate();
    const isNavigatingFromUrl = useRef(false);

    const [showApp, setShowApp] = useState(false);
    const [selectedFile, setSelectedFile] = useState<DriveItem | null>(null);
    const [viewOnly, setViewOnly] = useState(false);
    const [fileContent, setFileContent] = useState('');
    const [isLoadingFile, setIsLoadingFile] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState<'folder' | 'file' | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Mobile detection for responsive layout
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Password modal state for folder locking
    const [passwordError, setPasswordError] = useState('');
    const [isUnlocking, setIsUnlocking] = useState(false);

    // Folder locking state
    const [folderToLock, setFolderToLock] = useState<DriveItem | null>(null);
    const [folderToUnlock, setFolderToUnlock] = useState<DriveItem | null>(null);

    // Sync local data when user logs in
    useEffect(() => {
        if (isAuthenticated && hasLocalData) {
            syncToGoogleDrive();
        }
    }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

    const loadFileContent = async (fileId: string, parentId: string | null = null) => {
        setIsLoadingFile(true);
        try {
            const content = await getFileContent(fileId, parentId);
            setFileContent(content);
        } catch (err) {
            console.error('Failed to load file:', err);
            setFileContent('');
        } finally {
            setIsLoadingFile(false);
        }
    };

    useEffect(() => {
        if (selectedFile && !selectedFile.isFolder) {
            loadFileContent(selectedFile.id, selectedFile.parentId);
        }
    }, [selectedFile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    // Navigate from URL on initial load and handle routing updates
    useEffect(() => {
        if (!isInitialized) return;

        const pathParts = location.pathname.split('/').filter(Boolean);
        // URL format: /folder/subfolder/file.md (Root-based routing)
        if (pathParts.length > 0) {
            // Treat all segments as path
            const segments = pathParts;

            // Prevent loop: check if URL matches current internal state
            const currentPathNames = getPathNames();
            let currentUrlPath = '';
            if (currentPathNames.length > 0) currentUrlPath += '/' + currentPathNames.map(encodeURIComponent).join('/');
            if (selectedFile) currentUrlPath += '/' + encodeURIComponent(selectedFile.name);

            // Normalize currentUrlPath to ensure it starts with / if not empty
            if (currentUrlPath === '') currentUrlPath = '/';

            // Only update state if URL is different (decode to match)
            if (location.pathname !== currentUrlPath) {
                isNavigatingFromUrl.current = true;
                navigateByPath(segments).then(({ file }) => {
                    if (file) {
                        setSelectedFile(file);
                        setViewOnly(true);
                    } else {
                        setSelectedFile(null);
                        setFileContent('');
                    }
                    isNavigatingFromUrl.current = false;
                });
            }
        }
    }, [isInitialized, location.pathname]); // Listen to location changes (Back button)

    // Update URL when folder path or selected file changes
    useEffect(() => {
        if (!isInitialized || isNavigatingFromUrl.current) return;

        const pathNames = getPathNames();
        let urlPath = ''; // Start from root

        if (pathNames.length > 0) {
            urlPath += '/' + pathNames.map(encodeURIComponent).join('/');
        }

        if (selectedFile) {
            urlPath += '/' + encodeURIComponent(selectedFile.name);
        }

        // Default to '/' if empty
        if (urlPath === '') urlPath = '/';

        if (location.pathname !== urlPath) {
            // Use push (default) for navigation to support back button
            navigate(urlPath);
        }
    }, [folderPath, selectedFile, isInitialized, getPathNames, navigate, location.pathname]);

    const handleLockFolder = (folderId: string) => {
        const folder = items.find(i => i.id === folderId);
        if (folder) setFolderToLock(folder);
    };

    const handleFolderPasswordSubmit = async (password: string) => {
        setPasswordError('');
        setIsUnlocking(true);

        try {
            if (folderToLock) {
                // Lock the folder and derive key
                await cryptoService.lockFolder(folderToLock.id, password);

                // Get all files in this folder (non-recursive)
                const filesInFolder = items.filter(
                    item => !item.isFolder && item.parentId === folderToLock.id
                );

                // Encrypt all existing files
                if (filesInFolder.length > 0) {
                    for (const file of filesInFolder) {
                        try {
                            // Read the current content
                            const content = await getFileContent(file.id, file.parentId);

                            // Only encrypt if not already encrypted
                            if (!cryptoService.isEncrypted(content)) {
                                // Re-save (will auto-encrypt using canEncryptFolder)
                                await updateFileContent(file.id, content, file.parentId);
                            }
                        } catch (err) {
                            console.error(`Failed to encrypt file ${file.name}:`, err);
                        }
                    }
                }

                setFolderToLock(null);
            } else if (folderToUnlock) {
                // Unlock to enter folder
                const success = await cryptoService.unlockFolder(folderToUnlock.id, password);
                if (!success) {
                    setPasswordError('Incorrect password');
                    setIsUnlocking(false);
                    return;
                }
                // Navigate into the folder
                navigateToFolder(folderToUnlock.id, folderToUnlock.name);
                setFolderToUnlock(null);
            }
        } catch (err) {
            console.error('Folder lock error:', err);
            setPasswordError('Failed. Please try again.');
        } finally {
            setIsUnlocking(false);
        }
    };

    const handleUnlockFolder = (folderId: string) => {
        const folder = items.find(i => i.id === folderId);
        if (!folder) return;
        setFolderToUnlock(folder);
    };

    // Override folder navigation to check for locks
    const handleFolderDoubleClick = useCallback((item: DriveItem) => {
        if (item.isFolder) {
            if (cryptoService.isLockedFolder(item.id) && !cryptoService.isFolderUnlocked(item.id)) {
                // Need password to enter
                setFolderToUnlock(item);
            } else {
                navigateToFolder(item.id, item.name);
            }
        } else {
            setSelectedFile(item);
            setViewOnly(true); // Default to View Only on open
        }
    }, [navigateToFolder]);

    const handleGetStarted = () => setShowApp(true);

    const handleItemClick = useCallback((item: DriveItem) => {
        if (item.isFolder) {
            // Mobile: click navigates
            if (window.innerWidth <= 768) {
                handleFolderDoubleClick(item);
            }
        } else {
            // Click opens file in View mode (both mobile and desktop)
            loadFileContent(item.id, item.parentId);
            setSelectedFile(item);
            setViewOnly(true);
        }
    }, [handleFolderDoubleClick, loadFileContent]);

    const handleItemEdit = useCallback((item: DriveItem) => {
        loadFileContent(item.id, item.parentId);
        setSelectedFile(item);
        setViewOnly(false);
    }, [loadFileContent]);

    const handleItemView = useCallback((item: DriveItem) => {
        loadFileContent(item.id, item.parentId);
        setSelectedFile(item);
        setViewOnly(true);
    }, [loadFileContent]);

    const handleNavigate = useCallback((index: number) => navigateToPath(index), [navigateToPath]);

    const handleCreateFolder = useCallback(async (name: string) => {
        try { await createFolder(name); } catch (err) { console.error(err); }
    }, [createFolder]);

    const handleCreateFile = useCallback(async (name: string) => {
        try {
            const file = await createFile(name);
            if (file) {
                // Load content and open in editor
                await loadFileContent(file.id, file.parentId);
                setSelectedFile(file);
                setViewOnly(false);
            }
            return file;
        } catch (err) {
            console.error(err);
            return null;
        }
    }, [createFile, loadFileContent]);

    const handleDailyNote = useCallback(async () => {
        try {
            const todayNote = await createOrOpenDailyNote();
            if (!todayNote) {
                console.error('Failed to create daily note');
                return;
            }

            await loadFileContent(todayNote.id, todayNote.parentId);
            setSelectedFile(todayNote);
            setViewOnly(false);
        } catch (err) {
            console.error('Failed to create/open daily note:', err);
        }
    }, [createOrOpenDailyNote, loadFileContent]);

    const handleRename = useCallback(async (itemId: string, newName: string) => {
        try { await renameItem(itemId, newName); } catch (err) { console.error(err); }
    }, [renameItem]);

    const handleDelete = useCallback(async (itemId: string) => {
        try {
            await deleteItem(itemId);
            if (selectedFile?.id === itemId) {
                setSelectedFile(null);
                setFileContent('');
            }
        } catch (err) { console.error(err); }
    }, [deleteItem, selectedFile]);


    const handleContentChange = useCallback((newContent: string) => setFileContent(newContent), []);

    const handleSave = useCallback(async (content: string) => {
        if (!selectedFile) return;
        setIsSaving(true);
        try {
            await updateFileContent(selectedFile.id, content, selectedFile.parentId);
        } catch (err) {
            console.error(err);
            throw err;
        } finally {
            setIsSaving(false);
        }
    }, [selectedFile, updateFileContent]);

    const handleCloseEditor = useCallback(() => {
        setSelectedFile(null);
        setFileContent('');
        setViewOnly(false);
    }, []);

    // Loading
    if (authLoading) {
        return (
            <div className="page-wrapper">
                <Header user={user} isAuthenticated={isAuthenticated} onSignIn={signIn} onSignOut={signOut} />
                <div className="app-loading">
                    <div className="loading-spinner"></div>
                    <span>Loading...</span>
                </div>
                <Footer />
            </div>
        );
    }

    // Show folder lock password modal
    if (folderToLock || folderToUnlock) {
        const folder = folderToLock || folderToUnlock;
        if (!folder) return null; // Should not happen

        return (
            <div className="page-wrapper">
                <Header user={user} isAuthenticated={isAuthenticated} onSignIn={signIn} onSignOut={signOut} showNav={false} />
                <PasswordModal
                    isOpen={true}
                    isSetup={!!folderToLock}
                    folderName={folder.name}
                    onSubmit={handleFolderPasswordSubmit}
                    onSkip={() => { setFolderToLock(null); setFolderToUnlock(null); setPasswordError(''); }}
                    error={passwordError}
                    isLoading={isUnlocking}
                />
                <Footer />
            </div>
        );
    }

    // Common App Component Logic
    const renderApp = (offline = false) => {
        const breadcrumbsWithFile = selectedFile
            ? [...folderPath, { id: selectedFile.id, name: selectedFile.name, isFile: true }]
            : folderPath;

        return (
            <div className="app-container">
                {/* Sidebar removed - full width layout */}

                {/* Main Content Area */}
                <div className="main-content">
                    {/* Navbar */}
                    <Navbar
                        user={user}
                        isAuthenticated={isAuthenticated}
                        breadcrumbs={selectedFile ? breadcrumbsWithFile : folderPath}
                        onNavigate={(index) => {
                            if (index < folderPath.length) {
                                handleCloseEditor();
                                handleNavigate(index);
                            }
                        }}
                        onNewFolder={() => setShowCreateModal('folder')}
                        onNewFile={() => setShowCreateModal('file')}
                        onDailyNote={handleDailyNote}
                        onSignIn={signIn}
                        onSignOut={signOut}
                        onSearch={setSearchQuery}
                        isLoading={driveLoading}
                        isSyncing={isSyncing}
                        onLogoClick={() => {
                            navigate('/');
                            setSelectedFile(null);
                            setFileContent('');
                            setViewOnly(false);
                            setSearchQuery('');
                            navigateToPath(-1);
                        }}
                    // Add onMenuClick for mobile drawer toggle (need to update Navbar props later)
                    />

                    {/* Content */}
                    <main className="page-content app-view">
                        {!isAuthenticated && !(folderToLock || folderToUnlock) && (
                            <div className="offline-notification">
                                <span>Working offline — Data saved locally. Sign in to sync with Google Drive.</span>
                            </div>
                        )}

                        {error && (
                            <div className="error-banner">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <span>{error}</span>
                            </div>
                        )}

                        {isSyncing && !offline && (
                            <div className="sync-banner">
                                <div className="sync-spinner"></div>
                                <span>Syncing local data to Google Drive...</span>
                            </div>
                        )}

                        {selectedFile ? (
                            viewOnly && isMarkdownFile(selectedFile.name) ? (
                                <MarkdownViewer
                                    file={selectedFile}
                                    content={fileContent}
                                    onBack={handleCloseEditor}
                                />
                            ) : (
                                <NoteEditor
                                    file={selectedFile}
                                    content={fileContent}
                                    onContentChange={handleContentChange}
                                    onSave={handleSave}
                                    onBack={handleCloseEditor}
                                    isLoading={isLoadingFile}
                                    isSaving={isSaving}
                                    viewOnly={false}
                                />
                            )
                        ) : (
                            <FileGrid
                                items={items}
                                searchQuery={searchQuery}
                                isLoading={driveLoading}
                                onItemClick={(item) => {
                                    handleItemClick(item);
                                    // For desktop, maybe just select? For now handleItemClick logic determines.
                                }}
                                onItemDoubleClick={handleFolderDoubleClick}
                                onItemEdit={handleItemEdit}
                                onItemView={handleItemView}
                                onRename={handleRename}
                                onDelete={handleDelete}
                                onMoveItem={moveItem}
                                onTogglePin={togglePin}
                                onLockFolder={handleLockFolder}
                                onUnlockFolder={handleUnlockFolder}
                            />
                        )}
                    </main>

                    {/* Footer (Maybe hidden in app view or sticky bottom?) - Keeping for now */}
                    <Footer />
                </div>

                <CreateItemModal
                    isOpen={showCreateModal !== null}
                    onClose={() => setShowCreateModal(null)}
                    type={showCreateModal || 'folder'}
                    onSubmit={showCreateModal === 'folder' ? handleCreateFolder : handleCreateFile}
                />
            </div>
        );
    };

    // Logged in users: Show file grid directly
    if (isAuthenticated) {
        return renderApp(false);
    }

    // Logged out: Home page or App (if clicked Get Started)
    if (showApp) {
        return renderApp(true);
    }

    // Home page (landing) - has its own header and footer
    return <HomePage onGetStarted={handleGetStarted} onSignIn={signIn} />;
}

function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <AppContent />
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;
