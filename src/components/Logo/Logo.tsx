import React from 'react';

interface LogoProps {
    className?: string;
    size?: number; // Size in pixels for height/width base
    collapsed?: boolean;
    withTagline?: boolean;
    colorMode?: 'light' | 'dark' | 'auto'; // For text color adjustment
}

export const Logo: React.FC<LogoProps> = ({
    className = '',
    size = 32,
    collapsed = false,
    withTagline = false,
    colorMode = 'auto'
}) => {
    // Basic color logic (can be refined with context later if needed)
    const subTextColor = 'var(--text-secondary)';

    return (
        <div className={`app-logo ${className}`} style={{ display: 'flex', flexDirection: 'column', alignItems: collapsed ? 'center' : 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: collapsed ? 0 : '12px' }}>
                <svg
                    width={size}
                    height={size}
                    viewBox="0 0 32 32"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ filter: 'drop-shadow(0 4px 6px rgba(139, 92, 246, 0.3))' }}
                >
                    <path
                        d="M6 10C6 6.68629 8.68629 4 12 4H20C23.3137 4 26 6.68629 26 10V22C26 25.3137 23.3137 28 20 28H12C8.68629 28 6 25.3137 6 22V10Z"
                        fill="url(#logo-bg-gradient)"
                    />
                    <path
                        d="M16 8V14M16 14L12 11M16 14L20 11"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.9"
                    />
                    <path
                        d="M11 19H21M11 23H17"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        opacity="0.8"
                    />
                    <defs>
                        <linearGradient id="logo-bg-gradient" x1="6" y1="4" x2="26" y2="28" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#8B5CF6" />
                            <stop offset="0.5" stopColor="#6366F1" />
                            <stop offset="1" stopColor="#3B82F6" />
                        </linearGradient>
                    </defs>
                </svg>
                {!collapsed && (
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <span style={{
                            fontSize: `${Math.max(16, size * 0.7)}px`,
                            fontWeight: 800,
                            lineHeight: 1,
                            background: 'linear-gradient(135deg, var(--text-primary) 0%, var(--accent-primary) 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            letterSpacing: '-0.03em',
                            fontFamily: "'Inter', sans-serif"
                        }}>
                            MyGNotes
                        </span>
                        {withTagline && (
                            <span style={{
                                fontSize: `${Math.max(10, size * 0.35)}px`,
                                color: subTextColor,
                                fontWeight: 500,
                                marginTop: '4px',
                                letterSpacing: '0.01em',
                                whiteSpace: 'nowrap'
                            }}>
                                Your Private Space
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
