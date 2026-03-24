/**
 * Shared API Configuration
 * Update the API_BASE_URL here to change the backend address for the entire project.
 */
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:';
const hostname = window.location.hostname || 'localhost';
const API_BASE_URL = isLocal ? `http://${hostname}:8080` : window.location.origin;

// Export for use in other scripts if needed (though we use global for simple HTML)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { API_BASE_URL };
}
