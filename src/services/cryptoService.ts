const ENCRYPTION_PREFIX = 'MYGNOTES_ENC_V1:';
const MASTER_KEY_STORAGE = 'mygnotes_master_key';
const ENCRYPTED_ITEMS_KEY = 'mygnotes_encrypted_items';

interface EncryptedItems {
    [itemId: string]: boolean;
}

class CryptoService {
    private masterKey: CryptoKey | null = null;
    private _isInitialized: boolean = false;

    get isInitialized(): boolean {
        return this._isInitialized;
    }

    isSupported(): boolean {
        return typeof window !== 'undefined' && !!window.crypto?.subtle;
    }

    async initializeMasterKey(): Promise<void> {
        if (!this.isSupported()) {
            throw new Error('Web Crypto API not supported');
        }

        try {
            const storedKey = localStorage.getItem(MASTER_KEY_STORAGE);

            if (storedKey) {
                const keyData = JSON.parse(storedKey);
                this.masterKey = await window.crypto.subtle.importKey(
                    'jwk',
                    keyData,
                    { name: 'AES-GCM', length: 256 },
                    true,
                    ['encrypt', 'decrypt']
                );
            } else {
                this.masterKey = await window.crypto.subtle.generateKey(
                    { name: 'AES-GCM', length: 256 },
                    true,
                    ['encrypt', 'decrypt']
                );

                const exportedKey = await window.crypto.subtle.exportKey('jwk', this.masterKey);
                localStorage.setItem(MASTER_KEY_STORAGE, JSON.stringify(exportedKey));
            }

            this._isInitialized = true;
        } catch (error) {
            throw new Error('Failed to initialize encryption');
        }
    }

    getEncryptedItems(): EncryptedItems {
        const data = localStorage.getItem(ENCRYPTED_ITEMS_KEY);
        return data ? JSON.parse(data) : {};
    }

    saveEncryptedItems(items: EncryptedItems): void {
        localStorage.setItem(ENCRYPTED_ITEMS_KEY, JSON.stringify(items));
    }

    isItemEncrypted(itemId: string): boolean {
        const encryptedItems = this.getEncryptedItems();
        return !!encryptedItems[itemId];
    }

    toggleItemEncryption(itemId: string, enable: boolean): void {
        const encryptedItems = this.getEncryptedItems();
        if (enable) {
            encryptedItems[itemId] = true;
        } else {
            delete encryptedItems[itemId];
        }
        this.saveEncryptedItems(encryptedItems);
    }

    async encryptData(data: string): Promise<string> {
        if (!this.masterKey) {
            await this.initializeMasterKey();
        }

        if (!this.masterKey) {
            throw new Error('Encryption key not available');
        }

        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);

        const iv = window.crypto.getRandomValues(new Uint8Array(12));

        const encryptedBuffer = await window.crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            this.masterKey,
            dataBuffer
        );

        const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
        combined.set(iv, 0);
        combined.set(new Uint8Array(encryptedBuffer), iv.length);

        return ENCRYPTION_PREFIX + this.arrayBufferToBase64(combined);
    }

    async decryptData(encryptedData: string): Promise<string> {
        if (!this.masterKey) {
            await this.initializeMasterKey();
        }

        if (!this.masterKey) {
            throw new Error('Decryption key not available');
        }

        if (!encryptedData.startsWith(ENCRYPTION_PREFIX)) {
            return encryptedData;
        }

        const base64Data = encryptedData.slice(ENCRYPTION_PREFIX.length);
        const combined = this.base64ToArrayBuffer(base64Data);

        const iv = combined.slice(0, 12);
        const encryptedBuffer = combined.slice(12);

        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            this.masterKey,
            encryptedBuffer
        );

        const decoder = new TextDecoder();
        return decoder.decode(decryptedBuffer);
    }

    isEncrypted(data: string): boolean {
        return data.startsWith(ENCRYPTION_PREFIX);
    }

    arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
        const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    base64ToArrayBuffer(base64: string): Uint8Array {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }

    clearAllData(): void {
        localStorage.removeItem(MASTER_KEY_STORAGE);
        localStorage.removeItem(ENCRYPTED_ITEMS_KEY);
        this.masterKey = null;
        this._isInitialized = false;
    }
}

const cryptoService = new CryptoService();
export default cryptoService;
