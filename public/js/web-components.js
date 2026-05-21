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
  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  render() {
    const currentLang = typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'en';
    const t = typeof t === 'function' ? window.t : (key) => key;

    this.innerHTML = `
      <header class="taucho-header" data-component="header">
        <div class="header-container">
          <div class="logo-section">
            <a href="/" class="logo">TauchoPortal</a>
          </div>

          <nav class="header-nav">
            <ul>
              <li><a href="/dashboard">${t('nav.dashboard', currentLang)}</a></li>
              <li><a href="/streams">${t('nav.streams', currentLang)}</a></li>
              <li><a href="/settings">${t('nav.settings', currentLang)}</a></li>
            </ul>
          </nav>

          <div class="header-controls">
            <select id="language-selector" class="language-selector">
              <option value="en">🇬🇧 English</option>
              <option value="ja">🇯🇵 日本語</option>
              <option value="de">🇩🇪 Deutsch</option>
              <option value="fr">🇫🇷 Français</option>
              <option value="es">🇪🇸 Español</option>
            </select>

            <button class="user-menu-btn" id="userMenuBtn">
              <span>${t('nav.logout', currentLang)}</span>
              <span class="user-avatar">👤</span>
            </button>

            <div id="userMenu" class="user-menu" style="display: none;">
              <a href="/profile">${t('nav.profile', currentLang)}</a>
              <a href="/account-settings">${t('nav.accountSettings', currentLang)}</a>
              <hr>
              <a href="/logout" id="logoutBtn">${t('nav.logout', currentLang)}</a>
            </div>
          </div>
        </div>

        <style>
          :host {
            display: block;
          }

          .taucho-header {
            background-color: #1a1a1a;
            color: white;
            padding: 1rem 0;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            position: sticky;
            top: 0;
            z-index: 100;
          }

          .header-container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 0 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 2rem;
          }

          .logo-section {
            flex-shrink: 0;
          }

          .logo {
            font-size: 1.5rem;
            font-weight: bold;
            color: white;
            text-decoration: none;
          }

          .logo:hover {
            color: #4CAF50;
          }

          .header-nav {
            flex: 1;
          }

          .header-nav ul {
            list-style: none;
            display: flex;
            gap: 2rem;
            margin: 0;
            padding: 0;
          }

          .header-nav a {
            color: #ccc;
            text-decoration: none;
            transition: color 0.3s;
          }

          .header-nav a:hover {
            color: white;
            border-bottom: 2px solid #4CAF50;
          }

          .header-controls {
            display: flex;
            gap: 1rem;
            align-items: center;
            position: relative;
          }

          .language-selector {
            padding: 0.5rem 0.75rem;
            border-radius: 4px;
            border: 1px solid #444;
            background-color: #2a2a2a;
            color: white;
            cursor: pointer;
          }

          .user-menu-btn {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            background: none;
            border: 1px solid #444;
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 4px;
            cursor: pointer;
          }

          .user-menu-btn:hover {
            border-color: #4CAF50;
          }

          .user-avatar {
            font-size: 1.2rem;
          }

          .user-menu {
            position: absolute;
            top: 100%;
            right: 0;
            background: #2a2a2a;
            border: 1px solid #444;
            border-radius: 4px;
            min-width: 200px;
            margin-top: 0.5rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
          }

          .user-menu a {
            display: block;
            padding: 0.75rem 1rem;
            color: #ccc;
            text-decoration: none;
            transition: all 0.3s;
          }

          .user-menu a:hover {
            background-color: #333;
            color: white;
          }

          .user-menu hr {
            margin: 0.5rem 0;
            border: none;
            border-top: 1px solid #444;
          }

          @media (max-width: 768px) {
            .header-container {
              flex-wrap: wrap;
              gap: 1rem;
            }

            .header-nav ul {
              gap: 1rem;
              font-size: 0.9rem;
            }
          }
        </style>
      </header>
    `;
  }

  setupEventListeners() {
    const userMenuBtn = this.querySelector('#userMenuBtn');
    const userMenu = this.querySelector('#userMenu');
    const langSelector = this.querySelector('#language-selector');

    if (userMenuBtn && userMenu) {
      userMenuBtn.addEventListener('click', () => {
        userMenu.style.display = userMenu.style.display === 'none' ? 'block' : 'none';
      });

      document.addEventListener('click', (e) => {
        if (!userMenu.contains(e.target) && !userMenuBtn.contains(e.target)) {
          userMenu.style.display = 'none';
        }
      });
    }

    if (langSelector && typeof setLanguage === 'function') {
      langSelector.value = typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'en';
      langSelector.addEventListener('change', (e) => {
        setLanguage(e.target.value);
      });
    }

    // Re-render when language changes
    window.addEventListener('languageChanged', () => {
      this.render();
      this.setupEventListeners();
    });
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
