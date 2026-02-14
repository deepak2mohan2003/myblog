/**
 * Main Application Module
 *
 * Handles:
 * - UI state management
 * - Event listeners
 * - DOM manipulation
 * - User interface updates based on authentication state
 */

class App {
    constructor() {
        this.authManager = window.authManager;
        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        this.setupEventListeners();
        this.updateUIState();

        // Listen for authentication state changes
        document.addEventListener('authStateChanged', () => {
            this.updateUIState();
        });

        // Check auth state periodically (every minute)
        setInterval(() => {
            this.updateUIState();
        }, 60000);
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Login button on header
        const authBtn = document.getElementById('auth-btn');
        if (authBtn) {
            authBtn.addEventListener('click', () => {
                if (this.authManager.isAuthenticated) {
                    this.handleLogout();
                } else {
                    this.handleLogin();
                }
            });
        }

        // Login button on welcome section
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                this.handleLogin();
            });
        }

        // Retry button on error section
        const retryBtn = document.getElementById('retry-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                this.handleLogin();
            });
        }

        // Set active nav link based on current page
        this.setActiveNavLink();
    }

    /**
     * Handle login action
     */
    handleLogin() {
        try {
            this.authManager.loginWithGoogle();
        } catch (error) {
            console.error('Login error:', error);
            this.showErrorMessage('Login failed. Please try again.');
        }
    }

    /**
     * Handle logout action
     */
    handleLogout() {
        try {
            if (confirm('Are you sure you want to logout?')) {
                this.authManager.logout();
            }
        } catch (error) {
            console.error('Logout error:', error);
            this.showErrorMessage('Logout failed. Please try again.');
        }
    }

    /**
     * Update UI based on authentication state
     */
    updateUIState() {
        const authStatus = this.authManager.getAuthStatus();
        const authBtn = document.getElementById('auth-btn');
        const welcomeSection = document.getElementById('welcome-section');
        const protectedSection = document.getElementById('protected-section');
        const errorSection = document.getElementById('error-section');

        // Update auth button
        if (authBtn) {
            if (authStatus.isAuthenticated) {
                authBtn.textContent = 'Logout';
                authBtn.classList.add('logout-btn');
            } else {
                authBtn.textContent = 'Login';
                authBtn.classList.remove('logout-btn');
            }
        }

        // Show/hide sections based on auth state
        if (authStatus.isAuthenticated) {
            // User is authenticated
            if (welcomeSection) welcomeSection.style.display = 'none';
            if (protectedSection) protectedSection.style.display = 'block';
            if (errorSection) errorSection.style.display = 'none';

            // Update user information in protected section
            this.displayUserInfo(authStatus.user);
        } else {
            // User is not authenticated
            if (welcomeSection) welcomeSection.style.display = 'block';
            if (protectedSection) protectedSection.style.display = 'none';
            if (errorSection) errorSection.style.display = 'none';
        }
    }

    /**
     * Display user information in the protected section
     */
    displayUserInfo(user) {
        if (!user) return;

        const userName = document.getElementById('user-name');
        const userEmail = document.getElementById('user-email');

        if (userName) {
            userName.textContent = user.name || user.email || 'User';
        }

        if (userEmail) {
            userEmail.textContent = user.email || '-';
        }
    }

    /**
     * Set active nav link based on current page
     */
    setActiveNavLink() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const navLinks = document.querySelectorAll('.nav-link');

        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            const linkPage = href.split('/').pop() || 'index.html';

            if (linkPage === currentPage) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    /**
     * Show error message to user
     */
    showErrorMessage(message) {
        const errorSection = document.getElementById('error-section');
        const errorMessage = document.getElementById('error-message');

        if (errorSection && errorMessage) {
            errorMessage.textContent = message;
            errorSection.style.display = 'block';

            const welcomeSection = document.getElementById('welcome-section');
            const protectedSection = document.getElementById('protected-section');

            if (welcomeSection) welcomeSection.style.display = 'none';
            if (protectedSection) protectedSection.style.display = 'none';
        }
    }

    /**
     * Make authenticated API call
     * Includes authorization header with access token
     */
    async makeAuthenticatedRequest(url, options = {}) {
        try {
            if (!this.authManager.isAuthenticated) {
                throw new Error('User is not authenticated');
            }

            const authHeader = this.authManager.getAuthHeader();
            const headers = {
                ...authHeader,
                ...options.headers
            };

            const response = await fetch(url, {
                ...options,
                headers
            });

            if (!response.ok) {
                if (response.status === 401) {
                    // Unauthorized - token might be expired
                    this.handleLogout();
                    throw new Error('Session expired. Please login again.');
                }
                throw new Error(`API request failed: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API request error:', error);
            throw error;
        }
    }

    /**
     * Check if user is authenticated
     * Can be used by other modules
     */
    isUserAuthenticated() {
        return this.authManager.isAuthenticated;
    }

    /**
     * Get current user info
     */
    getCurrentUser() {
        return this.authManager.user;
    }

    /**
     * Get auth tokens
     */
    getTokens() {
        return this.authManager.tokens;
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const app = new App();
        window.app = app;
    });
} else {
    const app = new App();
    window.app = app;
}
