/**
 * File utility functions for type detection and handling
 * Follows Single Responsibility Principle - focused on file operations
 */

/**
 * Extract file extension from filename
 * @param filename - The file name to extract extension from
 * @returns The lowercase file extension without the dot
 */
export function getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

/**
 * Check if file is a markdown file
 * @param filename - The file name to check
 * @returns True if file is markdown (.md or .markdown)
 */
export function isMarkdownFile(filename: string): boolean {
    const ext = getFileExtension(filename);
    return ext === 'md' || ext === 'markdown';
}

/**
 * Check if file is a plain text file
 * @param filename - The file name to check
 * @returns True if file is plain text (.txt)
 */
export function isPlainTextFile(filename: string): boolean {
    const ext = getFileExtension(filename);
    return ext === 'txt' || ext === '';
}

/**
 * Determine if file should open in split view (editor + preview)
 * @param filename - The file name to check
 * @returns True if file should show split view
 */
export function shouldShowSplitView(filename: string): boolean {
    return isMarkdownFile(filename);
}

/**
 * Get display name for file type
 * @param filename - The file name
 * @returns Human-readable file type
 */
export function getFileType(filename: string): string {
    const ext = getFileExtension(filename);

    switch (ext) {
        case 'md':
        case 'markdown':
            return 'Markdown';
        case 'txt':
            return 'Text';
        case 'json':
            return 'JSON';
        default:
            return ext.toUpperCase() || 'File';
    }
}

/**
 * Validate file name
 * @param filename - The file name to validate
 * @returns True if valid, false otherwise
 */
export function isValidFileName(filename: string): boolean {
    if (!filename || filename.trim().length === 0) {
        return false;
    }

    // Check for invalid characters
    const invalidChars = /[<>:"|?*]/;
    if (invalidChars.test(filename)) {
        return false;
    }

    return true;
}
