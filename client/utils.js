const API_BASE_URL = 'http://74.208.167.101';

/**
 * A shared helper function for making authenticated API requests.
 * It automatically adds the Authorization header from sessionStorage.
 * It also handles automatic redirection on auth errors.
 * @param {string} endpoint - The API endpoint to call (e.g., '/api/admin/users').
 * @param {string} [method='GET'] - The HTTP method to use.
 * @param {object|null} [body=null] - The request body for POST/PUT requests.
 * @param {string} [tokenType='adminToken'] - The key for the token in sessionStorage ('adminToken' or 'casinoUserToken').
 * @returns {Promise<any>} A promise that resolves with the JSON response.
 */
async function apiRequest(endpoint, method = 'GET', body = null, tokenType = 'adminToken') {
    const token = sessionStorage.getItem(tokenType);

    // Determine where to redirect on auth failure.
    const redirectUrl = tokenType === 'adminToken' ? '/admin.html' : '/index.html';

    if (!token) {
        window.location.href = redirectUrl;
        throw new Error('No authentication token found. Redirecting to login.');
    }

    const options = {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    };
    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

    if (response.status === 401 || response.status === 403) {
        sessionStorage.removeItem(tokenType); // Clear the invalid token
        window.location.href = redirectUrl;
        const errorData = await response.json();
        throw new Error(errorData.message || 'Session expired or invalid. Redirecting to login.');
    }

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `API request to ${endpoint} failed`);
    }

    // Handle cases where the response might be empty (e.g., a 204 No Content)
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        return response.json();
    }
    return; // Return nothing for non-json responses
}
