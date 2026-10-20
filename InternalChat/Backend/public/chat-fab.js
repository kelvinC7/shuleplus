/**
 * ShuleChat Floating Button — inject into any module page.
 *
 * Add this script to any module's index.html or layout:
 *   <script src="http://localhost:3055/chat-fab.js" defer></script>
 *
 * Or import in React/Next.js:
 *   import 'http://localhost:3055/chat-fab.js';
 */
(function () {
  if (document.getElementById('shule-chat-fab')) return;

  var CHAT_URL = 'http://localhost:3054/chat';

  function getToken() {
    try {
      return (
        localStorage.getItem('accessToken') ||
        localStorage.getItem('internal_chat_module_token') ||
        ''
      );
    } catch (_) {
      return '';
    }
  }
  function getRefresh() {
    try {
      return (
        localStorage.getItem('refreshToken') ||
        localStorage.getItem('internal_chat_module_refresh_token') ||
        ''
      );
    } catch (_) {
      return '';
    }
  }

  function openChat() {
    var token = getToken();
    var refresh = getRefresh();
    var url = CHAT_URL;
    var params = [];
    if (token) params.push('token=' + encodeURIComponent(token));
    if (refresh) params.push('refresh=' + encodeURIComponent(refresh));
    if (params.length) url += '?' + params.join('&');
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function createFab() {
    var btn = document.createElement('button');
    btn.id = 'shule-chat-fab';
    btn.setAttribute('aria-label', 'Open Chat');
    btn.title = 'Open ShuleChat';
    btn.style.cssText =
      'position:fixed;bottom:24px;right:24px;z-index:99999;' +
      'width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;' +
      'background:linear-gradient(135deg,#1FA8A0,#0D7A74);' +
      'box-shadow:0 4px 14px rgba(0,0,0,0.25);' +
      'display:flex;align-items:center;justify-content:center;' +
      'transition:transform 0.2s,box-shadow 0.2s;' +
      'opacity:0;animation:chatFabIn 0.4s 0.8s forwards;';
    btn.innerHTML =
      '<svg width="26" height="26" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M32 10C24 10 18 16 18 24V34C18 42 24 48 32 48C34 48 36 47.5 38 46.5L46 52V44C50 40 52 36 52 30V22C52 14 46 8 38 8L32 10Z" fill="white" opacity="0.95"/>' +
      '<rect x="24" y="22" width="16" height="3" rx="1.5" fill="#0D7A74" opacity="0.8"/>' +
      '<rect x="24" y="28" width="12" height="3" rx="1.5" fill="#0D7A74" opacity="0.5"/>' +
      '</svg>';
    btn.addEventListener('click', openChat);
    btn.addEventListener('mouseenter', function () {
      btn.style.transform = 'scale(1.1)';
      btn.style.boxShadow = '0 6px 20px rgba(0,0,0,0.35)';
    });
    btn.addEventListener('mouseleave', function () {
      btn.style.transform = 'scale(1)';
      btn.style.boxShadow = '0 4px 14px rgba(0,0,0,0.25)';
    });
    document.body.appendChild(btn);
  }

  // Inject keyframes
  var style = document.createElement('style');
  style.textContent =
    '@keyframes chatFabIn{from{opacity:0;transform:scale(0.5)}to{opacity:1;transform:scale(1)}}';
  document.head.appendChild(style);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createFab);
  } else {
    createFab();
  }
})();
