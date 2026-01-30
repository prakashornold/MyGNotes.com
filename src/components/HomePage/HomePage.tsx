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
                        Free & Open Source
                    </div>
                    <h1 className="hero-title">
                        Where Privacy,<br />
                        <span className="gradient-text">Meets Productivity</span>
                    </h1>

                    <p className="hero-tagline">
                        Your Private Space for Brilliant Ideas.
                    </p>

                    <p className="hero-description">
                        A minimal, secure note-taking app that syncs with your Google Drive.
                        Create folders, write notes, and access them from any device.
                    </p>
                    <div className="hero-actions">
                        <button className="hero-btn primary" onClick={onGetStarted}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Get Started — It's Free
                        </button>
                        <a href="#features" onClick={scrollToFeatures} className="hero-btn secondary">
                            Learn More
                        </a>
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
                            </div>
                            <div className="preview-editor">
                                <div className="preview-line long"></div>
                                <div className="preview-line medium"></div>
                                <div className="preview-line short"></div>
                                <div className="preview-line long"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="features" id="features">
                <div className="features-header">
                    <h2>Everything You Need</h2>
                    <p>Powerful features designed for your productivity and privacy</p>
                </div>
                <div className="features-grid">
                    <div className="feature-card">
                        <div className="feature-icon-wrapper">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0110 0v4" />
                            </svg>
                        </div>
                        <h3>Privacy First</h3>
                        <p>Your notes are stored locally and encrypted. Optional Google Drive sync keeps your data under your control.</p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon-wrapper">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 00-3-3.87" />
                                <path d="M16 3.13a4 4 0 010 7.75" />
                            </svg>
                        </div>
                        <h3>Google Drive Sync</h3>
                        <p>Seamlessly sync your notes across all devices using your Google Drive account.</p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon-wrapper">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="12" y1="18" x2="12" y2="12" />
                                <line x1="9" y1="15" x2="15" y2="15" />
                            </svg>
                        </div>
                        <h3>Markdown Support</h3>
                        <p>Write in plain text with full Markdown support.  powerful and simple formatting.</p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon-wrapper">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                        </div>
                        <h3>Organize with Folders</h3>
                        <p>Keep your notes organized with folders and subfolders. Lock sensitive folders with encryption.</p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon-wrapper">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8" />
                                <path d="M21 21l-4.35-4.35" />
                            </svg>
                        </div>
                        <h3>Powerful Search</h3>
                        <p>Find your notes instantly with powerful real-time search across all your content.</p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon-wrapper">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                        </div>
                        <h3>Free & Open Source</h3>
                        <p>Completely free to use, forever. Open source code you can trust and contribute to.</p>
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
