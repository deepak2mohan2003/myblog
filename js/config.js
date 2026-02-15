/**
 * AWS Cognito Configuration
 *
 * Update these values after creating your AWS Cognito resources:
 * 1. Create a User Pool in AWS Cognito Console
 * 2. Create an App Client in the User Pool
 * 3. Set up Google OAuth in Google Cloud Console
 * 4. Configure Google as an Identity Provider in Cognito
 * 5. Create or use a Cognito domain
 *
 * See Phase 1 plan for detailed AWS setup instructions.
 */

const awsConfig = {
    // AWS Region - Update with your region
    region: 'us-east-1',

    // Cognito User Pool Configuration
    // Get these values from AWS Cognito Console > User Pool > General Settings
    userPoolId: 'us-east-1_gnTklyPwk',  // Format: region_alphanumeric (e.g., us-east-1_xyz1234567)
    userPoolWebClientId: '230jtdv52dhl7hvd76d4ne5g2l',  // App Client ID from Cognito Console

    // OAuth Configuration
    oauth: {
        // Cognito Domain - Get from AWS Cognito Console > App Integration > Domain
        // Format: domain-name.auth.region.amazoncognito.com (without https://)
        domain: 'us-east-1gntklypwk.auth.us-east-1.amazoncognito.com',

        // OAuth Scopes - Define what user information to request
        scope: ['email', 'profile', 'openid'],

        // Redirect URI after successful login - Update with your Amplify URL
        // Local development: http://localhost:8080/
        // Amplify hosted: https://yourdomain.amplifyapp.com/
        redirectSignIn: 'https://main.dpn06cc44gobi.amplifyapp.com/',

        // Redirect URI after logout - Same as redirectSignIn typically
        redirectSignOut: 'https://main.dpn06cc44gobi.amplifyapp.com/',

        // OAuth Response Type - Use 'code' for Authorization Code Grant
        responseType: 'code',

        // Identity Provider - Google, Cognito, etc
        identityProvider: 'Google'  // Set to 'Google' for Google login, or omit for standard Cognito login
    }
};

/**
 * Amplify Configuration
 * Initialize AWS Amplify with Cognito User Pool settings
 * This configuration enables:
 * - Email/Password authentication through Cognito
 * - Google OAuth federation through Cognito
 * - Email verification and password reset
 */
Amplify.configure({
    Auth: {
        region: awsConfig.region,
        userPoolId: awsConfig.userPoolId,
        userPoolWebClientId: awsConfig.userPoolWebClientId,
        identityPoolId: undefined,

        // OAuth configuration for Cognito Hosted UI
        oauth: {
            domain: awsConfig.oauth.domain,
            scope: awsConfig.oauth.scope,
            redirectSignIn: awsConfig.oauth.redirectSignIn,
            redirectSignOut: awsConfig.oauth.redirectSignOut,
            responseType: awsConfig.oauth.responseType
        },

        // Password policy configuration
        passwordPolicy: {
            minLength: 8,
            requireLowercase: true,
            requireUppercase: true,
            requireNumbers: true,
            requireSpecialCharacters: true
        }
    }
});

// Export for use in other modules
window.awsConfig = awsConfig;
