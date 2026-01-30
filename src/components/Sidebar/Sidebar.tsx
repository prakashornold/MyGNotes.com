import { useState, useRef, useEffect, MouseEvent } from 'react';
import './Sidebar.css';
import { Logo } from '../Logo/Logo';
import type { SidebarProps, DriveItem } from '../../types';

export function Sidebar({
    items,
    folderPath,
    currentFolderId,
    isLoading,
    selectedItem,
    onSelectItem,
    onNavigateToFolder,
    onNavigateUp,
    onNavigateToPath,
    onCreateFolder,
    onCreateFile,
    onRename,
    onDelete,
    user,
    onSignOut,
    isOpen = true,
    onClose,
    isMobile = false,
}: SidebarProps) {
    const [collapsed, setCollapsed] = useState(false);
    const [showNewMenu, setShowNewMenu] = useState<boolean>(false);
    const [showContextMenu, setShowContextMenu] = useState<string | null>(null);
    const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
    const [renameItem, setRenameItem] = useState<DriveItem | null>(null);
    const [newItemName, setNewItemName] = useState<string>('');
    const [isCreatingNew, setIsCreatingNew] = useState<'folder' | 'file' | null>(null);
    const newMenuRef = useRef<HTMLDivElement>(null);
    const contextMenuRef = useRef<HTMLDivElement>(null);
    const renameInputRef = useRef<HTMLInputElement>(null);
    const newItemInputRef = useRef<HTMLInputElement>(null);

    // Close menus when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: globalThis.MouseEvent) => {
            if (newMenuRef.current && !newMenuRef.current.contains(e.target as Node)) {
                setShowNewMenu(false);
            }
            if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
                setShowContextMenu(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus rename input
    useEffect(() => {
        if (renameItem && renameInputRef.current) {
            renameInputRef.current.focus();
            renameInputRef.current.select();
        }
    }, [renameItem]);

    // Focus new item input
    useEffect(() => {
        if (isCreatingNew && newItemInputRef.current) {
            newItemInputRef.current.focus();
        }
    }, [isCreatingNew]);

    const handleContextMenu = (e: MouseEvent, item: DriveItem) => {
        e.preventDefault();
        setContextMenuPosition({ x: e.clientX, y: e.clientY });
        setShowContextMenu(item.id);
    };

    const handleRename = (item: DriveItem) => {
        setRenameItem(item);
        setNewItemName(item.name.replace('.txt', ''));
        setShowContextMenu(null);
    };

    const submitRename = async () => {
        if (renameItem && newItemName.trim()) {
            const name = renameItem.isFolder ? newItemName : `${newItemName}.txt`;
            await onRename(renameItem.id, name);
        }
        setRenameItem(null);
        setNewItemName('');
    };

    const handleDelete = async (item: DriveItem) => {
        setShowContextMenu(null);
        if (confirm(`Delete "${item.name}"?`)) {
            await onDelete(item.id);
        }
    };

    const handleNewFolder = () => {
        setIsCreatingNew('folder');
        setNewItemName('');
        setShowNewMenu(false);
    };

    const handleNewFile = () => {
        setIsCreatingNew('file');
        setNewItemName('');
        setShowNewMenu(false);
    };

    const submitNewItem = async () => {
        if (newItemName.trim() && isCreatingNew) {
            try {
                if (isCreatingNew === 'folder') {
                    await onCreateFolder(newItemName);
                } else {
                    await onCreateFile(newItemName);
                }
            } catch (error) {
                console.error('Failed to create item:', error);
            }
        }
        setIsCreatingNew(null);
        setNewItemName('');
    };

    const handleMobileItemClick = (item: DriveItem) => {
        if (item.isFolder) {
            onNavigateToFolder(item.id, item.name);
        } else {
            onSelectItem(item);
        }
        if (isMobile && onClose) onClose();
    };

    // Helper to safely get the item for context menu
    const getContextItem = () => items.find(i => i.id === showContextMenu);

    const sidebarClass = `sidebar ${isMobile ? 'mobile' : 'desktop'} ${isOpen ? 'open' : 'closed'} ${collapsed && !isMobile ? 'collapsed' : ''}`;

    const toggleCollapse = () => {
        setCollapsed(!collapsed);
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isMobile && isOpen && (
                <div className="sidebar-overlay" onClick={onClose} />
            )}

            <aside className={sidebarClass} onClick={(e) => e.stopPropagation()}>
                {/* Header: Logo & Collapse Action */}
                <div className="sidebar-header" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-primary)', marginBottom: '16px', minHeight: '64px' }}>
                    {/* Brand / Logo */}
                    <div className="sidebar-brand" style={{ opacity: collapsed ? 0 : 1, transition: 'opacity 0.2s', width: collapsed ? 0 : 'auto', overflow: 'hidden' }}>
                        {!collapsed && <Logo size={24} />}
                    </div>

                    <div className="sidebar-header-actions" style={{ marginLeft: collapsed ? 'auto' : 0, marginRight: collapsed ? 'auto' : 0 }}>
                        {!isMobile && (
                            <button className="collapse-btn" onClick={toggleCollapse} title={collapsed ? "Expand" : "Collapse"}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                                    {collapsed ? (
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                                    ) : (
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                                    )}
                                </svg>
                            </button>
                        )}
                        {isMobile && (
                            <button className="close-sidebar-btn" onClick={onClose}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>

                {/* New Button */}
                <div className="new-button-container">
                    <button
                        className={`new-button ${collapsed ? 'icon-only' : ''}`}
                        onClick={() => !collapsed && setShowNewMenu(!showNewMenu)}
                        title="New Item"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        {!collapsed && <span>New</span>}
                    </button>

                    {showNewMenu && !collapsed && (
                        <div className="new-menu" ref={newMenuRef}>
                            <button className="new-menu-item" onClick={handleNewFolder}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                </svg>
                                New Folder
                            </button>
                            <button className="new-menu-item" onClick={handleNewFile}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                New Note
                            </button>
                        </div>
                    )}
                </div>

                {/* Breadcrumbs - Hide when collapsed */}
                {!collapsed && (
                    <div className="breadcrumb">
                        <button className="breadcrumb-btn" onClick={() => onNavigateToPath(-1)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                        </button>
                        {folderPath.map((folder, index) => (
                            <div key={folder.id} className="breadcrumb-item">
                                <span className="breadcrumb-separator">/</span>
                                <button className="breadcrumb-btn" onClick={() => onNavigateToPath(index)}>
                                    {folder.name}
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* New Item Input */}
                {isCreatingNew && !collapsed && (
                    <div className="new-item-input-container" style={{ padding: '0 16px' }}>
                        <div className="new-item-input-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', background: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border-primary)' }}>
                            <div className="item-icon">
                                {isCreatingNew === 'folder' ? (
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                    </svg>
                                ) : (
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                )}
                            </div>
                            <input
                                ref={newItemInputRef}
                                type="text"
                                style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', width: '100%', fontSize: '0.875rem' }}
                                value={newItemName}
                                onChange={(e) => setNewItemName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') submitNewItem();
                                    if (e.key === 'Escape') {
                                        setIsCreatingNew(null);
                                        setNewItemName('');
                                    }
                                }}
                                onBlur={submitNewItem}
                                placeholder={isCreatingNew === 'folder' ? 'Folder name' : 'Note name'}
                            />
                        </div>
                    </div>
                )}

                {/* Items List */}
                <div className="items-list">
                    {isLoading && items.length === 0 ? (
                        <div className="loading-state" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                            <span>Loading...</span>
                        </div>
                    ) : items.length === 0 ? (
                        <div className="empty-state" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            <p style={{ fontSize: '0.875rem' }}>Empty folder</p>
                        </div>
                    ) : (
                        items.map((item) => (
                            <div
                                key={item.id}
                                className={`file-item ${item.isFolder ? 'folder' : 'file'} ${selectedItem?.id === item.id ? 'selected' : ''}`}
                                onClick={() => handleMobileItemClick(item)}
                                onContextMenu={(e) => handleContextMenu(e, item)}
                                title={collapsed ? item.name : undefined}
                            >
                                <div className="item-icon">
                                    {item.isFolder ? (
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                        </svg>
                                    ) : item.name.endsWith('.md') ? (
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
                                        </svg>
                                    ) : (
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    )}
                                </div>

                                {renameItem?.id === item.id && !collapsed ? (
                                    <input
                                        ref={renameInputRef}
                                        type="text"
                                        className="rename-input"
                                        style={{ background: 'var(--bg-primary)', border: '1px solid var(--accent-primary)', borderRadius: '4px', padding: '2px 6px', color: 'var(--text-primary)', width: '100%' }}
                                        value={newItemName}
                                        onChange={(e) => setNewItemName(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') submitRename();
                                            if (e.key === 'Escape') {
                                                setRenameItem(null);
                                                setNewItemName('');
                                            }
                                        }}
                                        onBlur={submitRename}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                ) : (
                                    <span className="item-name">{item.name}</span>
                                )}

                                {item.isFolder && !collapsed && (
                                    <svg className="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                    </svg>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Footer Actions (User & Sign Out) */}
                <div className="sidebar-footer" style={{ marginTop: 'auto', padding: '16px', borderTop: '1px solid var(--border-primary)' }}>
                    {!collapsed && (
                        <div className="user-profile" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            {user?.picture && <img src={user.picture} alt="" className="user-avatar" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />}
                            <div className="user-details" style={{ overflow: 'hidden' }}>
                                <div className="user-name" style={{ fontWeight: 500, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', fontSize: '0.875rem' }}>{user?.name}</div>
                                <div className="user-email" style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{user?.email}</div>
                            </div>
                        </div>
                    )}
                    <button className="signout-btn-footer" onClick={onSignOut} title="Sign out" style={{ width: '100%', justifyContent: collapsed ? 'center' : 'flex-start' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        {!collapsed && <span className="signout-text">Sign Out</span>}
                    </button>
                </div>

                {/* Context Menu */}
                {showContextMenu && (
                    <div
                        ref={contextMenuRef}
                        className="context-menu"
                        style={{ left: contextMenuPosition.x, top: contextMenuPosition.y }}
                    >
                        {!getContextItem()?.isFolder && (
                            <button
                                className="context-menu-item"
                                onClick={() => {
                                    const item = getContextItem();
                                    if (item) {
                                        onSelectItem(item);
                                        setShowContextMenu(null);
                                    }
                                }}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                <span>Edit</span>
                            </button>
                        )}
                        <button
                            className="context-menu-item"
                            onClick={() => {
                                const item = getContextItem();
                                if (item) handleRename(item);
                            }}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h10" />
                            </svg>
                            <span>Rename</span>
                        </button>
                        <button
                            className="context-menu-item danger"
                            onClick={() => {
                                const item = getContextItem();
                                if (item) handleDelete(item);
                            }}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span>Delete</span>
                        </button>
                    </div>
                )}
            </aside>
        </>
    );
}

export default Sidebar;
