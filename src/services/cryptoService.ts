const ENCRYPTION_PREFIX = 'MYGNOTES_ENC_V1:';
const SALT_KEY = 'mygnotes_encryption_salt';
const ENCRYPTION_DISABLED_KEY = 'mygnotes_encryption_disabled';
const PBKDF2_ITERATIONS = 100000;

interface LockedFolderData {
    salt: string;
    verify: string;
}

interface LockedFolders {
    [folderId: string]: LockedFolderData;
}

interface FolderKeys {
    [folderId: string]: CryptoKey;
}

class CryptoService {
    private encryptionKey: CryptoKey | null = null;
    private _isInitialized: boolean = false;
    private folderKeys: FolderKeys = {};

    get isInitialized(): boolean {
        return this._isInitialized;
    }

    isSupported(): boolean {
        return typeof window !== 'undefined' && !!window.crypto?.subtle;
    }

    generateSalt(): string {
        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        return this.arrayBufferToBase64(salt);
    }

    getSalt(): string {
        let salt = localStorage.getItem(SALT_KEY);
        if (!salt) {
            salt = this.generateSalt();
            localStorage.setItem(SALT_KEY, salt);
        }
        return salt;
    }

    isEncryptionSetup(): boolean {
        return localStorage.getItem(SALT_KEY) !== null;
    }

    isEncryptionDisabled(): boolean {
        return localStorage.getItem(ENCRYPTION_DISABLED_KEY) === 'true';
    }

    disableEncryption(): void {
        localStorage.setItem(ENCRYPTION_DISABLED_KEY, 'true');
        this._isInitialized = false;
        this.encryptionKey = null;
    }

    enableEncryption(): void {
        localStorage.removeItem(ENCRYPTION_DISABLED_KEY);
    }

    getLockedFolders(): LockedFolders {
        const data = localStorage.getItem('mygnotes_locked_folders');
        return data ? JSON.parse(data) : {};
    }

    saveLockedFolders(folders: LockedFolders): void {
        localStorage.setItem('mygnotes_locked_folders', JSON.stringify(folders));
    }

    isLockedFolder(folderId: string): boolean {
        const lockedFolders = this.getLockedFolders();
        return !!lockedFolders[folderId];
    }

    async lockFolder(folderId: string, password: string): Promise<void> {
        const salt = this.generateSalt();
        const key = await this.deriveKey(password, salt);

        const testValue = 'FOLDER_LOCKED_OK';
        const encrypted = await this.encryptWithKey(testValue, key);

        const lockedFolders = this.getLockedFolders();
        lockedFolders[folderId] = { salt, verify: encrypted };
        this.saveLockedFolders(lockedFolders);

        this.folderKeys[folderId] = key;
    }

    async unlockFolder(folderId: string, password: string): Promise<boolean> {
        const lockedFolders = this.getLockedFolders();
        const folderData = lockedFolders[folderId];

        if (!folderData) return true;

        try {
            const key = await this.deriveKey(password, folderData.salt);
            await this.decryptWithKey(folderData.verify, key);
            this.folderKeys[folderId] = key;
            return true;
        } catch {
            return false;
        }
    }

    isFolderUnlocked(folderId: string): boolean {
        return !!this.folderKeys[folderId];
    }

    getFolderKey(folderId: string): CryptoKey | null {
        return this.folderKeys[folderId] || null;
    }

    removeFolderLock(folderId: string): void {
        const lockedFolders = this.getLockedFolders();
        delete lockedFolders[folderId];
        this.saveLockedFolders(lockedFolders);
        delete this.folderKeys[folderId];
    }

    lockFolderSession(folderId: string): void {
        delete this.folderKeys[folderId];
    }

    async deriveKey(password: string, saltBase64: string): Promise<CryptoKey> {
        const encoder = new TextEncoder();
        const salt = this.base64ToArrayBuffer(saltBase64);

        const keyMaterial = await window.crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            'PBKDF2',
            false,
            ['deriveKey']
        );

