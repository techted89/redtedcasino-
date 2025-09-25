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

// --- Login Page Logic ---
if (document.getElementById('user-login-form')) {
    const loginForm = document.getElementById('user-login-form');
    const errorMessage = document.getElementById('error-message');
    const passwordModal = document.getElementById('password-modal');
    const passwordForm = document.getElementById('password-change-form');
    const passwordErrorMessage = document.getElementById('password-error-message');
    const profileModal = document.getElementById('profile-modal');
    const profileForm = document.getElementById('profile-update-form');
    const profileErrorMessage = document.getElementById('profile-error-message');

    async function checkUserStatus() {
        try {
            const status = await apiRequest('/api/user/status', 'GET', null, 'casinoUserToken');
            if (!status.passwordChanged) {
                passwordModal.classList.remove('hidden');
            } else if (!status.profileCompleted) {
                profileModal.classList.remove('hidden');
            } else {
                window.location.href = 'game-selection.html';
            }
        } catch (error) {
            errorMessage.textContent = error.message;
        }
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        errorMessage.textContent = '';
        try {
            const response = await fetch(`${API_BASE_URL}/api/users/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Login failed');

            sessionStorage.setItem('casinoUser', JSON.stringify(data.user));
            sessionStorage.setItem('casinoUserToken', data.token);
            await checkUserStatus();
        } catch (err) {
            errorMessage.textContent = err.message;
        }
    });

    passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        passwordErrorMessage.textContent = '';
        if (newPassword !== confirmPassword) { passwordErrorMessage.textContent = 'Passwords do not match.'; return; }
        if (newPassword.length < 8) { passwordErrorMessage.textContent = 'Password must be at least 8 characters.'; return; }
        try {
            await apiRequest('/api/user/update-password', 'POST', { newPassword }, 'casinoUserToken');
            passwordModal.classList.add('hidden');
            await checkUserStatus();
        } catch (error) {
            passwordErrorMessage.textContent = error.message;
        }
    });

    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const firstName = document.getElementById('update-firstname').value;
        const lastName = document.getElementById('update-lastname').value;
        const age = parseInt(document.getElementById('update-age').value, 10);
        profileErrorMessage.textContent = '';
        if (!firstName || !lastName || !age || age <= 0) { profileErrorMessage.textContent = 'Please fill out all fields with valid data.'; return; }
        try {
            await apiRequest('/api/user/update-profile', 'POST', { firstName, lastName, age }, 'casinoUserToken');
            profileModal.classList.add('hidden');
            await checkUserStatus();
        } catch (error) {
            profileErrorMessage.textContent = error.message;
        }
    });
}

// --- Admin Page Logic ---
if (document.getElementById('admin-panel')) {
    // --- Global State ---
    let userCurrentPage = 1;
    let withdrawalCurrentPage = 1;

    // --- Initial Load ---
    async function loadInitialData() {
        await Promise.all([
            loadUsers(userCurrentPage),
            loadWithdrawalRequests(withdrawalCurrentPage),
            // ... other load functions
        ]);
    }

    // --- User Management ---
    async function loadUsers(page = 1) {
        try {
            const result = await apiRequest(`/api/admin/users?page=${page}&limit=10`);
            renderUserTable(result.data);
            renderPagination('user-pagination', result.totalPages, result.currentPage, loadUsers);
            userCurrentPage = result.currentPage;
        } catch (err) {
            setMessage(err.message, true);
        }
    }

    function renderUserTable(users) { /* ... */ }

    // --- Withdrawal Management ---
    async function loadWithdrawalRequests(page = 1) {
        try {
            const result = await apiRequest(`/api/admin/withdrawal-requests?page=${page}&limit=5`);
            renderWithdrawalRequestsTable(result.data);
            renderPagination('withdrawal-pagination', result.totalPages, result.currentPage, loadWithdrawalRequests);
            withdrawalCurrentPage = result.currentPage;
        } catch (err) {
            setMessage(err.message, true);
        }
    }

    function renderWithdrawalRequestsTable(requests) { /* ... */ }

    // --- Generic Pagination Renderer ---
    function renderPagination(containerId, totalPages, currentPage, loadFunction) {
        const container = document.getElementById(containerId);
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let html = '';
        html += `<button data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>&larr; Previous</button>`;
        html += `<span>Page ${currentPage} of ${totalPages}</span>`;
        html += `<button data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>Next &rarr;</button>`;
        container.innerHTML = html;

        container.querySelectorAll('button').forEach(button => {
            button.addEventListener('click', (e) => {
                const page = parseInt(e.currentTarget.dataset.page, 10);
                loadFunction(page);
            });
        });
    }

    // --- Other functions and event listeners ---
    // (login, apiRequest, handleLogout, game management, etc.)
    // The full script would be here.
    window.addEventListener('load', () => {
        if (sessionStorage.getItem('adminToken')) {
            document.getElementById('admin-panel').classList.remove('hidden');
            loadInitialData();
        } else {
            document.getElementById('login-section').classList.remove('hidden');
        }
    });
    function setMessage(msg, isError = false) { document.getElementById('admin-message').textContent = msg; }
}

// --- Game Selection Page Logic ---
if (document.getElementById('game-list')) {
    document.addEventListener('DOMContentLoaded', () => {
        const userInfoDiv = document.getElementById('user-info');
        const gameListDiv = document.getElementById('game-list');
        const logoutButton = document.getElementById('logout-button');

        // 1. Check for user login
        const user = JSON.parse(localStorage.getItem('casinoUser'));
        const token = localStorage.getItem('casinoUserToken');

        if (!user || !token) {
            window.location.href = 'index.html'; // Redirect to login if not logged in
            return;
        }

        // 2. Display user info
        userInfoDiv.textContent = `Welcome, ${user.username}! Balance: ${user.balance}`;

        // 3. Logout functionality
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('casinoUser');
            localStorage.removeItem('casinoUserToken');
            window.location.href = 'index.html';
        });

        // 4. Fetch and display games
        async function loadGames() {
            try {
                const response = await fetch('/api/games');
                if (!response.ok) throw new Error('Failed to load games');
                const games = await response.json();

                games.forEach(game => {
                    const card = document.createElement('div');
                    card.className = 'game-card';
                    card.dataset.gameId = game.id;
                    card.innerHTML = `
                        <img src="${game.backgroundImage}" alt="${game.name}">
                        <div class="title">${game.name}</div>
                    `;
                    card.addEventListener('click', () => {
                        // Redirect to the slot page with the selected gameId
                        window.location.href = `slot.html?game=${game.id}`;
                    });
                    gameListDiv.appendChild(card);
                });

            } catch (err) {
                gameListDiv.innerHTML = `<p style="color: red;">Error: ${err.message}</p>`;
            }
        }

        loadGames();
    });
}

// --- Slot Machine Page Logic ---
if (document.getElementById('spin-button')) {
    document.addEventListener('DOMContentLoaded', () => {
        // --- Element selectors ---
        const userInfoDiv = document.getElementById('user-info');
        const balanceDisplay = document.getElementById('balance-display');
        const winningsDisplay = document.getElementById('winnings-display');
        const spinButton = document.getElementById('spin-button');
        const reels = Array.from({length: 5}, (_, i) => document.getElementById(`reel${i+1}`));
        const passwordModal = document.getElementById('password-modal');
        const withdrawalModal = document.getElementById('withdrawal-modal');

        // --- Auth & API Helper ---
        const params = new URLSearchParams(window.location.search);
        const gameId = params.get('game');
        let user = JSON.parse(sessionStorage.getItem('casinoUser'));
        const token = sessionStorage.getItem('casinoUserToken');

        if (!user || !token || !gameId) {
            window.location.href = '/index.html';
            return;
        }

        // --- UI Initialization ---
        document.body.style.backgroundImage = `url('http://redtedcasino.com/BearSlot/img/background.jpg')`;
        function updateBalance() {
            balanceDisplay.textContent = `Balance: ${user.balance.toFixed(2)}`;
            userInfoDiv.textContent = `Player: ${user.username}`;
        }
        updateBalance();

        // --- Game Spin Logic ---
        spinButton.addEventListener('click', async () => {
            const betAmount = parseInt(document.getElementById('bet-amount').value, 10);
            if (isNaN(betAmount) || betAmount <= 0) { winningsDisplay.textContent = 'Invalid bet amount.'; return; }
            if (user.balance < betAmount) { winningsDisplay.textContent = 'Insufficient balance.'; return; }

            spinButton.disabled = true;
            winningsDisplay.textContent = 'Spinning...';
            reels.forEach(r => r.style.backgroundImage = '');

            try {
                // Use the shared apiRequest, specifying the casino user token
                const data = await apiRequest('/api/spin', 'POST', { userId: user.id, betAmount, gameId }, 'casinoUserToken');
                user.balance = data.newBalance;
                sessionStorage.setItem('casinoUser', JSON.stringify(user));
                updateBalance();
                data.reels.forEach((symbolUrl, i) => { reels[i].style.backgroundImage = `url('${symbolUrl}')`; });
                winningsDisplay.textContent = data.winnings > 0 ? `YOU WON: ${data.winnings}!` : ' ';
            } catch (err) {
                winningsDisplay.textContent = `Error: ${err.message}`;
            } finally {
                spinButton.disabled = false;
            }
        });

        // --- Modal Handling ---
        function setupModal(buttonId, modalId) {
            const btn = document.getElementById(buttonId);
            const modal = document.getElementById(modalId);
            const closeBtn = modal.querySelector('.close-btn');
            btn.addEventListener('click', () => modal.style.display = 'flex');
            closeBtn.addEventListener('click', () => modal.style.display = 'none');
        }
        setupModal('update-password-btn', 'password-modal');
        setupModal('request-withdrawal-btn', 'withdrawal-modal');

        // --- Form Submissions ---
        document.getElementById('password-update-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const newPassword = document.getElementById('new-password').value;
            const msgEl = document.getElementById('password-message');
            // ... validation ...
            try {
                await apiRequest('/api/user/update-password', 'POST', { newPassword }, 'casinoUserToken');
                msgEl.textContent = 'Password updated successfully!';
                // ...
            } catch (err) {
                msgEl.textContent = err.message;
            }
        });

        document.getElementById('withdrawal-request-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const amount = parseFloat(document.getElementById('withdrawal-amount').value);
            const msgEl = document.getElementById('withdrawal-message');
            // ... validation ...
            try {
                await apiRequest('/api/user/request-withdrawal', 'POST', { amount }, 'casinoUserToken');
                msgEl.textContent = 'Withdrawal request submitted successfully!';
                // ...
            } catch (err) {
                msgEl.textContent = err.message;
            }
        });
    });
}