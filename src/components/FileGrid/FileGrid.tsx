import { useState, useMemo, MouseEvent } from 'react';
import { useDragAndDrop } from '../../hooks/useDragAndDrop';
import cryptoService from '../../services/cryptoService';
import './FileGrid.css';
import { FileIcon } from '../Icons/FileIcon';
import type { FileGridProps, DriveItem } from '../../types';

interface ContextMenuState {
    x: number;
    y: number;
    item: DriveItem;
}

/**
 * FileGrid Component - With Edit/View buttons, Drag-Drop support, and Folder Locking
 * Handles displaying files and folders in a grid layout
 */
export function FileGrid({
    items = [],
    searchQuery = '',
    isLoading,
    onItemClick,
    onItemDoubleClick,
    onItemEdit,
    onItemView,
    onRename,
    onDelete,
    onMoveItem,
    onLockFolder,
    onUnlockFolder,
    onTogglePin,
}: FileGridProps) {
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // Drag and drop functionality
    const {
        dropTargetId,
        draggedItem,
        handleDragStart,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        handleDragEnd,
    } = useDragAndDrop({ onMove: async (itemId, targetId) => onMoveItem?.(itemId, targetId) });

    // Filter and sort items - folders first, then files
    const filteredItems = useMemo(() => {
        let result = items;

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = items.filter(item => item.name.toLowerCase().includes(query));
        }

        // Sort: folders first, then files, each group alphabetically
        return result.sort((a, b) => {
            if (a.isFolder && !b.isFolder) return -1;
            if (!a.isFolder && b.isFolder) return 1;
            return a.name.localeCompare(b.name);
        });
    }, [items, searchQuery]);

    const handleContextMenu = (e: MouseEvent, item: DriveItem) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, item });
        setSelectedId(item.id);
    };

    const closeContextMenu = () => setContextMenu(null);

    const handleRenameClick = () => {
        if (contextMenu?.item) {
            const currentName = contextMenu.item.name.replace(/\.(txt|md)$/, '');
            const newName = prompt('Enter new name:', currentName);
            if (newName?.trim()) {
                const ext = contextMenu.item.name.endsWith('.md') ? '.md' : '.txt';
                const finalName = contextMenu.item.isFolder ? newName : `${newName}${ext}`;
                onRename?.(contextMenu.item.id, finalName);
            }
        }
        closeContextMenu();
    };

    const handleDeleteClick = () => {
        if (contextMenu?.item && confirm(`Delete "${contextMenu.item.name}"?`)) {
            onDelete?.(contextMenu.item.id);
        }
        closeContextMenu();
    };

    const handleLockClick = () => {
        if (contextMenu?.item?.isFolder) {
            onLockFolder?.(contextMenu.item.id);
        }
        closeContextMenu();
    };

    const handleUnlockClick = () => {
        // Unlock logic typically handled by clicking the folder itself, but context menu option could exist
        // The original code passed (item, true), implying 'remove lock'
        // Since prop definition might differ, checking original intent:
        // onUnlockFolder?.(contextMenu.item, true);
        if (contextMenu?.item?.isFolder) {
            onUnlockFolder?.(contextMenu.item.id);
        }
        closeContextMenu();
    };

    const handlePinClick = () => {
        if (contextMenu?.item) {
            onTogglePin?.(contextMenu.item.id);
        }
        closeContextMenu();
    };


    const handleClick = (item: DriveItem) => {
        setSelectedId(item.id);
        onItemClick?.(item);
    };

    const handleGridClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (contextMenu && !target.closest('.context-menu')) {
            closeContextMenu();
        }
    };

    if (isLoading && items.length === 0) {
        return (
            <div className="grid-loading">
                <div className="loader"></div>
                <span>Loading...</span>
            </div>
        );
    }

    if (filteredItems.length === 0) {
        return (
            <div className="grid-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <p>{searchQuery ? 'No results found' : 'Empty folder'}</p>
                <span>{searchQuery ? 'Try a different search term' : 'Create a folder or note to get started'}</span>
            </div>
        );
    }

    return (
        <div className="grid-container" onClick={handleGridClick}>
            <div className="file-grid">
                {filteredItems.map((item) => (
                    <div
                        key={item.id}
                        className={`grid-item ${item.isFolder ? 'folder' : 'file'} 
                            ${selectedId === item.id ? 'selected' : ''} 
                            ${draggedItem?.id === item.id ? 'dragging' : ''}
                            ${dropTargetId === item.id && item.isFolder ? 'drop-target' : ''}`}
                        onClick={() => handleClick(item)}
                        onDoubleClick={() => onItemDoubleClick?.(item)}
                        onContextMenu={(e) => handleContextMenu(e, item)}
                        draggable={!item.isFolder}
                        onDragStart={(e) => handleDragStart(e, item)}
                        onDragOver={(e) => handleDragOver(e, item.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => item.isFolder && handleDrop(e, item)}
                        onDragEnd={handleDragEnd}
                    >
                        <div className="item-icon">
                            <FileIcon
                                isFolder={item.isFolder}
                                name={item.name}
                                id={item.id}
                                isPinned={item.isPinned}
                            />
                            {/* Pin badge for files handled inside component or here if separate */}
                            {!item.isFolder && item.isPinned && (
                                <div className="pin-badge">
                                    <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12" style={{ color: '#3b82f6' }}>
                                        <path d="M16 12V6a4 4 0 00-8 0v6l-2 2v1h5v6h2v-6h5v-1l-2-2z" />
                                    </svg>
                                </div>
                            )}
                        </div>
                        <span className="item-name" title={item.name}>{item.name}</span>

                        {/* Edit/View buttons for files */}
                        {!item.isFolder && (
                            <div className="item-actions">
                                <button
                                    className="action-btn edit"
                                    onClick={(e) => { e.stopPropagation(); onItemEdit?.(item); }}
                                    title="Edit"
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                </button>
                                <button
                                    className="action-btn view"
                                    onClick={(e) => { e.stopPropagation(); onItemView?.(item); }}
                                    title="View"
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {contextMenu && (
                <div className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }}>
                    {!contextMenu.item.isFolder && (
                        <button className="context-menu-item" onClick={() => { onItemEdit?.(contextMenu.item); closeContextMenu(); }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                        </button>
                    )}

                    <button className="context-menu-item" onClick={handleRenameClick}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h10" />
                        </svg>
                        Rename
                    </button>

                    {!contextMenu.item.isFolder && (
                        <>
                            <div className="menu-divider" />
                            <button className="context-menu-item" onClick={handlePinClick}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                </svg>
                                {contextMenu.item.isPinned ? 'Unpin' : 'Pin to Top'}
                            </button>
                        </>
                    )}


                    {/* Lock option for unlocked folders only */}
                    {contextMenu.item?.isFolder && !cryptoService.isLockedFolder(contextMenu.item.id) && (
                        <button className="context-menu-item" onClick={handleLockClick}>
                            <span style={{ fontSize: '14px' }}>🔒</span>
                            Lock Folder
                        </button>
                    )}

                    <button className="context-menu-item danger" onClick={handleDeleteClick}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                    </button>
                </div>
            )}
        </div>
    );
}

export default FileGrid;
