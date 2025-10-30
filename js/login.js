// UKX Login Page Logic (Figma Design)

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
function initializeLoginForm() {
    const loginForm = document.getElementById('loginForm');

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

            // For MVP, just redirect to dashboard (no real authentication)
            console.log('Login successful (simulated)');
            window.location.href = './dashboard.html';
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