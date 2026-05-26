/**
 * Web Components Version - Modern Alternative
 * Use this if you prefer the more modern Web Components approach
 * 
 * Instead of:
 *   loadComponent('header');
 * 
 * You can define custom HTML elements:
 *   <taucho-header></taucho-header>
 *   <taucho-footer></taucho-footer>
 */

/**
 * Custom Header Element
 * Usage: <taucho-header></taucho-header>
 */
class TauchoHeader extends HTMLElement {
  async connectedCallback() {
    this.render('...');
    this.setupEventListeners();
    // Fetch real username and re-render once we have it
    if (typeof getUserProfile === 'function') {
      const user = await getUserProfile();
      const display = user ? (user.username || user.email?.split('@')[0] || 'Account') : 'Account';
      this.render(display);
      this.setupEventListeners();
    }
  }

  render(username) {
    const currentLang = typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'en';
    const tr = typeof window.t === 'function' ? window.t : (key) => key;

    this.innerHTML = `
      <header class="taucho-header" data-component="header">
        <div class="header-container">
          <div class="logo-section">
            <a href="/" class="logo">🌊 TauchoPortal</a>
          </div>

          <nav class="header-nav">
            <ul>
              <li><a href="/dashboard">Dashboard</a></li>
              <li><a href="/streams">My Streams</a></li>
              <li><a href="/monitors">📡 Watched Channels</a></li>
              <li><a href="/devices">🔌 My Devices</a></li>
            </ul>
          </nav>

          <div class="header-controls">
            <select id="language-selector" class="language-selector" title="Language">
              <option value="en">🇬🇧 EN</option>
              <option value="ja">🇯🇵 JA</option>
              <option value="de">🇩🇪 DE</option>
              <option value="fr">🇫🇷 FR</option>
              <option value="es">🇪🇸 ES</option>
            </select>

            <div class="user-menu-wrap">
              <button class="user-menu-btn" id="userMenuBtn">
                <span class="user-avatar">👤</span>
                <span class="user-label">${username}</span>
                <span class="caret">▾</span>
              </button>
              <div id="userMenu" class="user-menu" style="display:none">
                <a href="/profile">👤 Profile</a>
                <a href="/account-settings">⚙️ Account Settings</a>
                <hr>
                <a href="#" id="logoutBtn" class="logout-item">🚪 Sign Out</a>
              </div>
            </div>
          </div>
        </div>

        <style>
          .taucho-header {
            background: #1a1a1a;
            color: white;
            padding: 0;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            position: sticky;
            top: 0;
            z-index: 200;
          }
          .header-container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 0 1.5rem;
            height: 56px;
            display: flex;
            align-items: center;
            gap: 2rem;
          }
          .logo-section { flex-shrink: 0; }
          .logo {
            font-size: 1.15rem;
            font-weight: 700;
            color: white;
            text-decoration: none;
            white-space: nowrap;
          }
          .logo:hover { color: #4CAF50; text-decoration: none; }
          .header-nav { flex: 1; }
          .header-nav ul {
            list-style: none;
            display: flex;
            gap: 0.25rem;
            margin: 0; padding: 0;
          }
          .header-nav a {
            color: #bbb;
            text-decoration: none;
            font-size: 0.9rem;
            padding: 0.4rem 0.75rem;
            border-radius: 4px;
            transition: all 0.2s;
            display: block;
            white-space: nowrap;
          }
          .header-nav a:hover { color: white; background: rgba(255,255,255,0.08); text-decoration: none; }
          .header-nav a.active { color: white; background: rgba(76,175,80,0.2); font-weight: 600; }
          .header-controls {
            display: flex;
            gap: 0.75rem;
            align-items: center;
            flex-shrink: 0;
          }
          .language-selector {
            padding: 0.35rem 0.6rem;
            border-radius: 4px;
            border: 1px solid #444;
            background: #2a2a2a;
            color: white;
            cursor: pointer;
            font-size: 0.85rem;
          }
          .language-selector:hover { border-color: #666; }
          .user-menu-wrap { position: relative; }
          .user-menu-btn {
            display: flex;
            align-items: center;
            gap: 0.4rem;
            background: none;
            border: 1px solid #444;
            color: white;
            padding: 0.4rem 0.85rem;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.88rem;
            transition: all 0.2s;
            white-space: nowrap;
          }
          .user-menu-btn:hover { border-color: #4CAF50; background: rgba(255,255,255,0.05); }
          .user-avatar { font-size: 1rem; }
          .caret { font-size: 0.7rem; opacity: 0.6; }
          .user-menu {
            position: absolute;
            top: calc(100% + 6px);
            right: 0;
            background: #2a2a2a;
            border: 1px solid #444;
            border-radius: 6px;
            min-width: 200px;
            box-shadow: 0 6px 20px rgba(0,0,0,0.4);
            overflow: hidden;
          }
          .user-menu a {
            display: block;
            padding: 0.75rem 1rem;
            color: #ccc;
            text-decoration: none;
            font-size: 0.88rem;
            transition: all 0.2s;
          }
          .user-menu a:hover { background: #333; color: white; text-decoration: none; }
          .user-menu hr { margin: 0; border: none; border-top: 1px solid #3a3a3a; }
          .logout-item { color: #ff7070 !important; }
          .logout-item:hover { background: rgba(255,80,80,0.1) !important; color: #ff9090 !important; }
          @media (max-width: 860px) {
            .header-nav ul { gap: 0; }
            .header-nav a { padding: 0.4rem 0.5rem; font-size: 0.82rem; }
          }
          @media (max-width: 640px) {
            .header-container { height: auto; padding: 0.75rem 1rem; flex-wrap: wrap; gap: 0.75rem; }
            .header-nav { order: 3; width: 100%; }
            .header-nav ul { flex-wrap: wrap; }
          }
        </style>
      </header>
    `;
  }

