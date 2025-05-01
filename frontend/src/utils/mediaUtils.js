/**
 * Utility functions for handling image URLs
 */

/**
 * Constructs a full URL for media items (like avatars) 
 * @param {string} path - The path from database (e.g. "/uploads/avatar/file-xxx.jpg")
 * @returns {string} Full URL to the media
 */
export const getMediaUrl = (path) => {
    if (!path) return ''; // Return empty if no path provided

    // Use environment variable for API URL if available
    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5002';

    // If path already includes http, return as is
    if (path.startsWith('http')) return path;

    // If path doesn't start with /, add it
    const formattedPath = path.startsWith('/') ? path : `/${path}`;

    // Return full URL by joining API base with the path
    return `${apiBaseUrl}${formattedPath}`;
};