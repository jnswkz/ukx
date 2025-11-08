import {
    startMockOAuthFlow,
    findOAuthUserByEmail,
    upsertOAuthUser,
    OAUTH_ERROR_CODES
} from "../modules/auth/mockOAuth.js";

const DASHBOARD_URL = './dashboard.html';
const OAUTH_SESSION_KEY = 'oauthSession';

document.addEventListener('DOMContentLoaded', function() {
    console.log('UKX Signup Page initialized (Figma Design)');

    // Initialize signup form
    initializeSignupForm();

    // Initialize signin link
    initializeSigninLink();

    // Initialize social signup buttons
    initializeSocialSignup();
});

/**
 * Initialize signup form submission
 */
function initializeSignupForm() {
    const signupForm = document.getElementById('signupForm');

    if (signupForm) {
        signupForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const firstName = document.getElementById('firstName').value.trim();
            const lastName = document.getElementById('lastName').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value.trim();
            const confirmPassword = document.getElementById('confirmPassword').value.trim();

            // Basic validation
            if (!firstName) {
                alert('Please enter your first name.');
                return;
            }

            if (!lastName) {
                alert('Please enter your last name.');
                return;
            }

            if (!email) {
                alert('Please enter your email address.');
                return;
            }

            if (!isValidEmail(email)) {
                alert('Please enter a valid email address.');
                return;
            }

            if (!password) {
                alert('Please enter a password.');
                return;
            }

            if (password.length < 6) {
                alert('Password must be at least 6 characters long.');
                return;
            }

            if (!confirmPassword) {
                alert('Please confirm your password.');
                return;
            }

            if (password !== confirmPassword) {
                alert('Passwords do not match. Please try again.');
                return;
            }

            // For MVP, just redirect to dashboard (no real registration)
            console.log('Signup successful (simulated)');
            // console.log('User data:', { firstName, lastName, email });
            const userData = {
                firstName: firstName,
                lastName: lastName,
                email: email
            };
            persistUserSession(userData);

            alert('Registration successful! Welcome to UKX.');
            window.location.href = DASHBOARD_URL;
        });
    }
}

/**
 * Initialize signin link
 */
function initializeSigninLink() {
    const signinLink = document.getElementById('signinLink');

    if (signinLink) {
        signinLink.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Sign in link clicked');
            window.location.href = './login.html';
        });
    }
}

/**
 * Simple email validation
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Initialize social signup buttons
 */
function initializeSocialSignup() {
    const facebookSignupBtn = document.getElementById('facebookSignupBtn');
    const googleSignupBtn = document.getElementById('googleSignupBtn');

    if (facebookSignupBtn) {
        facebookSignupBtn.addEventListener('click', function(e) {
            e.preventDefault();
            handleOAuthSignup('facebook');
        });
    }

    if (googleSignupBtn) {
        googleSignupBtn.addEventListener('click', function(e) {
            e.preventDefault();
            handleOAuthSignup('google');
        });
    }
}

async function handleOAuthSignup(providerKey) {
    try {
        const { provider, profile, session } = await startMockOAuthFlow(providerKey, { action: 'signup' });
        const existing = findOAuthUserByEmail(profile.email, provider.key);
        const savedProfile = upsertOAuthUser({
            ...(existing || {}),
            ...profile,
            lastLoginAt: new Date().toISOString()
        });

        persistUserSession(savedProfile, session);

        const message = existing
            ? `${provider.label} account already exists. Signing you in.`
            : `${provider.label} signup successful!`;

        alert(`${message} Redirecting to your dashboard...`);
        window.location.href = DASHBOARD_URL;
    } catch (error) {
        handleOAuthError(error);
    }
}

function persistUserSession(userData, session) {
    window.localStorage.setItem('isLoggedIn', 'true');
    window.localStorage.setItem('userData', JSON.stringify(userData));

    if (session) {
        window.localStorage.setItem(OAUTH_SESSION_KEY, JSON.stringify(session));
    } else {
        window.localStorage.removeItem(OAUTH_SESSION_KEY);
    }
}

function handleOAuthError(error) {
    if (!error) {
        return;
    }

    if (error.code === OAUTH_ERROR_CODES.CANCELLED) {
        console.info(error.message);
        return;
    }

    alert(error.message || 'Unable to complete OAuth signup right now. Please try again.');
    console.error('[signup] OAuth error:', error);
}
