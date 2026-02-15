/**
 * Authentication Module - AWS Cognito with Amplify
 *
 * Handles:
 * - Email/Password authentication through AWS Cognito
 * - Google OAuth login through Cognito federation
 * - Token storage and retrieval
 * - Session management
 * - User registration and password reset via Cognito
 *
 * All auth operations go through AWS Cognito User Pool
 */

class AuthManager {
    constructor() {
        this.isAuthenticated = false;
        this.user = null;
        this.tokens = null;
        this.initializeAuth();
    }

    /**
     * Initialize authentication on page load
     * Check if user has existing Cognito session
     */
    async initializeAuth() {
        try {
            // Check if we're returning from OAuth redirect
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has('code')) {
                await this.handleOAuthCallback();
                return;
            }

            // Try to get current authenticated user from Cognito
            try {
                const user = await Auth.currentAuthenticatedUser();
                if (user) {
                    this.isAuthenticated = true;
                    this.user = this.extractUserInfo(user);
                    await this.getAndStoreTokens(user);
                    document.dispatchEvent(new Event('authStateChanged'));
                }
            } catch (err) {
                // User not authenticated, which is normal for first-time visitors
                console.log('No active session found');
            }
        } catch (error) {
            console.error('Error initializing authentication:', error);
        }
    }

    /**
     * Handle OAuth redirect callback from Cognito
     */
    async handleOAuthCallback() {
        try {
            // Get current authenticated user after OAuth redirect
            const user = await Auth.currentAuthenticatedUser();
            if (user) {
                this.isAuthenticated = true;
                this.user = this.extractUserInfo(user);
                await this.getAndStoreTokens(user);

                // Clean up URL
                window.history.replaceState({}, document.title, window.location.pathname);

                // Dispatch auth event
                document.dispatchEvent(new Event('authStateChanged'));
            }
        } catch (error) {
            console.error('Error handling OAuth callback:', error);
            this.showError('Authentication failed. Please try again.');
        }
    }

    /**
     * Sign up with email and password through Cognito
     * @param {string} email - User email
     * @param {string} password - User password
     * @param {string} name - User full name
     */
    async signUpWithEmail(email, password, name = '') {
        try {
            const result = await Auth.signUp({
                username: email,
                password: password,
                attributes: {
                    email: email,
                    name: name || email.split('@')[0]
                }
            });

            return {
                success: true,
                message: 'Sign up successful! Please check your email for verification code.',
                userSub: result.userSub
            };
        } catch (error) {
            console.error('Sign up error:', error);
            return {
                success: false,
                message: this.getErrorMessage(error)
            };
        }
    }

    /**
     * Confirm user email with verification code
     * @param {string} email - User email
     * @param {string} code - Verification code from email
     */
    async confirmSignUp(email, code) {
        try {
            await Auth.confirmSignUp(email, code);

            return {
                success: true,
                message: 'Email verified! You can now log in.'
            };
        } catch (error) {
            console.error('Confirm sign up error:', error);
            return {
                success: false,
                message: this.getErrorMessage(error)
            };
        }
    }

    /**
     * Sign in with email and password through Cognito
     * @param {string} email - User email
     * @param {string} password - User password
     */
    async signInWithEmail(email, password) {
        try {
            const user = await Auth.signIn({
                username: email,
                password: password
            });

            if (user.challengeName === 'NEW_PASSWORD_REQUIRED') {
                return {
                    success: false,
                    message: 'New password required',
                    challengeName: 'NEW_PASSWORD_REQUIRED',
                    user: user
                };
            }

            // Get user attributes and tokens
            const userAttributes = await Auth.userAttributes(user);
            this.user = this.extractUserAttributes(userAttributes);
            this.isAuthenticated = true;

            await this.getAndStoreTokens(user);

            document.dispatchEvent(new Event('authStateChanged'));

            return {
                success: true,
                message: 'Login successful!',
                user: this.user
            };
        } catch (error) {
            console.error('Sign in error:', error);
            return {
                success: false,
                message: this.getErrorMessage(error)
            };
        }
    }

    /**
     * Complete new password challenge
     * @param {object} user - User object from sign in
     * @param {string} newPassword - New password to set
     */
    async completeNewPasswordChallenge(user, newPassword) {
        try {
            const signedInUser = await Auth.completeNewPassword(user, newPassword);

            const userAttributes = await Auth.userAttributes(signedInUser);
            this.user = this.extractUserAttributes(userAttributes);
            this.isAuthenticated = true;

            await this.getAndStoreTokens(signedInUser);

            document.dispatchEvent(new Event('authStateChanged'));

            return {
                success: true,
                message: 'Password updated and logged in!',
                user: this.user
            };
        } catch (error) {
            console.error('Complete new password error:', error);
            return {
                success: false,
                message: this.getErrorMessage(error)
            };
        }
    }

    /**
     * Request password reset via Cognito
     * @param {string} email - User email
     */
    async forgotPassword(email) {
        try {
            const result = await Auth.forgotPassword(email);

            return {
                success: true,
                message: 'Check your email for password reset code.',
                codeDeliveryDetails: result.codeDeliveryDetails
            };
        } catch (error) {
            console.error('Forgot password error:', error);
            return {
                success: false,
                message: this.getErrorMessage(error)
            };
        }
    }

    /**
     * Confirm password reset with code
     * @param {string} email - User email
     * @param {string} code - Reset code from email
     * @param {string} newPassword - New password
     */
    async confirmForgotPassword(email, code, newPassword) {
        try {
            await Auth.forgotPasswordSubmit(email, code, newPassword);

            return {
                success: true,
                message: 'Password reset successful! You can now log in.'
            };
        } catch (error) {
            console.error('Confirm forgot password error:', error);
            return {
                success: false,
                message: this.getErrorMessage(error)
            };
        }
    }

    /**
     * Get and store tokens from authenticated user
     */
    async getAndStoreTokens(user) {
        try {
            const session = user.getSignInUserSession?.() ||
                            await Auth.currentSession();

            if (session && session.isValid?.()) {
                this.tokens = {
                    accessToken: session.getAccessToken().getJwtToken(),
                    idToken: session.getIdToken().getJwtToken(),
                    refreshToken: session.getRefreshToken().getToken(),
                    expiresIn: session.getAccessToken().getExpiration(),
                    timestamp: Date.now()
                };
                this.storeTokens(this.tokens);
                return this.tokens;
            }
        } catch (error) {
            console.error('Error getting tokens:', error);
        }
        return null;
    }

    /**
     * Extract user information from Cognito user object
     */
    extractUserInfo(user) {
        try {
            const attributes = user.attributes || {};
            return {
                email: attributes.email || user.username,
                name: attributes.name || attributes.email || 'User',
                picture: attributes.picture,
                sub: attributes.sub || user.username,
                emailVerified: attributes.email_verified
            };
        } catch (error) {
            console.error('Error extracting user info:', error);
            return null;
        }
    }

    /**
     * Extract user info from Cognito attributes array
     */
    extractUserAttributes(attributes) {
        try {
            const attrMap = {};
            if (Array.isArray(attributes)) {
                attributes.forEach(attr => {
                    attrMap[attr.Name] = attr.Value;
                });
            } else {
                Object.assign(attrMap, attributes);
            }

            return {
                email: attrMap.email,
                name: attrMap.name || attrMap.email || 'User',
                picture: attrMap.picture,
                sub: attrMap.sub,
                emailVerified: attrMap.email_verified === 'true'
            };
        } catch (error) {
            console.error('Error extracting user attributes:', error);
            return null;
        }
    }

    /**
     * Initiate Google OAuth login via Cognito Hosted UI
     */
    loginWithGoogle() {
        try {
            Auth.federatedSignIn({ provider: 'Google' });
        } catch (error) {
            console.error('Error initiating Google login:', error);
            this.showError('Failed to initiate Google login. Please check your configuration.');
        }
    }

    /**
     * Logout user from Cognito
     */
    async logout() {
        try {
            await Auth.signOut({ global: true });
            this.clearStoredTokens();
            this.isAuthenticated = false;
            this.user = null;
            this.tokens = null;

            document.dispatchEvent(new Event('authStateChanged'));
        } catch (error) {
            console.error('Error logging out:', error);
            // Even if logout fails, clear local data
            this.clearStoredTokens();
            this.isAuthenticated = false;
            this.user = null;
            document.dispatchEvent(new Event('authStateChanged'));
        }
    }

    /**
     * Store tokens in localStorage
     */
    storeTokens(tokens) {
        try {
            localStorage.setItem('auth_tokens', JSON.stringify(tokens));
        } catch (error) {
            console.error('Error storing tokens:', error);
        }
    }

    /**
     * Retrieve stored tokens from localStorage
     */
    getStoredTokens() {
        try {
            const tokens = localStorage.getItem('auth_tokens');
            return tokens ? JSON.parse(tokens) : null;
        } catch (error) {
            console.error('Error retrieving tokens:', error);
            return null;
        }
    }

    /**
     * Clear stored tokens from localStorage
     */
    clearStoredTokens() {
        try {
            localStorage.removeItem('auth_tokens');
        } catch (error) {
            console.error('Error clearing tokens:', error);
        }
    }

    /**
     * Get authorization header with current token
     */
    getAuthHeader() {
        if (!this.tokens || !this.tokens.accessToken) {
            return null;
        }

        return {
            'Authorization': `Bearer ${this.tokens.accessToken}`
        };
    }

    /**
     * Get user-friendly error message from Cognito errors
     */
    getErrorMessage(error) {
        const errorMessages = {
            'UsernameExistsException': 'Email already registered. Please sign in or use a different email.',
            'InvalidPasswordException': 'Password must be at least 8 characters with uppercase, lowercase, numbers, and special characters.',
            'UserNotConfirmedException': 'Please verify your email before signing in.',
            'NotAuthorizedException': 'Invalid email or password.',
            'UserNotFoundException': 'User not found. Please sign up first.',
            'CodeMismatchException': 'Invalid verification code.',
            'ExpiredCodeException': 'Verification code has expired. Please request a new one.',
            'LimitExceededException': 'Too many attempts. Please try again later.',
            'PasswordResetRequiredException': 'Password reset is required.',
            'InvalidParameterException': 'Invalid parameter provided.',
            'UsernameAttributeNotConfigured': 'Email is required for sign up.',
            'AliasAttributeNotConfigured': 'Email login is not configured.'
        };

        const code = error.code || error.name;
        if (code && errorMessages[code]) {
            return errorMessages[code];
        }

        if (error.message) {
            return error.message;
        }

        return 'An error occurred. Please try again.';
    }

    /**
     * Show error message to user
     */
    showError(message) {
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
     * Get current authentication status
     */
    getAuthStatus() {
        return {
            isAuthenticated: this.isAuthenticated,
            user: this.user,
            tokens: this.tokens
        };
    }
}

// Initialize global auth manager when Amplify is ready
if (typeof Amplify !== 'undefined') {
    const authManager = new AuthManager();
    window.authManager = authManager;
} else {
    console.error('AWS Amplify not loaded. Make sure aws-amplify is included before auth.js');
}
