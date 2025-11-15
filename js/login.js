// UKX Login Page Logic (Figma Design)

import { jsonFileParser } from "../modules/json/jsonFileParser.js";
import {
    startMockOAuthFlow,
    findOAuthUserByEmail,
    upsertOAuthUser,
    OAUTH_ERROR_CODES
} from "../modules/auth/mockOAuth.js";

document.addEventListener('DOMContentLoaded', function() {
    console.log('UKX Login Page initialized (Figma Design)');

    // Initialize login form
    initializeLoginForm();

    // Initialize social login buttons
    initializeSocialLogins();

    // Initialize signup link
    initializeSignupLink();

    // Initialize forgot password link
    initializeForgotPassword();
});

/**
 * Initialize login form submission
 */
async function initializeLoginForm() {
    const loginForm = document.getElementById('loginForm');
    const account_db = await connectDb('/data/accounts_data.json');
    const user_db = await connectDb('/data/users_data.json');

    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value.trim();

            // Basic validation
            if (!email) {
                alert('Please enter your email address.');
                return;
            }

            if (!isValidEmail(email)) {
                alert('Please enter a valid email address.');
                return;
            }

            if (!password) {
                alert('Please enter your password.');
                return;
            }

            if (authenticateAdmin (email, password)) {
                window.localStorage.setItem('adminSession', 'true');
                alert('Admin login successful! Redirecting to admin panel...');
                console.log('Admin login successful');
                window.location.href = './admin-panel.html';
                return;
            }


            if (authenticateUser(email, password, account_db)) {
                alert('Login successful!');
                console.log('Login successful');
                const user_id = account_db.find(user => user.username === email).user_id;
                const userData = getUserDataById(user_id, user_db);
                console.log('User Data:', userData);
                persistUserSession(userData);
                window.location.href = './dashboard.html';
            } else {
                alert('Invalid email or password.');
            }
        });
    }
}

/**
 * Initialize social login buttons
 */
function initializeSocialLogins() {
    const facebookBtn = document.getElementById('facebookLoginBtn');
    const googleBtn = document.getElementById('googleLoginBtn');

    if (facebookBtn) {
        facebookBtn.addEventListener('click', function(e) {
            e.preventDefault();
            handleOAuthLogin('facebook');
        });
    }

    if (googleBtn) {
        googleBtn.addEventListener('click', function(e) {
            e.preventDefault();
            handleOAuthLogin('google');
        });
    }
}

async function handleOAuthLogin(providerKey) {
    try {
        const { provider, profile, session } = await startMockOAuthFlow(providerKey, { action: 'login' });
        let storedProfile = findOAuthUserByEmail(profile.email, provider.key);

        if (!storedProfile) {
            const shouldCreate = window.confirm(
                `We couldn't find a ${provider.label} account for ${profile.email}.\n\n` +
                'Would you like to create a new UKX profile with this identity?'
            );

            if (!shouldCreate) {
                return;
            }
        }

        storedProfile = upsertOAuthUser({
            ...(storedProfile || {}),
            ...profile,
            lastLoginAt: new Date().toISOString()
        });

        persistUserSession(storedProfile, session);
        alert(`${provider.label} login successful! Redirecting to dashboard...`);
        window.location.href = './dashboard.html';
    } catch (error) {
        handleOAuthError(error);
    }
}

function persistUserSession(userData, session) {
    window.localStorage.setItem('isLoggedIn', 'true');
    window.localStorage.setItem('userData', JSON.stringify(userData));

    if (session) {
        window.localStorage.setItem('oauthSession', JSON.stringify(session));
    } else {
        window.localStorage.removeItem('oauthSession');
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

    alert(error.message || 'Unable to complete OAuth login right now. Please try again.');
    console.error('[login] OAuth error:', error);
}

/**
 * Initialize signup link
 */
function initializeSignupLink() {
    const signupLink = document.getElementById('signupLink');

    if (signupLink) {
        signupLink.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Signup clicked');
            // Redirect to signup page
            window.location.href = './signup.html';
        });
    }
}

/**
 * Initialize forgot password link
 */
function initializeForgotPassword() {
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');

    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Forgot password clicked');
            // For MVP, just show an alert
            alert('Password recovery feature coming soon!\nPlease contact support for now.');
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
 * Connect to JSON database 
 */

async function connectDb(db_path){
    const db = await jsonFileParser(db_path);
    // console.log('im here');
    console.log(typeof db); 
    return db;
}

/**
 * Authenticate Function
 */

function authenticateUser(email, password, db) {
    // console.log(typeof db)
    return db.some(user => user.username === email && user.password === password);
}

function authenticateAdmin(email, password) {
    const adminCredentials = {
        email: 'admin@ukx.com',
        password: 'admin123'
    };
    return email === adminCredentials.email && password === adminCredentials.password;
}

/**
 * Get user data by userID
 */
function getUserDataById(userId, db) {
    return db.find(user => user.user_id === userId) || null;
}
