// Shared bootstrap for all pages: ad gating + service worker registration.
// Loaded as a classic script in <head> so window.__ADS_ENABLED__ is set before
// the page body (and any adsbygoogle push) runs.

// Only load Google ads on the live site. Never on localhost / file:// —
// AdSense disallows ads on non-production origins (invalid-traffic risk),
// and the ad scripts can hang local page loads (endless tab spinner).
window.__ADS_ENABLED__ = location.protocol !== 'file:' &&
    !/^(localhost|127\.0\.0\.1|\[?::1\]?|0\.0\.0\.0)$/.test(location.hostname);

if (window.__ADS_ENABLED__) {
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9853366444571043';
    s.crossOrigin = 'anonymous';
    document.head.appendChild(s);
}

// Register the service worker for offline play & PWA install.
// Relative path keeps this working under a GitHub Pages project subpath.
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => {});
    });
}
