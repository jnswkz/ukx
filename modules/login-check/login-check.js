if (localStorage.getItem('isLoggedIn') !== 'true') {
    alert('You must be logged in to access this page.');
    window.location.href = '/pages/login.html';
}
else {
    if (window.location.pathname.endsWith('index.html')){
        window.location.href = '/pages/dashboard.html';
    }
}