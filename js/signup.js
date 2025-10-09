// UKX Signup Page Logic (Figma Design)

document.addEventListener('DOMContentLoaded', function() {
    console.log('UKX Signup Page initialized (Figma Design)');

    // Initialize signup form
    initializeSignupForm();

    // Initialize signin link
    initializeSigninLink();
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
            console.log('User data:', { firstName, lastName, email });
            
            alert('Registration successful! Welcome to UKX.');
            window.location.href = '/pages/dashboard.html';
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
            window.location.href = '/pages/login.html';
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
