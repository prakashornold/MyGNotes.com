import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { GOOGLE_CONFIG } from '../config/google';
import driveService from '../services/driveService';
import type { AuthContextType, User, GoogleTokenResponse } from '../types';

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isInitialized, setIsInitialized] = useState<boolean>(false);

    // Load Google Identity Services
    useEffect(() => {
        const loadGoogleScript = () => {
            if (document.getElementById('google-gsi-script')) {
                setIsInitialized(true);
                return;
            }

            const script = document.createElement('script');
            script.id = 'google-gsi-script';
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.onload = () => setIsInitialized(true);
            document.head.appendChild(script);
        };

        loadGoogleScript();

        // Check for stored token
        const storedToken = localStorage.getItem('google_access_token');
        const storedUser = localStorage.getItem('google_user');
        const tokenExpiry = localStorage.getItem('google_token_expiry');

        if (storedToken && storedUser && tokenExpiry) {
            try {
                if (new Date().getTime() < parseInt(tokenExpiry)) {
                    setAccessToken(storedToken);
                    setUser(JSON.parse(storedUser));
                    driveService.setAccessToken(storedToken);
                } else {
                    // Token expired, clear storage
                    localStorage.removeItem('google_access_token');
                    localStorage.removeItem('google_user');
                    localStorage.removeItem('google_token_expiry');
                }
            } catch (e) {
                console.error('Failed to parse stored user:', e);
                localStorage.removeItem('google_access_token');
                localStorage.removeItem('google_user');
                localStorage.removeItem('google_token_expiry');
            }
        }
        setIsLoading(false);
    }, []);

    const fetchUserInfo = useCallback(async (token: string) => {
        try {
            const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const userInfo: User = await response.json();
                setUser(userInfo);
                localStorage.setItem('google_user', JSON.stringify(userInfo));
            }
        } catch (error) {
            console.error('Failed to fetch user info:', error);
        }
    }, []);

    const signIn = useCallback(() => {
        if (!isInitialized || !window.google) {
            console.error('Google Identity Services not loaded');
            return;
        }

        const tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CONFIG.clientId,
            scope: GOOGLE_CONFIG.scopes,
            callback: async (response: GoogleTokenResponse) => {
                if (response.access_token) {
                    const token = response.access_token;
                    const expiresIn = response.expires_in || 3600;
                    const expiry = new Date().getTime() + expiresIn * 1000;

                    setAccessToken(token);
                    driveService.setAccessToken(token);
                    localStorage.setItem('google_access_token', token);
                    localStorage.setItem('google_token_expiry', expiry.toString());

                    await fetchUserInfo(token);
                }
            },
        });

        tokenClient.requestAccessToken();
    }, [isInitialized, fetchUserInfo]);

    const signOut = useCallback(() => {
        if (accessToken && window.google) {
            window.google.accounts.oauth2.revoke(accessToken);
        }
        setUser(null);
        setAccessToken(null);
        localStorage.removeItem('google_access_token');
        localStorage.removeItem('google_user');
        localStorage.removeItem('google_token_expiry');
    }, [accessToken]);

    const value: AuthContextType = {
        user,
        accessToken,
        isLoading,
        isAuthenticated: !!accessToken,
        signIn,
        signOut,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;
