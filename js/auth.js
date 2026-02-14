/**
 * Authentication Module
 *
 * Handles:
 * - Cognito authentication initialization
 * - Google OAuth login integration
 * - Token storage and retrieval
 * - Session management
 * - Logout functionality
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
     * Uses AWS Amplify Auth to exchange code
     */
    async exchangeCodeForTokens(code) {
        try {
            // Use Amplify's signIn with OAuth code
            // This is a simplified version - in production, you'd typically use Amplify's built-in OAuth handling
            const response = await this.getTokensFromCode(code);
            return response;
        } catch (error) {
            console.error('Error exchanging code for tokens:', error);
            throw error;
        }
    }

    /**
     * Get tokens from authorization code
     * Makes a call to Cognito token endpoint
     */
    async getTokensFromCode(code) {
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
            this.clearStoredTokens();
            this.isAuthenticated = false;
            this.user = null;
            this.tokens = null;

            // Redirect to Cognito logout endpoint
            const cognitoDomain = awsConfig.oauth.domain;
            const clientId = awsConfig.userPoolWebClientId;
            const logoutUri = encodeURIComponent(awsConfig.oauth.redirectSignOut);

            const logoutUrl = `https://${cognitoDomain}/logout?` +
                `client_id=${clientId}&` +
                `logout_uri=${logoutUri}`;

            document.dispatchEvent(new Event('authStateChanged'));
            window.location.href = logoutUrl;
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
                name: payload.name || payload.email,
                picture: payload.picture,
                sub: payload.sub  // Subject (unique user ID)
            };
        } catch (error) {
            console.error('Error extracting user from token:', error);
            return null;
        }
    }

    /**
     * Check if tokens are still valid
     * Considers token expiration time
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
     * Note: In production, consider using more secure storage
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
     * Used for API requests
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
     * Show error message to user
     */
    showError(message) {
        const errorSection = document.getElementById('error-section');
        const errorMessage = document.getElementById('error-message');

        if (errorSection && errorMessage) {
            errorMessage.textContent = message;
            errorSection.style.display = 'block';

            // Hide other sections
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
