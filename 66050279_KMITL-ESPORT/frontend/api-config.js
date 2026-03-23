/**
 * Shared API Configuration
 * Update the API_BASE_URL here to change the backend address for the entire project.
 */
const API_BASE_URL = `http://${window.location.hostname}:3000`;

// Export for use in other scripts if needed (though we use global for simple HTML)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { API_BASE_URL };
}
