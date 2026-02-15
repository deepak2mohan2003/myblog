/**
 * Page Authentication Helper
 * Shared authentication logic for all pages
 * Injects auth modal and sets up page-specific auth handling
 */

function setupPageAuthentication() {
    // Check if app is initialized
    if (!window.app || !window['authManager']) {
        console.warn('App not initialized yet. Retrying...');
        setTimeout(setupPageAuthentication, 100);
        return;
    }

    const protectedSection = document.getElementById('protected-section');
    const loginRequired = document.getElementById('login-required');
    const loginBtn = document.getElementById('login-btn');

    function updatePageAuthState() {
        if (window.app.isUserAuthenticated()) {
            if (protectedSection) protectedSection.style.display = 'block';
            if (loginRequired) loginRequired.style.display = 'none';
        } else {
            if (protectedSection) protectedSection.style.display = 'none';
            if (loginRequired) loginRequired.style.display = 'block';
        }
    }

    // Initial state update
    updatePageAuthState();

    // Listen for auth state changes
    document.addEventListener('authStateChanged', updatePageAuthState);

    // Login button handler - open auth modal instead of direct Google login
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            window.app?.showAuthModal?.();
        });
    }

    // Also update when modal opens/closes
    const originalShowAuthModal = window.app?.showAuthModal;
    if (originalShowAuthModal && window.app) {
        window.app.showAuthModal = function() {
            originalShowAuthModal.call(this);
            updatePageAuthState();
        };
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupPageAuthentication);
} else {
    setupPageAuthentication();
}

/**
 * Inject auth modal HTML into page if not already present
 */
function injectAuthModal() {
    if (document.getElementById('auth-modal')) {
        return; // Modal already exists
    }

    const modalHTML = `
        <div id="auth-modal" class="auth-modal" style="display: none;">
            <div class="auth-modal-content">
                <button class="auth-modal-close" onclick="window.app?.closeAuthModal()">&times;</button>

                <!-- Sign In Form -->
                <form id="signin-form" class="auth-form" style="display: block;">
                    <h2>Sign In</h2>
                    <div class="form-group">
                        <label for="signin-email">Email</label>
                        <input type="email" id="signin-email" required placeholder="your@email.com">
                    </div>
                    <div class="form-group">
                        <label for="signin-password">Password</label>
                        <input type="password" id="signin-password" required placeholder="Enter password">
                    </div>
                    <div id="signin-error" class="form-error"></div>
                    <button type="submit" class="btn-primary" style="width: 100%;">Sign In</button>
                    <p class="auth-toggle">Don't have an account? <a href="#" id="signup-link">Sign Up</a></p>
                    <p class="auth-toggle"><a href="#" id="forgot-password-link">Forgot Password?</a></p>

                    <div class="auth-divider">OR</div>

                    <button type="button" id="google-login-btn" class="btn-google">
                        <span>Sign In with Google</span>
                    </button>
                </form>

                <!-- Sign Up Form -->
                <form id="signup-form" class="auth-form" style="display: none;">
                    <h2>Create Account</h2>
                    <div class="form-group">
                        <label for="signup-name">Full Name</label>
                        <input type="text" id="signup-name" required placeholder="Your name">
                    </div>
                    <div class="form-group">
                        <label for="signup-email">Email</label>
                        <input type="email" id="signup-email" required placeholder="your@email.com">
                    </div>
                    <div class="form-group">
                        <label for="signup-password">Password</label>
                        <input type="password" id="signup-password" required placeholder="Min 8 chars with uppercase, lowercase, numbers, special chars">
                    </div>
                    <div class="form-group">
                        <label for="signup-confirm-password">Confirm Password</label>
                        <input type="password" id="signup-confirm-password" required placeholder="Confirm password">
                    </div>
                    <div id="signup-error" class="form-error"></div>
                    <button type="submit" class="btn-primary" style="width: 100%;">Create Account</button>
                    <p class="auth-toggle">Already have an account? <a href="#" id="signin-link">Sign In</a></p>
                </form>

                <!-- Verify Email Form -->
                <form id="verify-form" class="auth-form" style="display: none;">
                    <h2>Verify Email</h2>
                    <p id="verify-message" class="form-message">Verification code sent to your email</p>
                    <div class="form-group">
                        <label for="verify-code">Verification Code</label>
                        <input type="text" id="verify-code" required placeholder="Enter 6-digit code from email">
                    </div>
                    <div id="verify-error" class="form-error"></div>
                    <button type="submit" class="btn-primary" style="width: 100%;">Verify Email</button>
                </form>

                <!-- Forgot Password Form -->
                <form id="forgot-password-form" class="auth-form" style="display: none;">
                    <h2>Reset Password</h2>
                    <div class="form-group">
                        <label for="forgot-email">Email</label>
                        <input type="email" id="forgot-email" required placeholder="your@email.com">
                    </div>
                    <div id="forgot-error" class="form-error"></div>
                    <button type="submit" class="btn-primary" style="width: 100%;">Send Reset Code</button>
                    <p class="auth-toggle"><a href="#" id="back-to-signin">Back to Sign In</a></p>
                </form>

                <!-- Reset Password Form -->
                <form id="reset-password-form" class="auth-form" style="display: none;">
                    <h2>Create New Password</h2>
                    <p id="reset-message" class="form-message">Reset code sent to your email</p>
                    <div class="form-group">
                        <label for="reset-code">Reset Code</label>
                        <input type="text" id="reset-code" placeholder="Enter code from email (if resetting password)">
                    </div>
                    <div class="form-group">
                        <label for="new-password">New Password</label>
                        <input type="password" id="new-password" required placeholder="Min 8 chars with uppercase, lowercase, numbers, special chars">
                    </div>
                    <div class="form-group">
                        <label for="confirm-new-password">Confirm Password</label>
                        <input type="password" id="confirm-new-password" required placeholder="Confirm password">
                    </div>
                    <div id="reset-error" class="form-error"></div>
                    <button type="submit" class="btn-primary" style="width: 100%;">Reset Password</button>
                </form>
            </div>
        </div>
    `;

    // Insert modal before footer
    const footer = document.querySelector('footer');
    if (footer) {
        footer.insertAdjacentHTML('beforebegin', modalHTML);
    } else {
        // If no footer, insert before closing body tag
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
}

// Inject modal when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectAuthModal);
} else {
    injectAuthModal();
}
