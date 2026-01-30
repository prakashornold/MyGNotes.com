import { useState, useRef, MouseEvent, KeyboardEvent, FormEvent } from 'react';
import './Modal.css';
import type { ModalProps, CreateItemModalProps } from '../../types';

/**
 * Modal Component
 */
export function Modal({ isOpen, onClose, title, children }: ModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);

    const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
        if (e.target === modalRef.current) onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" ref={modalRef} onClick={handleBackdropClick}>
            <div className="modal">
                <div className="modal-header">
                    <h3>{title}</h3>
                    <button className="modal-close" onClick={onClose}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="modal-body">{children}</div>
            </div>
        </div>
    );
}

/**
 * CreateItemModal - For creating folder/file with type selector
 */
export function CreateItemModal({ isOpen, onClose, type = 'folder', onSubmit }: CreateItemModalProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [fileType, setFileType] = useState<'txt' | 'md'>('txt');

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        const name = inputRef.current?.value.trim();
        if (name) {
            const finalName = type === 'folder' ? name : `${name}.${fileType}`;
            onSubmit(finalName);
            if (inputRef.current) inputRef.current.value = '';
            onClose();
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={type === 'folder' ? 'New Folder' : 'New Note'}>
            <form onSubmit={handleSubmit} className="modal-form">
                <input
                    ref={inputRef}
                    type="text"
                    className="modal-input"
                    placeholder={type === 'folder' ? 'Folder name' : 'Note name'}
                    autoFocus
                />

                {type !== 'folder' && (
                    <div className="file-type-selector">
                        <label>File Type:</label>
                        <div className="type-options">
                            <button
                                type="button"
                                className={`type-option ${fileType === 'txt' ? 'active' : ''}`}
                                onClick={() => setFileType('txt')}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h12" />
                                </svg>
                                Plain Text (.txt)
                            </button>
                            <button
                                type="button"
                                className={`type-option ${fileType === 'md' ? 'active' : ''}`}
                                onClick={() => setFileType('md')}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                </svg>
                                Markdown (.md)
                            </button>
                        </div>
                    </div>
                )}

                <div className="modal-actions">
                    <button type="button" className="modal-btn" onClick={onClose}>Cancel</button>
                    <button type="submit" className="modal-btn primary">Create</button>
                </div>
            </form>
        </Modal>
    );
}

export default Modal;
