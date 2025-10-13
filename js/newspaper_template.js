fetch('/components/navbar.html')
    .then(r => r.ok ? r.text(): Promise.reject(r.status))
    .then(html => {
        document.getElementById('nav-placeholder').innerHTML = html;
    }
).catch(err => console.warn('Could not load navbar', err));
    