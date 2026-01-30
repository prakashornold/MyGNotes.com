import { useState, useRef, useEffect } from 'react';
import './UserDropdown.css';
import type { UserDropdownProps } from '../../types';

/**
 * UserDropdown - Shows user info and sign out
 */
export function UserDropdown({ user, onSignOut }: UserDropdownProps) {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    return (
        <div className="user-dropdown" ref={dropdownRef}>
            <button
                className="user-dropdown-trigger"
                onClick={() => setIsOpen(!isOpen)}
            >
                {user?.picture ? (
                    <img src={user.picture} alt="" className="user-avatar" />
                ) : (
                    <div className="user-avatar-placeholder">
                        {user?.name?.charAt(0) || 'U'}
                    </div>
                )}
                <div className="user-trigger-info">
                    <span className="user-name">{user?.name || 'User'}</span>
                    <svg className={`dropdown-arrow ${isOpen ? 'open' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>

            {isOpen && (
                <div className="user-dropdown-menu">
                    {/* User Info Section */}
                    <div className="dropdown-user-info">
                        {user?.picture && (
                            <img src={user.picture} alt="" className="dropdown-avatar" />
                        )}
                        <div className="dropdown-user-details">
                            <span className="dropdown-user-name">{user?.name}</span>
                            <span className="dropdown-user-email">{user?.email}</span>
                        </div>
                    </div>

                    <div className="dropdown-divider"></div>

                    {/* Sign Out */}
                    <button className="dropdown-signout" onClick={onSignOut}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>Sign out</span>
                    </button>
                </div>
            )}
        </div>
    );
}

export default UserDropdown;
