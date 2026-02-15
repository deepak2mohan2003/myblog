/**
 * Authentication Module
 *
 * Handles:
 * - Email/Password authentication with Cognito
 * - Google OAuth login integration
 * - Token storage and retrieval
 * - Session management
 * - User registration and password reset
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
     * Check if user has valid tokens from previous session
     */
    async initializeAuth() {
        try {
            // Check if we're returning from OAuth redirect
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has('code')) {
                await this.handleOAuthCallback();
                return;
            }

            // Check for existing session/tokens
            const storedTokens = this.getStoredTokens();
            if (storedTokens) {
                // Verify tokens are still valid
                if (this.areTokensValid(storedTokens)) {
                    this.tokens = storedTokens;
                    this.isAuthenticated = true;
                    this.user = this.extractUserFromToken(storedTokens.idToken);
                    document.dispatchEvent(new Event('authStateChanged'));
                } else {
                    // Tokens expired, clear them
                    this.clearStoredTokens();
                }
            }
        } catch (error) {
            console.error('Error initializing authentication:', error);
        }
    }

    /**
     * Handle OAuth redirect callback from Cognito
     * Exchange authorization code for tokens
     */
    async handleOAuthCallback() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');

            if (code) {
                // Exchange code for tokens
                const tokens = await this.exchangeCodeForTokens(code);

                if (tokens) {
                    this.tokens = tokens;
                    this.isAuthenticated = true;
                    this.user = this.extractUserFromToken(tokens.idToken);

                    // Store tokens
                    this.storeTokens(tokens);

                    // Clean up URL
                    window.history.replaceState({}, document.title, window.location.pathname);

                    // Dispatch auth event
                    document.dispatchEvent(new Event('authStateChanged'));
                }
            }
        } catch (error) {
            console.error('Error handling OAuth callback:', error);
            this.showError('Authentication failed. Please try again.');
        }
    }

    /**
     * Exchange authorization code for tokens
     */
    async exchangeCodeForTokens(code) {
        try {
            const tokenEndpoint = `https://${awsConfig.oauth.domain}/oauth2/token`;

            const body = new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: awsConfig.userPoolWebClientId,
                code: code,
                redirect_uri: awsConfig.oauth.redirectSignIn
            });

            const response = await fetch(tokenEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: body.toString()
            });

            if (!response.ok) {
                throw new Error('Failed to exchange code for tokens');
            }

            const data = await response.json();
            return {
                accessToken: data.access_token,
                idToken: data.id_token,
                refreshToken: data.refresh_token,
                expiresIn: data.expires_in,
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('Error getting tokens from code:', error);
            throw error;
        }
    }

    /**
     * Sign up with email and password
     * @param {string} email - User email
     * @param {string} password - User password
     * @param {string} name - User full name
     */
    async signUpWithEmail(email, password, name = '') {
        try {
            const signUpParams = {
                username: email,
                password: password,
                attributes: {
                    email: email,
                    name: name || email.split('@')[0]
                }
            };

            const result = await Auth.signUp(signUpParams);

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
     * Confirm user account with verification code
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
     * Sign in with email and password
     * @param {string} email - User email
     * @param {string} password - User password
     */
    async signInWithEmail(email, password) {
        try {
            const signInParams = {
                username: email,
                password: password
            };

            const user = await Auth.signIn(signInParams);

            if (user.challengeName === 'NEW_PASSWORD_REQUIRED') {
                return {
                    success: false,
                    message: 'New password required',
                    challengeName: 'NEW_PASSWORD_REQUIRED',
                    user: user
                };
            }

            // Get tokens
            const tokens = await this.getUserTokens(user);

            if (tokens) {
                this.tokens = tokens;
                this.isAuthenticated = true;
                this.user = this.extractUserFromToken(tokens.idToken);
                this.storeTokens(tokens);
                document.dispatchEvent(new Event('authStateChanged'));

                return {
                    success: true,
                    message: 'Login successful!',
                    user: this.user
                };
            }
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
            const signInUser = await Auth.completeNewPassword(user, newPassword);

            const tokens = await this.getUserTokens(signInUser);

            if (tokens) {
                this.tokens = tokens;
                this.isAuthenticated = true;
                this.user = this.extractUserFromToken(tokens.idToken);
                this.storeTokens(tokens);
                document.dispatchEvent(new Event('authStateChanged'));

                return {
                    success: true,
                    message: 'Password updated and logged in!',
                    user: this.user
                };
            }
        } catch (error) {
            console.error('Complete new password error:', error);
            return {
                success: false,
                message: this.getErrorMessage(error)
            };
        }
    }

    /**
     * Request forgot password
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
     * Confirm new password with reset code
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
     * Get user tokens from authenticated user
     */
    async getUserTokens(user) {
        try {
            const session = user.getSignInUserSession();
            if (session && session.isValid()) {
                return {
                    accessToken: session.getAccessToken().getJwtToken(),
                    idToken: session.getIdToken().getJwtToken(),
                    refreshToken: session.getRefreshToken().getToken(),
                    expiresIn: session.getAccessToken().getExpiration(),
                    timestamp: Date.now()
                };
            }
        } catch (error) {
            console.error('Error getting user tokens:', error);
        }
        return null;
    }

    /**
     * Initiate Google OAuth login
     * Redirects user to Cognito Hosted UI with Google as provider
     */
    loginWithGoogle() {
        try {
            const cognitoDomain = awsConfig.oauth.domain;
            const clientId = awsConfig.userPoolWebClientId;
            const redirectUri = encodeURIComponent(awsConfig.oauth.redirectSignIn);
            const scope = encodeURIComponent(awsConfig.oauth.scope.join(' '));

            const loginUrl = `https://${cognitoDomain}/oauth2/authorize?` +
                `client_id=${clientId}&` +
                `response_type=code&` +
                `scope=${scope}&` +
                `redirect_uri=${redirectUri}&` +
                `identity_provider=Google`;

            // Redirect to Cognito login
            window.location.href = loginUrl;
        } catch (error) {
            console.error('Error initiating Google login:', error);
            this.showError('Failed to initiate login. Please check your configuration.');
        }
    }

    /**
     * Logout user and clear tokens
     */
    async logout() {
        try {
            await Auth.signOut();
            this.clearStoredTokens();
            this.isAuthenticated = false;
            this.user = null;
            this.tokens = null;

            document.dispatchEvent(new Event('authStateChanged'));

            // Optionally redirect to Cognito logout for full session cleanup
            // const cognitoDomain = awsConfig.oauth.domain;
            // const clientId = awsConfig.userPoolWebClientId;
            // const logoutUri = encodeURIComponent(awsConfig.oauth.redirectSignOut);
            // const logoutUrl = `https://${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${logoutUri}`;
            // window.location.href = logoutUrl;
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
     * Extract user information from ID token
     * Decodes JWT without verification (verification happens server-side)
     */
    extractUserFromToken(idToken) {
        try {
            const parts = idToken.split('.');
            if (parts.length !== 3) {
                throw new Error('Invalid token format');
            }

            // Decode payload (second part of JWT)
            const decodedPayload = atob(parts[1]);
            const payload = JSON.parse(decodedPayload);

            return {
                email: payload.email,
                name: payload.name || payload.email_verified === true ? payload.email : 'User',
                picture: payload.picture,
                sub: payload.sub,  // Subject (unique user ID)
                emailVerified: payload.email_verified
            };
        } catch (error) {
            console.error('Error extracting user from token:', error);
            return null;
        }
    }

    /**
     * Check if tokens are still valid
     */
    areTokensValid(tokens) {
        if (!tokens || !tokens.expiresIn || !tokens.timestamp) {
            return false;
        }

        const expirationTime = tokens.timestamp + (tokens.expiresIn * 1000);
        const currentTime = Date.now();
        const bufferTime = 5 * 60 * 1000; // 5 minute buffer

        return currentTime < (expirationTime - bufferTime);
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
     * Get error message from Cognito error
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
            'PasswordResetRequiredException': 'Password reset is required.'
        };

        if (error.code && errorMessages[error.code]) {
            return errorMessages[error.code];
        }

        return error.message || 'An error occurred. Please try again.';
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

// Initialize global auth manager
const authManager = new AuthManager();
