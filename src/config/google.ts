import type { GoogleConfig } from '../types';

export const GOOGLE_CONFIG: GoogleConfig = {
    clientId: '257847266541-cfagsf6pql1c2100k1md4f0ovpqfmv89.apps.googleusercontent.com',
    scopes: [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email'
    ].join(' '),
};

export const APP_FOLDER_NAME = 'MyGNotes.com';
