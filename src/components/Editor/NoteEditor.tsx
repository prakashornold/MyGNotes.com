import { useState, useEffect, useCallback, useRef, useMemo, ChangeEvent, KeyboardEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import './NoteEditor.css';
import type { NoteEditorProps } from '../../types';

interface Heading {
    level: number;
    text: string;
    id: string;
}

/**
 * Extract headings from markdown for TOC
 */
function extractHeadings(markdown: string): Heading[] {
    // First, remove all code blocks (both ``` and indented code blocks)
    // This prevents headings inside code blocks from being extracted
    let cleanedMarkdown = markdown;

    const headings: Heading[] = [];
    let headingIndex = 0;

    const lines = markdown.split(/\r?\n/);
    let inCodeBlock = false;

    for (const line of lines) {
        // Check if line contains ``` (handles all cases: at start, with spaces, with language)
        if (line.includes('```')) {
            inCodeBlock = !inCodeBlock;
            continue;
        }

        // Skip lines inside code blocks
        if (inCodeBlock) continue;

        // Check for headings
        const match = line.match(/^(#{1,6})\s+(.+)$/);
        if (match) {
            const level = match[1].length;
            const text = match[2].trim();

            // Make ID unique by adding index to prevent duplicate keys
            const baseId = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
            const id = baseId ? `${baseId}-${headingIndex}` : `heading-${headingIndex}`;

            headings.push({ level, text, id });
            headingIndex++;
        }
    }

    return headings;
}

/**
 * NoteEditor - With react-markdown for perfect preview
 */
export function NoteEditor({
    file,
    content,
    onContentChange,
    onSave,
    onBack, // onClose maps to onBack
    isLoading,
    isSaving,
    viewOnly = false,
}: NoteEditorProps) {

    const [localContent, setLocalContent] = useState<string>(content || '');
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved');
    const [editorMode, setEditorMode] = useState<'markdown' | 'plaintext'>(() => {
        return file?.name?.endsWith('.md') ? 'markdown' : 'plaintext';
    });
    const [showDropdown, setShowDropdown] = useState<boolean>(false);
    const [showTOC, setShowTOC] = useState<boolean>(true);
    const [showExportMenu, setShowExportMenu] = useState<boolean>(false);
    const [distractionFree, setDistractionFree] = useState<boolean>(false);
    const [showLineNumbers, setShowLineNumbers] = useState<boolean>(false);
    const [wordWrap, setWordWrap] = useState<boolean>(true);
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const editorRef = useRef<HTMLDivElement>(null);

    // Export Functions
    const downloadFile = (content: string, filename: string, type: string) => {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const exportMarkdown = () => {
        downloadFile(localContent, file?.name || 'note.md', 'text/markdown');
        setShowExportMenu(false);
    };

    const exportHTML = () => {
        const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${file?.name || 'Note'}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; color: #333; }
        code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
        pre { background: #f4f4f4; padding: 16px; border-radius: 8px; overflow-x: auto; }
        pre code { background: none; padding: 0; }
        blockquote { border-left: 4px solid #ddd; padding-left: 16px; color: #666; }
        img { max-width: 100%; height: auto; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #f4f4f4; }
    </style>
</head>
<body>
${localContent.split('\n').map(line => {
            // Simple markdown to HTML conversion
            line = line.replace(/^# (.+)/, '<h1>$1</h1>');
            line = line.replace(/^## (.+)/, '<h2>$1</h2>');
            line = line.replace(/^### (.+)/, '<h3>$1</h3>');
            line = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
            line = line.replace(/\*(.+?)\*/g, '<em>$1</em>');
            line = line.replace(/`(.+?)`/g, '<code>$1</code>');
            return line;
        }).join('\n')}
</body>
</html>`;
        downloadFile(htmlContent, (file?.name || 'note').replace('.md', '.html'), 'text/html');
        setShowExportMenu(false);
    };

    const exportPlainText = () => {
        downloadFile(localContent, (file?.name || 'note').replace('.md', '.txt'), 'text/plain');
        setShowExportMenu(false);
    };

    // Extract headings for TOC
    const headings = useMemo(() => {
        if (viewOnly && editorMode === 'markdown') {
            return extractHeadings(localContent);
        }
        return [];
    }, [localContent, editorMode, viewOnly]);

    useEffect(() => {
        setLocalContent(content || '');
        setSaveStatus('saved');
        setEditorMode(file?.name?.endsWith('.md') ? 'markdown' : 'plaintext');
    }, [content, file?.id, file?.name]);

    const debouncedSave = useCallback((newContent: string) => {
        if (viewOnly) return;
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        setSaveStatus('unsaved');
        saveTimeoutRef.current = setTimeout(async () => {
            setSaveStatus('saving');
            try {
                await onSave(newContent);
                setSaveStatus('saved');
            } catch {
                setSaveStatus('error');
            }
        }, 1500);
    }, [onSave, viewOnly]);

    const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
        if (viewOnly) return;
        const newContent = e.target.value;
        setLocalContent(newContent);
        onContentChange(newContent);
        debouncedSave(newContent);
    };

    useEffect(() => {
        const handleKeyDown = (e: globalThis.KeyboardEvent) => {
            // Save shortcut
            if ((e.ctrlKey || e.metaKey) && e.key === 's' && !viewOnly) {
                e.preventDefault();
                if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                setSaveStatus('saving');
                onSave(localContent).then(() => setSaveStatus('saved')).catch(() => setSaveStatus('error'));
            }
            // Bold shortcut
            if ((e.ctrlKey || e.metaKey) && e.key === 'b' && !viewOnly && editorMode === 'markdown') {
                e.preventDefault();
                formatBold();
            }
            // Italic shortcut
            if ((e.ctrlKey || e.metaKey) && e.key === 'i' && !viewOnly && editorMode === 'markdown') {
                e.preventDefault();
                formatItalic();
            }
            // Link shortcut
            if ((e.ctrlKey || e.metaKey) && e.key === 'k' && !viewOnly && editorMode === 'markdown') {
                e.preventDefault();
                formatLink();
            }
            // Distraction-free mode toggle (F11)
            if (e.key === 'F11') {
                e.preventDefault();
                toggleFullscreen();
            }
            // Escape to exit fullscreen or go back
            if (e.key === 'Escape') {
                if (isFullscreen || distractionFree) {
                    exitFullscreen();
                } else if (onBack) {
                    onBack();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [localContent, onSave, onBack, viewOnly, editorMode]);

    useEffect(() => {
        return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
    }, []);

    useEffect(() => {
        if (file && !isLoading && textareaRef.current && !viewOnly) textareaRef.current.focus();
    }, [file, isLoading, viewOnly]);

    const scrollToHeading = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'instant', block: 'start' });
        }
    };

    // Document Statistics
    const wordCount = localContent.trim() ? localContent.trim().split(/\s+/).length : 0;
    const charCount = localContent.length;
    const charCountNoSpaces = localContent.replace(/\s/g, '').length;
    const lineCount = localContent.split('\n').length;
    const paragraphCount = localContent.split(/\n\n+/).filter(p => p.trim()).length;
    const readingTime = Math.ceil(wordCount / 200); // Average reading speed: 200 words/min

    // Cursor Position Tracking
    const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });

    // Line numbers for editor
    const lineNumbers = useMemo(() => {
        return Array.from({ length: lineCount }, (_, i) => i + 1);
    }, [lineCount]);

    const handleTextareaClick = useCallback(() => {
        if (textareaRef.current) {
            const textarea = textareaRef.current;
            const text = textarea.value.substring(0, textarea.selectionStart);
            const lines = text.split('\n');
            const line = lines.length;
            const column = lines[lines.length - 1].length + 1;
            setCursorPosition({ line, column });
        }
    }, []);

    const handleTextareaKeyUp = useCallback(() => {
        handleTextareaClick();
    }, [handleTextareaClick]);

    // Formatting Functions
    const insertFormatting = useCallback((prefix: string, suffix: string = '', placeholder: string = 'text') => {
        if (!textareaRef.current || viewOnly) return;

        const textarea = textareaRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end);
        const textToInsert = selectedText || placeholder;

        const newText =
            textarea.value.substring(0, start) +
            prefix + textToInsert + suffix +
            textarea.value.substring(end);

        setLocalContent(newText);
        onContentChange(newText);
        debouncedSave(newText);

        // Set cursor position after formatting
        setTimeout(() => {
            const newCursorPos = start + prefix.length + (selectedText ? selectedText.length : 0);
            textarea.focus();
            textarea.setSelectionRange(newCursorPos, newCursorPos + (selectedText ? 0 : placeholder.length));
        }, 0);
    }, [viewOnly, onContentChange, debouncedSave]);

    const formatBold = () => insertFormatting('**', '**', 'bold text');
    const formatItalic = () => insertFormatting('*', '*', 'italic text');
    const formatStrikethrough = () => insertFormatting('~~', '~~', 'strikethrough');
    const formatCode = () => insertFormatting('`', '`', 'code');
    const formatH1 = () => insertFormatting('# ', '', 'Heading 1');
    const formatH2 = () => insertFormatting('## ', '', 'Heading 2');
    const formatH3 = () => insertFormatting('### ', '', 'Heading 3');
    const formatBulletList = () => insertFormatting('- ', '', 'List item');
    const formatNumberedList = () => insertFormatting('1. ', '', 'List item');
    const formatCheckbox = () => insertFormatting('- [ ] ', '', 'Task item');
    const formatQuote = () => insertFormatting('> ', '', 'Quote');
    const formatCodeBlock = () => insertFormatting('```\n', '\n```', 'code here');
    const formatLink = () => insertFormatting('[', '](url)', 'link text');
    const formatImage = () => insertFormatting('![', '](image-url)', 'alt text');
    const formatHR = () => insertFormatting('\n---\n', '', '');
    const formatTable = () => insertFormatting('\n| Column 1 | Column 2 |\n|----------|----------|\n| ', ' |  |\n', 'Cell');

    // Fullscreen functionality
    const toggleFullscreen = async () => {
        if (!editorRef.current) return;

        try {
            if (!document.fullscreenElement) {
                await editorRef.current.requestFullscreen();
                setIsFullscreen(true);
                setDistractionFree(true);
            } else {
                await document.exitFullscreen();
                setIsFullscreen(false);
                setDistractionFree(false);
            }
        } catch (error) {
            console.error('Error toggling fullscreen:', error);
            setDistractionFree(!distractionFree);
        }
    };

    const exitFullscreen = async () => {
        try {
            if (document.fullscreenElement) {
                await document.exitFullscreen();
            }
            setIsFullscreen(false);
            setDistractionFree(false);
        } catch (error) {
            console.error('Error exiting fullscreen:', error);
            setDistractionFree(false);
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            if (!document.fullscreenElement) {
                setIsFullscreen(false);
                setDistractionFree(false);
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    if (!file) return null;

    // Custom renderer to add IDs to headings
    const components: any = {
        h1: ({ children, ...props }: any) => <h1 id={String(children).toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')} {...props}>{children}</h1>,
        h2: ({ children, ...props }: any) => <h2 id={String(children).toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')} {...props}>{children}</h2>,
        h3: ({ children, ...props }: any) => <h3 id={String(children).toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')} {...props}>{children}</h3>,
        h4: ({ children, ...props }: any) => <h4 id={String(children).toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')} {...props}>{children}</h4>,
        h5: ({ children, ...props }: any) => <h5 id={String(children).toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')} {...props}>{children}</h5>,
        h6: ({ children, ...props }: any) => <h6 id={String(children).toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')} {...props}>{children}</h6>,
        code({ inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
                <SyntaxHighlighter style={oneDark} language={match[1]} PreTag="div" {...props}>
                    {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
            ) : (
                <code className={className} {...props}>{children}</code>
            );
        }
    };

    const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

    // ... existing hooks ...

    return (
        <div ref={editorRef} className={`note-editor ${viewOnly ? 'view-only' : ''} ${viewOnly && headings.length > 0 ? 'with-toc' : ''} ${distractionFree ? 'distraction-free' : ''} ${isFullscreen ? 'fullscreen-mode' : ''}`}>
            <header className="editor-header">
                <div className="editor-header-left">
                    <button className="back-btn" onClick={onBack}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <div className="file-info">
                        <span className="editor-filename">{file.name}</span>
                        {viewOnly && <span className="view-badge">View Only</span>}
                    </div>
                </div>

                {/* Mobile Tabs */}
                {!viewOnly && editorMode === 'markdown' && (
                    <div className="mobile-tabs">
                        <button
                            className={`tab-btn ${activeTab === 'edit' ? 'active' : ''}`}
                            onClick={() => setActiveTab('edit')}
                        >
                            Edit
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
                            onClick={() => setActiveTab('preview')}
                        >
                            Preview
                        </button>
                    </div>
                )}

                <div className="editor-header-right">
                    {/* Desktop Actions */}
                    {!viewOnly && (
                        <>
                            <div className="save-status">
                                {isLoading ? 'Loading...' :
                                    isSaving || saveStatus === 'saving' ? 'Saving...' :
                                        saveStatus === 'unsaved' ? 'Unsaved' :
                                            saveStatus === 'error' ? 'Error' : 'Saved'}
                            </div>

                            <div className="mode-dropdown">
                                <button className="editor-action-btn" onClick={() => setShowDropdown(!showDropdown)}>
                                    <span>{editorMode === 'plaintext' ? 'Plain Text' : 'Markdown'}</span>
                                </button>
                                {showDropdown && (
                                    <div className="dropdown-menu">
                                        <button className={editorMode === 'plaintext' ? 'active' : ''} onClick={() => { setEditorMode('plaintext'); setShowDropdown(false); }}>Plain Text</button>
                                        <button className={editorMode === 'markdown' ? 'active' : ''} onClick={() => { setEditorMode('markdown'); setShowDropdown(false); }}>Markdown</button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* Export Menu */}
                    {editorMode === 'markdown' && (
                        <div className="mode-dropdown">
                            <button className="editor-action-btn" onClick={() => setShowExportMenu(!showExportMenu)} title="Export">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="7 10 12 15 17 10" />
                                    <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                            </button>
                            {showExportMenu && (
                                <div className="dropdown-menu">
                                    <button onClick={exportMarkdown}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                            <polyline points="14 2 14 8 20 8" />
                                        </svg>
                                        Markdown (.md)
                                    </button>
                                    <button onClick={exportHTML}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                            <polyline points="16 18 22 12 16 6" />
                                            <polyline points="8 6 2 12 8 18" />
                                        </svg>
                                        HTML (.html)
                                    </button>
                                    <button onClick={exportPlainText}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                            <polyline points="14 2 14 8 20 8" />
                                            <line x1="16" y1="13" x2="8" y2="13" />
                                            <line x1="16" y1="17" x2="8" y2="17" />
                                            <polyline points="10 9 9 9 8 9" />
                                        </svg>
                                        Plain Text (.txt)
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Fullscreen Mode Toggle */}
                    <button
                        className={`editor-action-btn ${isFullscreen || distractionFree ? 'active' : ''}`}
                        onClick={toggleFullscreen}
                        title="Fullscreen Mode (F11)"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                            {isFullscreen || distractionFree ? (
                                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                            ) : (
                                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                            )}
                        </svg>
                    </button>

                    {/* Line Numbers Toggle */}
                    {!viewOnly && (
                        <button
                            className="editor-action-btn"
                            onClick={() => setShowLineNumbers(!showLineNumbers)}
                            title="Toggle Line Numbers"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                                {showLineNumbers ? (
                                    <>
                                        <line x1="4" y1="6" x2="4" y2="6" strokeWidth="3" />
                                        <line x1="4" y1="12" x2="4" y2="12" strokeWidth="3" />
                                        <line x1="4" y1="18" x2="4" y2="18" strokeWidth="3" />
                                        <line x1="8" y1="6" x2="20" y2="6" />
                                        <line x1="8" y1="12" x2="20" y2="12" />
                                        <line x1="8" y1="18" x2="20" y2="18" />
                                    </>
                                ) : (
                                    <>
                                        <line x1="4" y1="6" x2="20" y2="6" />
                                        <line x1="4" y1="12" x2="20" y2="12" />
                                        <line x1="4" y1="18" x2="20" y2="18" />
                                    </>
                                )}
                            </svg>
                        </button>
                    )}

                    {/* Word Wrap Toggle */}
                    {!viewOnly && (
                        <button
                            className="editor-action-btn"
                            onClick={() => setWordWrap(!wordWrap)}
                            title="Toggle Word Wrap"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                                {wordWrap ? (
                                    <>
                                        <path d="M4 6h12" />
                                        <path d="M4 12h16" />
                                        <path d="M4 18h12" />
                                        <path d="M16 14l4 4-4 4" />
                                    </>
                                ) : (
                                    <>
                                        <line x1="4" y1="6" x2="20" y2="6" />
                                        <line x1="4" y1="12" x2="20" y2="12" />
                                        <line x1="4" y1="18" x2="20" y2="18" />
                                    </>
                                )}
                            </svg>
                        </button>
                    )}
                </div>
            </header>

            {/* Formatting Toolbar */}
            {!viewOnly && editorMode === 'markdown' && (
                <div className="formatting-toolbar">
                    <div className="toolbar-group">
                        <button className="toolbar-btn" onClick={formatBold} title="Bold (Ctrl+B)">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" /><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" /></svg>
                        </button>
                        <button className="toolbar-btn" onClick={formatItalic} title="Italic (Ctrl+I)">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="4" x2="10" y2="4" /><line x1="14" y1="20" x2="5" y2="20" /><line x1="15" y1="4" x2="9" y2="20" /></svg>
                        </button>
                        <button className="toolbar-btn" onClick={formatStrikethrough} title="Strikethrough">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 5H7M15 16H9M15 11H9" /></svg>
                        </button>
                        <button className="toolbar-btn" onClick={formatCode} title="Inline Code">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
                        </button>
                    </div>
                    <div className="toolbar-divider"></div>
                    <div className="toolbar-group">
                        <button className="toolbar-btn" onClick={formatH1} title="Heading 1">
                            <span className="toolbar-text">H1</span>
                        </button>
                        <button className="toolbar-btn" onClick={formatH2} title="Heading 2">
                            <span className="toolbar-text">H2</span>
                        </button>
                        <button className="toolbar-btn" onClick={formatH3} title="Heading 3">
                            <span className="toolbar-text">H3</span>
                        </button>
                    </div>
                    <div className="toolbar-divider"></div>
                    <div className="toolbar-group">
                        <button className="toolbar-btn" onClick={formatBulletList} title="Bullet List">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
                        </button>
                        <button className="toolbar-btn" onClick={formatNumberedList} title="Numbered List">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" /><path d="M4 6h1v4" /><path d="M4 10h2" /><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" /></svg>
                        </button>
                        <button className="toolbar-btn" onClick={formatCheckbox} title="Task List">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                        </button>
                    </div>
                    <div className="toolbar-divider"></div>
                    <div className="toolbar-group">
                        <button className="toolbar-btn" onClick={formatLink} title="Link (Ctrl+K)">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                        </button>
                        <button className="toolbar-btn" onClick={formatImage} title="Image">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                        </button>
                        <button className="toolbar-btn" onClick={formatQuote} title="Quote">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" /><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" /></svg>
                        </button>
                        <button className="toolbar-btn" onClick={formatCodeBlock} title="Code Block">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
                        </button>
                    </div>
                    <div className="toolbar-divider"></div>
                    <div className="toolbar-group">
                        <button className="toolbar-btn" onClick={formatTable} title="Table">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v18" /><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M3 15h18" /></svg>
                        </button>
                        <button className="toolbar-btn" onClick={formatHR} title="Horizontal Rule">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12" /></svg>
                        </button>
                    </div>
                </div>
            )}

            <main className="editor-body">
                {isLoading ? (
                    <div className="editor-loading"><div className="loader"></div></div>
                ) : viewOnly ? (
                    // View Only Mode (same as before)
                    <div className="view-container">
                        {/* ... TOC and Content ... */}
                        {headings.length > 0 && showTOC && (
                            <aside className="toc-sidebar">
                                <h3>Contents</h3>
                                <nav className="toc-nav">
                                    {headings.map((heading, index) => (
                                        <button key={index} className={`toc-item toc-level-${heading.level}`} onClick={() => scrollToHeading(heading.id)}>
                                            {heading.text}
                                        </button>
                                    ))}
                                </nav>
                            </aside>
                        )}
                        <div className="view-pane">
                            {editorMode === 'markdown' ? (
                                <div className="markdown-body">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, rehypeSanitize]} components={components}>
                                        {localContent}
                                    </ReactMarkdown>
                                </div>
                            ) : (
                                <pre className="plaintext-view">{localContent}</pre>
                            )}
                        </div>
                    </div>
                ) : (
                    // Edit Mode (Split/Tabbed)
                    <div className={`editor-main ${editorMode === 'markdown' ? 'with-preview' : ''}`}>
                        <div className={`editor-pane ${activeTab === 'edit' ? 'active' : ''}`}>
                            {showLineNumbers ? (
                                <div className="editor-with-line-numbers">
                                    <div className="line-numbers">
                                        {lineNumbers.map((num) => (
                                            <div key={num}>{num}</div>
                                        ))}
                                    </div>
                                    <textarea
                                        ref={textareaRef}
                                        className={`editor-textarea ${wordWrap ? 'wrap-enabled' : 'wrap-disabled'}`}
                                        value={localContent}
                                        onChange={handleChange}
                                        onClick={handleTextareaClick}
                                        onKeyUp={handleTextareaKeyUp}
                                        placeholder={editorMode === 'markdown' ? '# Start writing markdown...' : 'Start writing...'}
                                        spellCheck="true"
                                    />
                                </div>
                            ) : (
                                <textarea
                                    ref={textareaRef}
                                    className={`editor-textarea ${wordWrap ? 'wrap-enabled' : 'wrap-disabled'}`}
                                    value={localContent}
                                    onChange={handleChange}
                                    onClick={handleTextareaClick}
                                    onKeyUp={handleTextareaKeyUp}
                                    placeholder={editorMode === 'markdown' ? '# Start writing markdown...' : 'Start writing...'}
                                    spellCheck="true"
                                />
                            )}
                        </div>
                        {editorMode === 'markdown' && (
                            <div className={`preview-pane ${activeTab === 'preview' ? 'active' : ''}`}>
                                <div className="preview-content">
                                    <div className="markdown-body">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, rehypeSanitize]} components={components}>
                                            {localContent}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Status Bar */}
            {!viewOnly && (
                <footer className="editor-status-bar">
                    <div className="status-left">
                        <span className="status-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Ln {cursorPosition.line}, Col {cursorPosition.column}
                        </span>
                    </div>
                    <div className="status-right">
                        <span className="status-item" title="Word Count">
                            {wordCount} {wordCount === 1 ? 'word' : 'words'}
                        </span>
                        <span className="status-divider">•</span>
                        <span className="status-item" title="Character Count">
                            {charCount} chars
                        </span>
                        <span className="status-divider">•</span>
                        <span className="status-item" title="Reading Time">
                            {readingTime} min read
                        </span>
                        <span className="status-divider">•</span>
                        <span className="status-item" title="Lines">
                            {lineCount} lines
                        </span>
                    </div>
                </footer>
            )}
        </div>
    );
}

export default NoteEditor;