        const key = await window.crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: PBKDF2_ITERATIONS,
                hash: 'SHA-256',
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );

        return key;
    }

    async initialize(password: string): Promise<boolean> {
        if (!this.isSupported()) {
            console.error('Web Crypto API not supported');
            return false;
        }

        try {
            const salt = this.getSalt();
            this.encryptionKey = await this.deriveKey(password, salt);
            this._isInitialized = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize encryption:', error);
            return false;
        }
    }

    async verifyPassword(password: string): Promise<boolean> {
        const testData = localStorage.getItem('mygnotes_password_verify');
        if (!testData) return true;

        try {
            const salt = this.getSalt();
            const key = await this.deriveKey(password, salt);
            await this.decryptWithKey(testData, key);
            return true;
        } catch {
            return false;
        }
    }

    async setupPassword(password: string): Promise<void> {
        const salt = this.getSalt();
        const key = await this.deriveKey(password, salt);

        const testValue = 'MYGNOTES_PASSWORD_OK';
        const encrypted = await this.encryptWithKey(testValue, key);
        localStorage.setItem('mygnotes_password_verify', encrypted);

        this.encryptionKey = key;
        this._isInitialized = true;
    }

    async encrypt(plaintext: string): Promise<string> {
        if (!this._isInitialized || !this.encryptionKey) {
            throw new Error('Encryption not initialized');
        }
        return this.encryptWithKey(plaintext, this.encryptionKey);
    }

    async encryptWithKey(plaintext: string, key: CryptoKey): Promise<string> {
        const encoder = new TextEncoder();
        const data = encoder.encode(plaintext);

        const iv = window.crypto.getRandomValues(new Uint8Array(12));

        const encrypted = await window.crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key,
            data
        );

        const combined = new Uint8Array(iv.length + encrypted.byteLength);
        combined.set(iv);
        combined.set(new Uint8Array(encrypted), iv.length);

        return ENCRYPTION_PREFIX + this.arrayBufferToBase64(combined);
    }

    async decrypt(ciphertext: string): Promise<string> {
        if (!this._isInitialized || !this.encryptionKey) {
            throw new Error('Encryption not initialized');
        }
        return this.decryptWithKey(ciphertext, this.encryptionKey);
    }

    async decryptWithKey(ciphertext: string, key: CryptoKey): Promise<string> {
        // Assuming the user intended to add a new check for GNOTES_ENC_V1:
        // and that the 'RYPTION_PREFIX)) {' was a malformed part of the original line.
        // The instruction "Replace GNOTE with GNOTES and keys" is interpreted as adding
        // a check for 'GNOTES_ENC_V1:' and potentially using 'folderKey' (though 'folderKey'
        // is not defined in this scope, so it's omitted for syntactic correctness).
        // The most faithful interpretation of the diff snippet is to add the new prefix check.
        if (!ciphertext.startsWith(ENCRYPTION_PREFIX) && !ciphertext.startsWith('MYGNOTES_ENC_V1:')) {
            throw new Error('Invalid encrypted data format');
        }
        const data = ciphertext.slice(ENCRYPTION_PREFIX.length);

        const combined = this.base64ToArrayBuffer(data);
        const combinedArray = new Uint8Array(combined);

        const iv = combinedArray.slice(0, 12);
        const encryptedData = combinedArray.slice(12);

        const decrypted = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            encryptedData
        );

        const decoder = new TextDecoder();
        return decoder.decode(decrypted);
    }

    isEncrypted(data: string): boolean {
        return typeof data === 'string' && data.startsWith(ENCRYPTION_PREFIX);
    }

    clear(): void {
        this.encryptionKey = null;
        this._isInitialized = false;
    }

    reset(): void {
        localStorage.removeItem(SALT_KEY);
        localStorage.removeItem('mygnotes_password_verify');
        this.clear();
    }

    private arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
        const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    private base64ToArrayBuffer(base64: string): ArrayBuffer {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }
}

export const cryptoService = new CryptoService();
export default cryptoService;
