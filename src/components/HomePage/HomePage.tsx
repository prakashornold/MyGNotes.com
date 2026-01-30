import { Logo } from '../Logo/Logo';
import { useTheme } from '../../contexts/ThemeContext';
import './HomePage.css';
import type { HomePageProps } from '../../types';

interface HomePagePropsExtended extends HomePageProps {
    onSignIn?: () => void;
}

/**
 * HomePage - Modern landing page with animated header and features
 */
export function HomePage({ onGetStarted, onSignIn }: HomePagePropsExtended) {
    const { theme, toggleTheme } = useTheme();

    const scrollToFeatures = (e: React.MouseEvent) => {
        e.preventDefault();
        document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="home-page">
            {/* Fixed Header with Logo, Theme Toggle, and Sign In */}
            <header className="landing-header">
                <div
                    className="header-logo"
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    style={{ cursor: 'pointer' }}
                >
                    <Logo size={32} />
                </div>
                <div className="header-actions">
                    <button className="theme-toggle-btn" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
                        {theme === 'dark' ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="5" />
                                <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                            </svg>
                        ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                            </svg>
                        )}
                    </button>
                    <button className="sign-in-btn" onClick={onSignIn}>
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
                        </svg>
                        Sign in with Google
                    </button>
                </div>
            </header>

            {/* Hero Section */}
            <section className="hero">
                <div className="hero-content">
                    <div className="hero-badge">
                        <span className="badge-dot"></span>
                        100% Free & Secure
                    </div>
                    <h1 className="hero-title">
                        Your Ideas,<br />
                        <span className="gradient-text">Perfectly Organized</span>
                    </h1>

                    <p className="hero-tagline">
                        Smart note-taking that respects your privacy
                    </p>

                    <p className="hero-description">
                        Experience seamless note-taking with encrypted storage, Google Drive sync,
                        and powerful organization tools. Write in Markdown, organize in folders,
                        and access your notes from anywhere.
                    </p>
                    <div className="hero-actions">
                        <button className="hero-btn primary" onClick={onGetStarted}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Start Taking Notes Free
                        </button>
                        <a href="#features" onClick={scrollToFeatures} className="hero-btn secondary">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                            Explore Features
                        </a>
                    </div>
                    <div className="hero-stats">
                        <div className="stat-item">
                            <div className="stat-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <span>End-to-End Encrypted</span>
                        </div>
                        <div className="stat-item">
                            <div className="stat-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
                                </svg>
                            </div>
                            <span>Real-time Sync</span>
                        </div>
                        <div className="stat-item">
                            <div className="stat-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                            </div>
                            <span>Offline Support</span>
                        </div>
                    </div>
                </div>
                <div className="hero-visual">
                    <div className="app-preview">
                        <div className="preview-header">
                            <div className="preview-dots">
                                <span></span><span></span><span></span>
                            </div>
                            <div style={{ marginLeft: '12px' }}>
                                <Logo size={20} />
                            </div>
                        </div>
                        <div className="preview-content">
                            <div className="preview-sidebar">
                                <div className="preview-folder"></div>
                                <div className="preview-file active"></div>
                                <div className="preview-file"></div>
                                <div className="preview-file"></div>
                            </div>
                            <div className="preview-editor">
                                <div className="preview-line long"></div>
                                <div className="preview-line medium"></div>
                                <div className="preview-line short"></div>
                                <div className="preview-line long"></div>
                                <div className="preview-line medium"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="features" id="features">
                <div className="features-header">
                    <h2>Powerful Features for Modern Note-Taking</h2>
                    <p>Everything you need to capture, organize, and find your ideas effortlessly</p>
                </div>
                <div className="features-grid">
                    <div className="feature-card">
                        <div className="feature-icon-wrapper blue">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0110 0v4" />
                            </svg>
                        </div>
                        <h3>Military-Grade Encryption</h3>
                        <p>Your notes are encrypted end-to-end with AES-256 encryption. Lock sensitive folders with password protection for extra security.</p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon-wrapper green">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 15v4c0 1.1.9 2 2 2h14a2 2 0 002-2v-4M17 8l-5-5-5 5M12 3v12" />
                            </svg>
                        </div>
                        <h3>Cloud Sync with Google Drive</h3>
                        <p>Automatically sync your notes across all devices using your Google Drive. Work offline and sync when you're back online.</p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon-wrapper orange">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="16" y1="13" x2="8" y2="13" />
                                <line x1="16" y1="17" x2="8" y2="17" />
                                <polyline points="10 9 9 9 8 9" />
                            </svg>
                        </div>
                        <h3>Rich Markdown Editor</h3>
                        <p>Write beautifully formatted notes with full Markdown support. Add headers, lists, code blocks, tables, and more with simple syntax.</p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon-wrapper teal">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                            </svg>
                        </div>
                        <h3>Smart Folder Organization</h3>
                        <p>Create unlimited folders and subfolders to organize your notes. Drag and drop files between folders with ease.</p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon-wrapper red">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8" />
                                <path d="M21 21l-4.35-4.35" />
                            </svg>
                        </div>
                        <h3>Lightning-Fast Search</h3>
                        <p>Find any note instantly with powerful full-text search. Search by title, content, or tags across all your notes.</p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon-wrapper purple">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                                <path d="M2 17l10 5 10-5" />
                                <path d="M2 12l10 5 10-5" />
                            </svg>
                        </div>
                        <h3>Export & Share</h3>
                        <p>Export notes to PDF, Markdown, or plain text. Share your notes securely or keep them private.</p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon-wrapper indigo">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <path d="M9 3v18" />
                            </svg>
                        </div>
                        <h3>Dual View Mode</h3>
                        <p>Toggle between editor and preview modes, or use split view to see your formatted notes while you write.</p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon-wrapper yellow">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
                                <line x1="7" y1="7" x2="7.01" y2="7" />
                            </svg>
                        </div>
                        <h3>Tags & Categories</h3>
                        <p>Organize notes with custom tags and categories. Filter and group your content for quick access to related notes.</p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon-wrapper gray">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="3" />
                                <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24" />
                            </svg>
                        </div>
                        <h3>Dark & Light Themes</h3>
                        <p>Switch between beautiful dark and light themes to match your preference or reduce eye strain.</p>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <p>© 2026 MyGNotes.com. All rights reserved.</p>
                <p className="footer-credit">Developed with ❤️ by Om Prakash Peddamadthala</p>
            </footer>
        </div>
    );
}

export default HomePage;
