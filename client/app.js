const API_BASE_URL = 'http://74.208.167.101';

/**
 * A shared helper function for making authenticated API requests.
 * It automatically adds the Authorization header from sessionStorage.
 * It also handles automatic redirection on auth errors.
 * @param {string} endpoint - The API endpoint to call (e.g., '/api/admin/users').
 * @param {string} [method='GET'] - The HTTP method to use.
 * @param {object|null} [body=null] - The request body for POST/PUT requests.
 * @param {string} [tokenType='casinoUserToken'] - The key for the token in sessionStorage.
 * @returns {Promise<any>} A promise that resolves with the JSON response.
 */
async function apiRequest(endpoint, method = 'GET', body = null, tokenType = 'casinoUserToken') {
    const token = sessionStorage.getItem(tokenType);
    const redirectUrl = '/index.html';

    if (!token && tokenType === 'casinoUserToken') { // Only redirect for user routes
        window.location.href = redirectUrl;
        throw new Error('No authentication token found. Redirecting to login.');
    }

    const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
    };

    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

    if (response.status === 401 || response.status === 403) {
        sessionStorage.removeItem(tokenType);
        window.location.href = redirectUrl;
        const errorData = await response.json();
        throw new Error(errorData.message || 'Session expired or invalid. Redirecting to login.');
    }

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `API request to ${endpoint} failed`);
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        return response.json();
    }
    return;
}


// --- Web3 Login Page Logic ---
if (document.getElementById('connect-wallet-btn')) {
    const connectButton = document.getElementById('connect-wallet-btn');
    const errorMessage = document.getElementById('error-message');

    const connectWallet = async () => {
        errorMessage.textContent = '';
        try {
            if (!window.ethereum) {
                throw new Error('No crypto wallet found. Please install MetaMask.');
            }

            await window.ethereum.send('eth_requestAccounts');
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const walletAddress = await signer.getAddress();

            const response = await fetch(`${API_BASE_URL}/api/users/login-web3`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ walletAddress })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Web3 login failed');

            sessionStorage.setItem('casinoUser', JSON.stringify(data.user));
            sessionStorage.setItem('casinoUserToken', data.token);

            window.location.href = 'game.html';

        } catch (err) {
            console.error(err);
            errorMessage.textContent = err.message;
        }
    };

    connectButton.addEventListener('click', connectWallet);
}