import { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import './MarkdownViewer.css';

interface MarkdownViewerProps {
    file: {
        id: string;
        name: string;
    };
    content: string;
    onBack: () => void;
}

interface TocItem {
    id: string;
    text: string;
    level: number;
}

export function MarkdownViewer({ file, content, onBack }: MarkdownViewerProps) {
    const [toc, setToc] = useState<TocItem[]>([]);
    const [activeSection, setActiveSection] = useState<string>('');
    const [showExportMenu, setShowExportMenu] = useState(false);

    // Generate TOC from markdown headings (excluding code blocks)
    useEffect(() => {
        const tocItems: TocItem[] = [];
        const lines = content.split(/\r?\n/);
        let inCodeBlock = false;

        for (const line of lines) {
            // Check if line contains ``` (handles all cases: at start, with spaces, with language)
            if (line.includes('```')) {
                inCodeBlock = !inCodeBlock;
                continue;
            }

            // Skip lines inside code blocks
            if (inCodeBlock) continue;

            // Check for ALL headings (H1-H6) to match React Markdown rendering
            const match = line.match(/^(#{1,6})\s+(.+)$/);
            if (match) {
                const level = match[1].length;
                const text = match[2].trim();
                // Generate ID from text only (no counter for reliability)
                const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-') || 'heading';

                // Only add H1 and H2 to TOC
                if (level <= 2) {
                    tocItems.push({ id, text, level });
                }
            }
        }

        setToc(tocItems);
        console.log('📋 TOC Generated (' + tocItems.length + ' items):');
        console.table(tocItems);
    }, [content]);

    // Scroll to section
    const scrollToSection = (id: string) => {
        console.log('🔍 TOC Click - ID:', id);
        const element = document.getElementById(id);
        const container = document.querySelector('.viewer-content');

        console.log('📍 Element found:', element ? 'YES ✓' : 'NO ✗');
        console.log('📦 Container found:', container ? 'YES ✓' : 'NO ✗');

        if (element) {
            console.log('🎯 Element details:', {
                tagName: element.tagName,
                id: element.id,
                offsetTop: element.offsetTop,
                textContent: element.textContent?.substring(0, 50)
            });
        }

        if (element && container) {
            const elementTop = element.offsetTop;
            const offset = 20; // Small offset from top
            console.log('📏 Scrolling to:', elementTop - offset);
            container.scrollTo({
                top: elementTop - offset,
                behavior: 'smooth'
            });
            setActiveSection(id);
            console.log('✅ Scroll initiated');
        } else {
            console.error('❌ Cannot scroll:', { hasElement: !!element, hasContainer: !!container });
            // Try to list all heading IDs in the document
            const allHeadings = document.querySelectorAll('h1[id], h2[id]');
            console.log('📜 All H1/H2 IDs in document (' + allHeadings.length + ' items):');
            console.table(Array.from(allHeadings).map(h => ({
                tag: h.tagName,
                id: h.id,
                text: h.textContent?.substring(0, 40)
            })));
        }
    };

    // Track active section on scroll
    useEffect(() => {
        const handleScroll = () => {
            const sections = toc.map(item => document.getElementById(item.id)).filter(Boolean);
            const scrollPosition = window.scrollY + 100;

            for (let i = sections.length - 1; i >= 0; i--) {
                const section = sections[i];
                if (section && section.offsetTop <= scrollPosition) {
                    setActiveSection(toc[i].id);
                    break;
                }
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [toc]);

    // Export to PDF
    const exportToPDF = async () => {
        const content = document.querySelector('.markdown-body');
        if (!content) return;

        try {
            const canvas = await html2canvas(content as HTMLElement, {
                scale: 2,
                useCORS: true,
                logging: false
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const imgWidth = 210; // A4 width in mm
            const pageHeight = 297; // A4 height in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            const filename = file.name.replace(/\.md$/, '') + '.pdf';
            pdf.save(filename);
        } catch (error) {
            console.error('Error exporting to PDF:', error);
            alert('Failed to export PDF. Please try again.');
        }
    };

    // Export to HTML
    const exportToHTML = () => {
        const content = document.querySelector('.markdown-body');
        if (!content) return;

        try {
            // Get the HTML content
            const htmlContent = content.innerHTML;

            // Get computed styles from CSS
            const styles = `
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                        line-height: 1.6;
                        color: #1e293b;
                        max-width: 1200px;
                        margin: 0 auto;
                        padding: 40px;
                        background: #ffffff;
                    }
                    h1, h2, h3, h4, h5, h6 {
                        margin-top: 2em;
                        margin-bottom: 0.75em;
                        font-weight: 700;
                        line-height: 1.3;
                    }
                    h1 { font-size: 2.5rem; color: #8b5cf6; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.3em; }
                    h2 { font-size: 2rem; color: #8b5cf6; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.3em; }
                    h3 { font-size: 1.625rem; }
                    h4 { font-size: 1.375rem; }
                    h5 { font-size: 1.125rem; }
                    h6 { font-size: 1rem; color: #64748b; }
                    p { margin-bottom: 1.25em; }
                    code {
                        background: rgba(139, 92, 246, 0.1);
                        padding: 3px 8px;
                        border-radius: 5px;
                        font-family: 'Courier New', monospace;
                        font-size: 0.9em;
                        color: #7c3aed;
                    }
                    pre {
                        background: #1e293b;
                        border: 1px solid #334155;
                        border-radius: 12px;
                        padding: 20px;
                        overflow-x: auto;
                        margin: 1.75em 0;
                    }
                    pre code {
                        background: none;
                        padding: 0;
                        color: #e2e8f0;
                        font-size: 0.9375rem;
                    }
                    blockquote {
                        border-left: 4px solid #8b5cf6;
                        padding-left: 1.5em;
                        margin: 1.75em 0;
                        color: #64748b;
                        font-style: italic;
                        background: rgba(139, 92, 246, 0.05);
                        padding: 1.25em 1.5em;
                        border-radius: 0 8px 8px 0;
                    }
                    ul, ol { margin-left: 2em; margin-bottom: 1.25em; }
                    li { margin-bottom: 0.5em; }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 1.5em 0;
                        background: #f8fafc;
                        border-radius: 12px;
                        overflow: hidden;
                    }
                    th {
                        background: #e2e8f0;
                        padding: 12px;
                        text-align: left;
                        font-weight: 600;
                        border-bottom: 2px solid #8b5cf6;
                    }
                    td {
                        padding: 12px;
                        border-bottom: 1px solid #e2e8f0;
                    }
                    a {
                        color: #8b5cf6;
                        text-decoration: none;
                        border-bottom: 1px solid rgba(139, 92, 246, 0.3);
                    }
                    a:hover {
                        color: #7c3aed;
                        border-bottom-color: #7c3aed;
                    }
                    img {
                        max-width: 100%;
                        height: auto;
                        border-radius: 12px;
                        margin: 1.5em 0;
                    }
                </style>
            `;

            // Create complete HTML document
            const fullHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${file.name.replace(/\.md$/, '')}</title>
    ${styles}
</head>
<body>
    ${htmlContent}
</body>
</html>
            `.trim();

            // Create blob and download
            const blob = new Blob([fullHTML], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.name.replace(/\.md$/, '') + '.html';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting to HTML:', error);
            alert('Failed to export HTML. Please try again.');
        }
    };

    // Custom renderer to add IDs to headings
    // Use useMemo to ensure stable ID generation that matches TOC
    const components: any = useMemo(() => {

        const generateHeadingId = (children: any) => {
            const text = String(children);
            // Generate ID from text only (no counter for reliability)
            const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
            return id || 'heading';
        };

        return {
            h1: ({ children, ...props }: any) => <h1 id={generateHeadingId(children)} {...props}>{children}</h1>,
            h2: ({ children, ...props }: any) => <h2 id={generateHeadingId(children)} {...props}>{children}</h2>,
            h3: ({ children, ...props }: any) => <h3 id={generateHeadingId(children)} {...props}>{children}</h3>,
            h4: ({ children, ...props }: any) => <h4 id={generateHeadingId(children)} {...props}>{children}</h4>,
            h5: ({ children, ...props }: any) => <h5 id={generateHeadingId(children)} {...props}>{children}</h5>,
            h6: ({ children, ...props }: any) => <h6 id={generateHeadingId(children)} {...props}>{children}</h6>,
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
    }, [content]);

    return (
        <div className="markdown-viewer">
            {/* Main Content */}
            <div className="viewer-container" style={{ height: '100%', position: 'relative' }}>
                {/* Export Dropdown Button */}
                <div className="export-dropdown" style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 100 }}>
                    <button
                        className="export-btn"
                        onClick={() => setShowExportMenu(!showExportMenu)}
                        style={{
                            padding: '10px 16px',
                            background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            fontSize: '0.9375rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Export
                    </button>

                    {showExportMenu && (
                        <div
                            className="export-menu"
                            style={{
                                position: 'absolute',
                                top: '50px',
                                right: 0,
                                background: 'rgba(255, 255, 255, 0.95)',
                                backdropFilter: 'blur(20px)',
                                border: '1px solid rgba(139, 92, 246, 0.2)',
                                borderRadius: '12px',
                                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                                overflow: 'hidden',
                                minWidth: '180px'
                            }}
                        >
                            <button
                                onClick={() => {
                                    exportToPDF();
                                    setShowExportMenu(false);
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    width: '100%',
                                    padding: '14px 18px',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '0.9375rem',
                                    color: '#1e293b',
                                    transition: 'all 0.2s ease',
                                    borderBottom: '1px solid rgba(139, 92, 246, 0.1)'
                                }}
                                className="export-menu-item"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                Export as PDF
                            </button>
                            <button
                                onClick={() => {
                                    exportToHTML();
                                    setShowExportMenu(false);
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    width: '100%',
                                    padding: '14px 18px',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '0.9375rem',
                                    color: '#1e293b',
                                    transition: 'all 0.2s ease'
                                }}
                                className="export-menu-item"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                </svg>
                                Export as HTML
                            </button>
                        </div>
                    )}
                </div>

                {/* Table of Contents */}
                {toc.length > 0 && (
                    <aside className="toc-sidebar">
                        <div className="toc-header">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                            <h3>Table of Contents</h3>
                        </div>
                        <nav className="toc-nav">
                            {toc.map((item) => (
                                <button
                                    key={item.id}
                                    className={`toc-item toc-level-${item.level} ${activeSection === item.id ? 'active' : ''}`}
                                    onClick={() => scrollToSection(item.id)}
                                >
                                    {item.text}
                                </button>
                            ))}
                        </nav>
                    </aside>
                )}

                {/* Markdown Content */}
                <main className="viewer-content">
                    <div className="markdown-body">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw, rehypeSanitize]}
                            components={components}
                        >
                            {content}
                        </ReactMarkdown>
                    </div>
                </main>
            </div>
        </div>
    );
}
