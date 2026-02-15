/**
 * Main Application Module
 *
 * Handles:
 * - UI state management
 * - Event listeners for authentication forms
 * - DOM manipulation
 * - User interface updates based on authentication state
 * - Form validation and submission
 */

class App {
    constructor() {
        this.authManager = window.authManager;
        this.currentAuthMode = 'signin'; // signin, signup, verify, forgot-password
        this.signUpData = {}; // Store signup data for verification
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
                    // Show login forms
                    this.showAuthModal();
                }
            });
        }

        // Login button on welcome section
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                this.showAuthModal();
            });
        }

        // Retry button on error section
        const retryBtn = document.getElementById('retry-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                this.showAuthModal();
            });
        }

        // Email signin form
        const signInForm = document.getElementById('signin-form');
        if (signInForm) {
            signInForm.addEventListener('submit', (e) => this.handleSignIn(e));
        }

        // Email signup form
        const signUpForm = document.getElementById('signup-form');
        if (signUpForm) {
            signUpForm.addEventListener('submit', (e) => this.handleSignUp(e));
        }

        // Verify email form
        const verifyForm = document.getElementById('verify-form');
        if (verifyForm) {
            verifyForm.addEventListener('submit', (e) => this.handleVerify(e));
        }

        // Forgot password form
        const forgotForm = document.getElementById('forgot-password-form');
        if (forgotForm) {
            forgotForm.addEventListener('submit', (e) => this.handleForgotPassword(e));
        }

        // Reset password form
        const resetForm = document.getElementById('reset-password-form');
        if (resetForm) {
            resetForm.addEventListener('submit', (e) => this.handleResetPassword(e));
        }

        // Toggle between signin and signup
        const signupLink = document.getElementById('signup-link');
        if (signupLink) {
            signupLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchAuthMode('signup');
            });
        }

        const signinLink = document.getElementById('signin-link');
        if (signinLink) {
            signinLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchAuthMode('signin');
            });
        }

        // Forgot password link
        const forgotLink = document.getElementById('forgot-password-link');
        if (forgotLink) {
            forgotLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchAuthMode('forgot-password');
            });
        }

        // Google login button
        const googleLoginBtn = document.getElementById('google-login-btn');
        if (googleLoginBtn) {
            googleLoginBtn.addEventListener('click', () => {
                this.authManager.loginWithGoogle();
            });
        }

        // Set active nav link based on current page
        this.setActiveNavLink();
    }

    /**
     * Show authentication modal
     */
    showAuthModal() {
        const modal = document.getElementById('auth-modal');
        if (modal) {
            modal.style.display = 'flex';
        }
        this.switchAuthMode('signin');
    }

    /**
     * Close authentication modal
     */
    closeAuthModal() {
        const modal = document.getElementById('auth-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * Switch authentication mode (signin, signup, verify, forgot-password)
     */
    switchAuthMode(mode) {
        this.currentAuthMode = mode;

        const signInForm = document.getElementById('signin-form');
        const signUpForm = document.getElementById('signup-form');
        const verifyForm = document.getElementById('verify-form');
        const forgotForm = document.getElementById('forgot-password-form');
        const resetForm = document.getElementById('reset-password-form');

        // Hide all forms
        if (signInForm) signInForm.style.display = 'none';
        if (signUpForm) signUpForm.style.display = 'none';
        if (verifyForm) verifyForm.style.display = 'none';
        if (forgotForm) forgotForm.style.display = 'none';
        if (resetForm) resetForm.style.display = 'none';

        // Show active form
        if (mode === 'signin' && signInForm) signInForm.style.display = 'block';
        if (mode === 'signup' && signUpForm) signUpForm.style.display = 'block';
        if (mode === 'verify' && verifyForm) verifyForm.style.display = 'block';
        if (mode === 'forgot-password' && forgotForm) forgotForm.style.display = 'block';
        if (mode === 'reset-password' && resetForm) resetForm.style.display = 'block';
    }

    /**
     * Handle email/password sign in
     */
    async handleSignIn(e) {
        e.preventDefault();

        const email = document.getElementById('signin-email')?.value;
        const password = document.getElementById('signin-password')?.value;
        const errorEl = document.getElementById('signin-error');

        if (!email || !password) {
            if (errorEl) errorEl.textContent = 'Please enter email and password.';
            return;
        }

        try {
            if (errorEl) errorEl.textContent = '';

            const result = await this.authManager.signInWithEmail(email, password);

            if (result.success) {
                this.closeAuthModal();
                this.showSuccessMessage('Login successful!');
            } else if (result.challengeName === 'NEW_PASSWORD_REQUIRED') {
                // Store user object and show new password form
                window.newPasswordUser = result.user;
                this.switchAuthMode('reset-password');
                if (errorEl) errorEl.textContent = 'Please set a new password.';
            } else {
                if (errorEl) errorEl.textContent = result.message;
            }
        } catch (error) {
            console.error('Sign in error:', error);
            if (errorEl) errorEl.textContent = 'An error occurred. Please try again.';
        }
    }

    /**
     * Handle email/password sign up
     */
    async handleSignUp(e) {
        e.preventDefault();

        const name = document.getElementById('signup-name')?.value;
        const email = document.getElementById('signup-email')?.value;
        const password = document.getElementById('signup-password')?.value;
        const confirmPassword = document.getElementById('signup-confirm-password')?.value;
        const errorEl = document.getElementById('signup-error');

        if (!name || !email || !password || !confirmPassword) {
            if (errorEl) errorEl.textContent = 'Please fill in all fields.';
            return;
        }

        if (password !== confirmPassword) {
            if (errorEl) errorEl.textContent = 'Passwords do not match.';
            return;
        }

        if (password.length < 8) {
            if (errorEl) errorEl.textContent = 'Password must be at least 8 characters.';
            return;
        }

        try {
            if (errorEl) errorEl.textContent = '';

            const result = await this.authManager.signUpWithEmail(email, password, name);

            if (result.success) {
                // Store signup data for verification
                this.signUpData = { email, password };
                this.switchAuthMode('verify');
                const verifyMsg = document.getElementById('verify-message');
                if (verifyMsg) verifyMsg.textContent = `Verification code sent to ${email}`;
            } else {
                if (errorEl) errorEl.textContent = result.message;
            }
        } catch (error) {
            console.error('Sign up error:', error);
            if (errorEl) errorEl.textContent = 'An error occurred. Please try again.';
        }
    }

    /**
     * Handle email verification
     */
    async handleVerify(e) {
        e.preventDefault();

        const code = document.getElementById('verify-code')?.value;
        const errorEl = document.getElementById('verify-error');

        if (!code) {
            if (errorEl) errorEl.textContent = 'Please enter verification code.';
            return;
        }

        try {
            if (errorEl) errorEl.textContent = '';

            const result = await this.authManager.confirmSignUp(
                this.signUpData.email,
                code
            );

            if (result.success) {
                // Auto login after verification
                const loginResult = await this.authManager.signInWithEmail(
                    this.signUpData.email,
                    this.signUpData.password
                );

                if (loginResult.success) {
                    this.closeAuthModal();
                    this.showSuccessMessage('Email verified and logged in!');
                } else {
                    this.switchAuthMode('signin');
                    if (errorEl) errorEl.textContent = 'Verification successful! Please log in.';
                }
            } else {
                if (errorEl) errorEl.textContent = result.message;
            }
        } catch (error) {
            console.error('Verification error:', error);
            if (errorEl) errorEl.textContent = 'An error occurred. Please try again.';
        }
    }

    /**
     * Handle forgot password request
     */
    async handleForgotPassword(e) {
        e.preventDefault();

        const email = document.getElementById('forgot-email')?.value;
        const errorEl = document.getElementById('forgot-error');

        if (!email) {
            if (errorEl) errorEl.textContent = 'Please enter your email.';
            return;
        }

        try {
            if (errorEl) errorEl.textContent = '';

            const result = await this.authManager.forgotPassword(email);

            if (result.success) {
                // Store email for password reset
                window.resetPasswordEmail = email;
                this.switchAuthMode('reset-password');
                const resetMsg = document.getElementById('reset-message');
                if (resetMsg) resetMsg.textContent = `Reset code sent to ${email}`;
            } else {
                if (errorEl) errorEl.textContent = result.message;
            }
        } catch (error) {
            console.error('Forgot password error:', error);
            if (errorEl) errorEl.textContent = 'An error occurred. Please try again.';
        }
    }

    /**
     * Handle password reset
     */
    async handleResetPassword(e) {
        e.preventDefault();

        const password = document.getElementById('new-password')?.value;
        const confirmPassword = document.getElementById('confirm-new-password')?.value;
        const code = document.getElementById('reset-code')?.value;
        const errorEl = document.getElementById('reset-error');

        if (!password || !confirmPassword) {
            if (errorEl) errorEl.textContent = 'Please enter password.';
            return;
        }

        if (password !== confirmPassword) {
            if (errorEl) errorEl.textContent = 'Passwords do not match.';
            return;
        }

        if (password.length < 8) {
            if (errorEl) errorEl.textContent = 'Password must be at least 8 characters.';
            return;
        }

        try {
            if (errorEl) errorEl.textContent = '';

            // Check if this is for NEW_PASSWORD_REQUIRED challenge or forgot password
            if (window.newPasswordUser) {
                // Completing new password challenge during login
                const result = await this.authManager.completeNewPasswordChallenge(
                    window.newPasswordUser,
                    password
                );

                if (result.success) {
                    window.newPasswordUser = null;
                    this.closeAuthModal();
                    this.showSuccessMessage('Password set and logged in!');
                } else {
                    if (errorEl) errorEl.textContent = result.message;
                }
            } else if (window.resetPasswordEmail && code) {
                // Completing forgot password flow
                const result = await this.authManager.confirmForgotPassword(
                    window.resetPasswordEmail,
                    code,
                    password
                );

                if (result.success) {
                    window.resetPasswordEmail = null;
                    this.switchAuthMode('signin');
                    if (errorEl) errorEl.textContent = '';
                    const msg = document.getElementById('signin-error');
                    if (msg) msg.textContent = 'Password reset successful! Please log in.';
                } else {
                    if (errorEl) errorEl.textContent = result.message;
                }
            }
        } catch (error) {
            console.error('Reset password error:', error);
            if (errorEl) errorEl.textContent = 'An error occurred. Please try again.';
        }
    }

    /**
     * Handle logout action
     */
    async handleLogout() {
        try {
            if (confirm('Are you sure you want to logout?')) {
                await this.authManager.logout();
                this.showSuccessMessage('Logged out successfully!');
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
     * Show success message
     */
    showSuccessMessage(message) {
        const container = document.body;
        const msgEl = document.createElement('div');
        msgEl.className = 'success-message';
        msgEl.textContent = message;
        container.appendChild(msgEl);

        setTimeout(() => {
            msgEl.style.display = 'none';
            setTimeout(() => msgEl.remove(), 300);
        }, 3000);
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