  setupEventListeners() {
    // Active nav link
    const path = window.location.pathname;
    this.querySelectorAll('.header-nav a').forEach(link => {
      const href = link.getAttribute('href');
      if (href && href !== '/' && path.startsWith(href)) link.classList.add('active');
      else if (href === '/dashboard' && path === '/dashboard') link.classList.add('active');
    });

    // User menu toggle
    const btn = this.querySelector('#userMenuBtn');
    const menu = this.querySelector('#userMenu');
    if (btn && menu) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
      });
      document.addEventListener('click', () => { menu.style.display = 'none'; }, { once: false });
    }

    // Logout button — calls auth.js logout()
    const logoutBtn = this.querySelector('#logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (typeof logout === 'function') logout();
        else window.location.href = '/login';
      });
    }

    // Language selector
    const langSel = this.querySelector('#language-selector');
    if (langSel) {
      if (typeof getCurrentLanguage === 'function') langSel.value = getCurrentLanguage();
      langSel.addEventListener('change', (e) => {
        if (typeof setLanguage === 'function') setLanguage(e.target.value);
      });
      window.addEventListener('languageChanged', () => {
        if (typeof getCurrentLanguage === 'function') langSel.value = getCurrentLanguage();
      });
    }
  }
}

/**
 * Custom Footer Element
 * Usage: <taucho-footer></taucho-footer>
 */
class TauchoFooter extends HTMLElement {
  connectedCallback() {
    this.render();
  }

  render() {
    const currentLang = typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'en';
    const t = typeof t === 'function' ? window.t : (key) => key;

    this.innerHTML = `
      <footer class="taucho-footer">
        <div class="footer-container">
          <div class="footer-section">
            <h3>TauchoPortal</h3>
            <p>${t('footer.description', currentLang)}</p>
          </div>

          <div class="footer-section">
            <h4>${t('footer.quickLinks', currentLang)}</h4>
            <ul>
              <li><a href="/about">${t('footer.about', currentLang)}</a></li>
              <li><a href="/help">${t('footer.help', currentLang)}</a></li>
              <li><a href="/status">${t('footer.status', currentLang)}</a></li>
            </ul>
          </div>

          <div class="footer-section">
            <h4>${t('footer.legal', currentLang)}</h4>
            <ul>
              <li><a href="/privacy">${t('footer.privacy', currentLang)}</a></li>
              <li><a href="/terms">${t('footer.terms', currentLang)}</a></li>
            </ul>
          </div>

          <div class="footer-section">
            <h4>${t('footer.contact', currentLang)}</h4>
            <ul>
              <li><a href="mailto:support@taucho.org">support@taucho.org</a></li>
              <li><a href="https://github.com/DonTaucho/tauchoportal" target="_blank">GitHub</a></li>
            </ul>
          </div>
        </div>

        <div class="footer-bottom">
          <p>${t('footer.copyright', currentLang)}</p>
        </div>

        <style>
          :host {
            display: block;
          }

          .taucho-footer {
            background-color: #1a1a1a;
            color: #ccc;
            padding: 3rem 0 1rem;
            margin-top: 3rem;
            border-top: 1px solid #333;
          }

          .footer-container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 0 2rem;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 2rem;
            margin-bottom: 2rem;
          }

          .footer-section h3,
          .footer-section h4 {
            color: white;
            margin-bottom: 1rem;
          }

          .footer-section ul {
            list-style: none;
            padding: 0;
            margin: 0;
          }

          .footer-section a {
            color: #ccc;
            text-decoration: none;
            transition: color 0.3s;
          }

          .footer-section a:hover {
            color: white;
            border-bottom: 1px solid #4CAF50;
          }

          .footer-bottom {
            text-align: center;
            padding-top: 2rem;
            border-top: 1px solid #333;
            font-size: 0.85rem;
            color: #888;
          }
        </style>
      </footer>
    `;

    // Re-render when language changes
    window.addEventListener('languageChanged', () => {
      this.render();
    });
  }
}

// Register custom elements
customElements.define('taucho-header', TauchoHeader);
customElements.define('taucho-footer', TauchoFooter);
