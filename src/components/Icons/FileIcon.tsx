import React from 'react';
import cryptoService from '../../services/cryptoService';
import { isMarkdownFile } from '../../utils/fileUtils';

interface FileIconProps {
    isFolder: boolean;
    name: string;
    id: string;
    isPinned?: boolean;
}

export const FileIcon: React.FC<FileIconProps> = ({ isFolder, name, id, isPinned }) => {
    if (isFolder) {
        return (
            <>
                <svg viewBox="0 0 24 24" fill="none" stroke="none">
                    <path d="M19.5 21a2.5 2.5 0 002.5-2.5v-10c0-1.38-1.12-2.5-2.5-2.5h-5.83l-1.33-2H4a2 2 0 00-2 2v12.5a2.5 2.5 0 002.5 2.5h15z" fill="#FCD34D" />
                    <path d="M2.5 8h19c.83 0 1.5.67 1.5 1.5v9c0 1.38-1.12 2.5-2.5 2.5H4a2.5 2.5 0 01-2.5-2.5V9.5c0-.83.67-1.5 1.5-1.5z" fill="#F59E0B" />
                </svg>
                {cryptoService.isLockedFolder(id) && (
                    <div className="lock-badge">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="12" height="12" style={{ color: '#ef4444' }}>
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0110 0v4" />
                        </svg>
                    </div>
                )}
                {isPinned && (
                    <div className={`pin-badge ${cryptoService.isLockedFolder(id) ? 'offset' : ''}`}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12" style={{ color: '#3b82f6' }}>
                            <path d="M16 12V6a4 4 0 00-8 0v6l-2 2v1h5v6h2v-6h5v-1l-2-2z" />
                        </svg>
                    </div>
                )}
            </>
        );
    }

    // File Icons
    if (isMarkdownFile(name)) {
        return (
            <svg viewBox="0 0 24 24" fill="none">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" fill="#E5E7EB" />
                <path d="M14 2v6h6" fill="#D1D5DB" />
                <path d="M16 11.5l1.5 1.5-1.5 1.5" stroke="#4B5563" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M8 11.5l-1.5 1.5 1.5 1.5" stroke="#4B5563" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 11v6" stroke="#4B5563" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        );
    }

    // Default Note Icon
    return (
        <svg viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" fill="#F3F4F6" />
            <path d="M14 2v6h6" fill="#D1D5DB" />
            <path d="M8 12h8" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" />
            <path d="M8 16h8" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
};
