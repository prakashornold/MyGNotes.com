import { useState, FormEvent } from 'react';
import './PasswordModal.css';
import type { PasswordModalProps } from '../../types';

/**
 * PasswordModal - Simple, clear encryption password UI
 * Explains encryption in user-friendly terms
 */
export function PasswordModal({
    isOpen,
    isSetup,
    folderName,
    onSubmit,
    onSkip,
    error,
    isLoading
}: PasswordModalProps) {
    const [password, setPassword] = useState<string>('');
    const [confirmPassword, setConfirmPassword] = useState<string>('');
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [localError, setLocalError] = useState<string>('');

    if (!isOpen) return null;

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setLocalError('');

        if (!password) {
            setLocalError('Please enter a password');
            return;
        }

        if (isSetup) {
            if (password.length < 4) {
                setLocalError('Password must be at least 4 characters');
                return;
            }
            if (password !== confirmPassword) {
                setLocalError('Passwords do not match');
                return;
            }
        }

        onSubmit(password);
    };

    return (
        <div className="password-modal-overlay">
            <div className="password-modal">
                {/* Lock Icon */}
                <div className="password-modal-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                </div>

                {/* Title */}
                <h2>
                    {isSetup
                        ? (folderName ? `🔒 Lock "${folderName}"` : '🔐 Set Up Protection')
                        : (folderName ? `🔓 Unlock "${folderName}"` : '🔓 Enter Password')
                    }
                </h2>

                {/* Simple Explanation */}
                <div className="password-explanation">
                    {isSetup ? (
                        folderName ? (
                            <>
                                <p className="explain-main">
                                    <strong>What happens?</strong>
                                </p>
                                <ul className="explain-list">
                                    <li>✅ All files in this folder will be protected</li>
                                    <li>✅ You'll need this password to open the folder</li>
                                    <li>✅ Nobody can read your files without the password</li>
                                </ul>
                            </>
                        ) : (
                            <>
                                <p className="explain-main">
                                    <strong>What does encryption do?</strong>
                                </p>
                                <ul className="explain-list">
                                    <li>✅ Makes your notes unreadable to others</li>
                                    <li>✅ Even if someone accesses your Drive, they can't read them</li>
                                    <li>✅ Only you with the password can unlock them</li>
                                </ul>
                            </>
                        )
                    ) : (
                        <p className="explain-unlock">
                            Enter the password you set when you locked this {folderName ? 'folder' : 'content'}.
                        </p>
                    )}
                </div>

                {/* Warning for setup */}
                {isSetup && (
                    <div className="password-warning">
                        <span className="warning-icon">⚠️</span>
                        <span className="warning-text">
                            <strong>Remember this password!</strong><br />
                            If you forget it, your files cannot be recovered.
                        </span>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <div className="password-input-group">
                        <label>{isSetup ? 'Create a Password' : 'Password'}</label>
                        <div className="password-input-wrapper">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={isSetup ? 'Choose a password' : 'Enter your password'}
                                autoFocus
                                disabled={isLoading}
                            />
                            <button
                                type="button"
                                className="toggle-password"
                                onClick={() => setShowPassword(!showPassword)}
                                title={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>
                    </div>

                    {isSetup && (
                        <div className="password-input-group">
                            <label>Confirm Password</label>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Type the same password again"
                                disabled={isLoading}
                            />
                        </div>
                    )}

                    {/* Error Message */}
                    {(error || localError) && (
                        <div className="password-error">
                            <span>❌ {error || localError}</span>
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        className="password-submit"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <div className="password-spinner"></div>
                                <span>Please wait...</span>
                            </>
                        ) : (
                            <span>{isSetup ? '🔒 Lock Now' : '🔓 Unlock'}</span>
                        )}
                    </button>

                    {/* Cancel/Skip Button */}
                    {onSkip && (
                        <button
                            type="button"
                            className="password-skip"
                            onClick={onSkip}
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                    )}
                </form>

                {/* Footer hint */}
                <p className="password-footer">
                    🔐 Your password stays on this device only
                </p>
            </div>
        </div>
    );
}

export default PasswordModal;
