import { useState, useCallback, DragEvent } from 'react';
import type { UseDragAndDropReturn, DriveItem } from '../types';

interface DragState {
    draggedId: string | null;
    dropTargetId: string | null;
    isDragging: boolean;
    draggedItem: DriveItem | null;
}

interface UseDragAndDropProps {
    onMove: (itemId: string, targetFolderId: string) => Promise<void>;
}

/**
 * useDragAndDrop - Custom hook for drag and drop functionality
 * Follows Single Responsibility Principle - only handles drag/drop logic
 */
export function useDragAndDrop({ onMove }: UseDragAndDropProps): UseDragAndDropReturn {
    const [dragState, setDragState] = useState<DragState>({
        draggedId: null,
        dropTargetId: null,
        isDragging: false,
        draggedItem: null
    });

    /**
     * Handle drag start event
     */
    const handleDragStart = useCallback((e: DragEvent, item: DriveItem) => {
        // Don't allow dragging folders (only files can be moved)
        if (item.isFolder) {
            e.preventDefault();
            return;
        }

        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', item.id);

        setDragState({
            draggedId: item.id,
            dropTargetId: null,
            isDragging: true,
            draggedItem: item
        });
    }, []);

    /**
     * Handle drag over event - determines if drop is allowed
     */
    const handleDragOver = useCallback((e: DragEvent, targetId: string) => {
        e.preventDefault();

        // Only allow dropping if we are dragging something
        if (!dragState.draggedId || targetId === dragState.draggedId) {
            e.dataTransfer.dropEffect = 'none';
            return;
        }

        e.dataTransfer.dropEffect = 'move';

        if (dragState.dropTargetId !== targetId) {
            setDragState(prev => ({
                ...prev,
                dropTargetId: targetId,
            }));
        }
    }, [dragState.draggedId, dragState.dropTargetId]);

    /**
     * Handle drag leave event
     */
    const handleDragLeave = useCallback(() => {
        setDragState(prev => ({
            ...prev,
            dropTargetId: null,
        }));
    }, []);

    /**
     * Handle drop event
     */
    const handleDrop = useCallback(async (e: DragEvent, targetFolder: DriveItem) => {
        e.preventDefault();

        const itemId = e.dataTransfer.getData('text/plain');
        const targetFolderId = targetFolder.id;

        // Check conditions:
        // 1. We have an item ID and target ID
        // 2. We're not dropping onto itself
        // 3. Target is actually a folder
        if (itemId && targetFolderId && itemId !== targetFolderId && targetFolder.isFolder) {
            try {
                // Call the move callback provided by parent
                await onMove(itemId, targetFolderId);
            } catch (error) {
                console.error('Failed to move item:', error);
            }
        }

        // Reset state
        setDragState({
            draggedId: null,
            dropTargetId: null,
            isDragging: false,
            draggedItem: null
        });
    }, [onMove]);

    /**
     * Handle drag end event (cleanup)
     */
    const handleDragEnd = useCallback(() => {
        setDragState({
            draggedId: null,
            dropTargetId: null,
            isDragging: false,
            draggedItem: null
        });
    }, []);

    return {
        isDragging: dragState.isDragging,
        draggedItem: dragState.draggedItem,
        dropTargetId: dragState.dropTargetId,
        handleDragStart,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        handleDragEnd,
    };
}

export default useDragAndDrop;
