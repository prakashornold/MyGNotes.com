# MyGNotes.com

A secure, offline-first Markdown note-taking application that syncs seamlessly with your Google Drive. MyGNotes.com is designed for privacy, giving you complete control over your data by storing it directly in your own cloud storage.

## Features

- **🔒 Private & Secure**: Your notes are stored in your own Google Drive. No third-party servers see your data.
- **📂 Folder Organization**: Organize your notes with a nested folder structure.
- **☁️ Cloud Sync**: Automatically syncs your notes and folders with Google Drive.
- **📝 Rich Markdown Editor**: Write with a powerful Markdown editor featuring syntax highlighting and live preview.
- **🔐 Folder Locking**: Encrypt sensitive folders with a password for an extra layer of security.
- **📌 Pinning**: Pin important files and folders for quick access.
- **🌓 Dark/Light Mode**: Choose the theme that fits your preference.
- **⚡ Offline First**: Continue writing even when you're offline. Changes sync when you reconnect.
- **📱 Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices.

## Technologies Used

Built with modern web technologies for performance and reliability:

- **Frontend Framework**: [React 19](https://react.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/) for type safety
- **Build Tool**: [Vite](https://vitejs.dev/) for fast development and bundling
- **Routing**: [React Router v7](https://reactrouter.com/)
- **Styling**: Vanilla CSS with CSS Variables for theming (Dark/Light mode)
- **Editor**:
    - `react-markdown`, `remark-gfm`, `rehype-raw`, `rehype-sanitize` for rendering
    - `react-syntax-highlighter` for code blocks
- **Storage/Backend**:
    - **Google Drive API v3**: Serves as the primary backend and storage.
    - **Local Storage**: Used for offline caching and user preferences.
- **Security**: Web Crypto API for client-side encryption.

## Backend & API Explanation

MyGNotes.com operates on a **Serverless / Client-Side** architecture. It does not maintain its own backend server. Instead, it interacts directly with Google APIs from your browser.

### Key Integrations:

1.  **Google Identity Services (OAuth 2.0)**:
    - Handles user authentication.
    - Scopes used:
        - `drive.file`: Access only to files and folders created by this app (ensuring privacy for your other Drive files).
        - `userinfo.profile` & `userinfo.email`: For displaying your profile.

2.  **Google Drive API v3**:
    - Acts as the database and file storage.
    - **Files**: Notes are stored as standard text/markdown files in Drive.
    - **Folders**: Mapped to Google Drive folders.
    - **Metadata**: Custom properties (like `isPinned`) are stored in the file's `appProperties`.

3.  **Synchronization Strategy**:
    - The app uses a "Strategy Pattern" for storage.
    - **Online Mode**: Direct read/write to Google Drive.
    - **Offline Mode**: Reads/writes to browser `localStorage`.
    - **Sync**: When coming online, local changes are pushed to Google Drive.

## Local Setup Steps

Follow these steps to run the project locally on your machine.

### Prerequisites
- Node.js (v18 or higher)
- npm (Node Package Manager)

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/secure-notes.git
    cd secure-notes
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

### Configuration

The application comes with a default Google Cloud Client ID for demo purposes. For production or personal development, you should set up your own Google Cloud Project.

1.  Go to [Google Cloud Console](https://console.cloud.google.com/).
2.  Create a new project.
3.  Enable **Google Drive API**.
4.  Configure **OAuth Consent Screen** (add `http://localhost:5173` to authorized domains).
5.  Create **OAuth 2.0 Client ID** credentials.
    - Application type: Web application
    - Authorized JavaScript origins: `http://localhost:5173`
6.  Open `src/config/google.ts` and replace the `clientId` with your own.

### Running the App

1.  **Start the development server**
    ```bash
    npm run dev
    ```

2.  **Open in Browser**
    Visit `http://localhost:5173` in your browser.

### Building for Production

To create a production build:

```bash
npm run build
```

The output will be in the `dist` folder, ready to be deployed to any static host (Netlify, Vercel, GitHub Pages, etc.). Note that for static hosting, you must configure your host to rewrite all routes to `index.html`.
