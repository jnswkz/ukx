// UKX Login Page Logic (Figma Design)

import { jsonFileParser } from "../modules/json/jsonFileParser.js";

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


            if (authenticateUser(email, password, account_db)) {
                alert('Login successful!');
                console.log('Login successful');
                const user_id = account_db.find(user => user.username === email).user_id;
                const userData = getUserDataById(user_id, user_db);
                console.log('User Data:', userData);
                window.localStorage.setItem('isLoggedIn', 'true');
                window.localStorage.setItem('userData', JSON.stringify(userData));
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
            console.log('Facebook login clicked');
            // For MVP, redirect to dashboard
            alert('Facebook login - Coming soon!\nRedirecting to dashboard...');
            window.location.href = './dashboard.html';
        });
    }

    if (googleBtn) {
        googleBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Google login clicked');
            // For MVP, redirect to dashboard
            alert('Google login - Coming soon!\nRedirecting to dashboard...');
            window.location.href = './dashboard.html';
        });
    }
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

/**
 * Get user data by userID
 */
function getUserDataById(userId, db) {
    return db.find(user => user.user_id === userId) || null;
}
