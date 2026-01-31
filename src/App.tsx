import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { useGoogleDrive } from './hooks/useGoogleDrive';
import { Header } from './components/Layout/Header';
import { Footer } from './components/Layout/Footer';
import { HomePage } from './components/HomePage/HomePage';
import { Navbar } from './components/Navbar/Navbar';
import { FileGrid } from './components/FileGrid/FileGrid';
import { NoteEditor } from './components/Editor/NoteEditor';
import { MarkdownViewer } from './components/Viewer/MarkdownViewer';
import { isMarkdownFile } from './utils/fileUtils';
import { CreateItemModal } from './components/Modal/Modal';
import cryptoService from './services/cryptoService';
import './App.css';
import type { DriveItem } from './types';

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
    const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
        const savedMode = localStorage.getItem('viewMode') as 'grid' | 'list';
        if (savedMode) return savedMode;

        // Default to list on mobile, grid on desktop
        return window.innerWidth <= 768 ? 'list' : 'grid';
    });

    const handleViewModeToggle = () => {
        const newMode = viewMode === 'grid' ? 'list' : 'grid';
        setViewMode(newMode);
        localStorage.setItem('viewMode', newMode);
    };

    // Sync local data when user logs in
    useEffect(() => {
        if (isAuthenticated && hasLocalData) {
            syncToGoogleDrive();
        }
    }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

    // Initialize crypto service on mount
    useEffect(() => {
        cryptoService.initializeMasterKey().catch(() => {
            // Silently fail - encryption will be disabled
        });
    }, []);

    const loadFileContent = async (fileId: string, parentId: string | null = null) => {
        setIsLoadingFile(true);
        try {
            const content = await getFileContent(fileId, parentId);
            setFileContent(content);
        } finally {
            setIsLoadingFile(false);
        }
    };

    useEffect(() => {
        if (selectedFile && !selectedFile.isFolder) {
            loadFileContent(selectedFile.id, selectedFile.parentId);
        }
    }, [selectedFile?.id]);

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
    }, [isInitialized, location.pathname]);

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

    const handleToggleEncryption = async (itemId: string, isFolder: boolean) => {
        const currentState = cryptoService.isItemEncrypted(itemId);
        cryptoService.toggleItemEncryption(itemId, !currentState);

        // Handle file encryption/decryption
        if (!isFolder) {
            const file = items.find(i => i.id === itemId);
            if (file) {
                try {
                    const content = await getFileContent(itemId, file.parentId);

                    if (!currentState) {
                        // Enabling encryption - encrypt if not already encrypted
                        if (content && !cryptoService.isEncrypted(content)) {
                            await updateFileContent(itemId, content, file.parentId);
                        }
                    } else {
                        // Disabling encryption - decrypt and save as plain text
                        if (content && cryptoService.isEncrypted(content)) {
                            const decrypted = await cryptoService.decryptData(content);
                            await updateFileContent(itemId, decrypted, file.parentId);
                        }
                    }
                } catch (err) {
                    // Silent fail
                }
            }
        }
    };

    const handleFolderDoubleClick = useCallback((item: DriveItem) => {
        if (item.isFolder) {
            navigateToFolder(item.id, item.name);
        } else {
            setSelectedFile(item);
            setViewOnly(true);
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
        try { await createFolder(name); } catch (err) { }
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
            return null;
        }
    }, [createFile, loadFileContent]);

    const handleDailyNote = useCallback(async () => {
        try {
            const todayNote = await createOrOpenDailyNote();
            if (!todayNote) {
                return;
            }

            await loadFileContent(todayNote.id, todayNote.parentId);
            setSelectedFile(todayNote);
            setViewOnly(false);
        } catch (err) {
        }
    }, [createOrOpenDailyNote, loadFileContent]);

    const handleRename = useCallback(async (itemId: string, newName: string) => {
        try { await renameItem(itemId, newName); } catch (err) { }
    }, [renameItem]);

    const handleDelete = useCallback(async (itemId: string) => {
        try {
            await deleteItem(itemId);
            if (selectedFile?.id === itemId) {
                setSelectedFile(null);
                setFileContent('');
            }
        } catch (err) { }
    }, [deleteItem, selectedFile]);


    const handleContentChange = useCallback((newContent: string) => setFileContent(newContent), []);

    const handleSave = useCallback(async (content: string) => {
        if (!selectedFile) return;
        setIsSaving(true);
        try {
            await updateFileContent(selectedFile.id, content, selectedFile.parentId);
        } catch (err) {
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
                        viewMode={viewMode}
                        onViewModeChange={handleViewModeToggle}
                        onDailyNote={() => createOrOpenDailyNote()}
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
                        {!isAuthenticated && (
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
                                viewMode={viewMode}
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
                                onToggleEncryption={handleToggleEncryption}
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
