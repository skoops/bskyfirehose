// Internationalization module
class I18n {
  constructor() {
    this.currentLocale = 'en';
    this.translations = {};
    this.availableLocales = [];
    this.defaultLocale = 'en';
  }

  // Initialize the i18n system
  async init() {
    await this.loadAvailableLocales();
    await this.detectLanguage();
    await this.loadTranslations(this.currentLocale);
    this.updatePageLanguage();
  }

  // Load available locales from the server
  async loadAvailableLocales() {
    try {
      const response = await fetch('/api/locales');
      this.availableLocales = await response.json();
    } catch (error) {
      console.warn('Could not load available locales, using default:', error);
      this.availableLocales = ['en'];
    }
  }

  // Detect user's preferred language
  async detectLanguage() {
    // Check URL parameter first
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get('lang');
    
    if (urlLang && this.availableLocales.includes(urlLang)) {
      this.currentLocale = urlLang;
      return;
    }

    // Check localStorage
    const savedLang = localStorage.getItem('preferredLanguage');
    if (savedLang && this.availableLocales.includes(savedLang)) {
      this.currentLocale = savedLang;
      return;
    }

    // Check browser language
    const browserLang = navigator.language.split('-')[0];
    if (browserLang && this.availableLocales.includes(browserLang)) {
      this.currentLocale = browserLang;
      return;
    }

    // Fallback to default
    this.currentLocale = this.defaultLocale;
  }

  // Load translations for a specific locale
  async loadTranslations(locale) {
    try {
      const response = await fetch(`/locales/${locale}.json`);
      if (!response.ok) {
        throw new Error(`Failed to load translations for ${locale}`);
      }
      this.translations = await response.json();
      this.currentLocale = locale;
      localStorage.setItem('preferredLanguage', locale);
    } catch (error) {
      console.error(`Failed to load translations for ${locale}:`, error);
      // Fallback to default locale
      if (locale !== this.defaultLocale) {
        await this.loadTranslations(this.defaultLocale);
      }
    }
  }

  // Get a translated string by key
  t(key, params = {}) {
    const keys = key.split('.');
    let value = this.translations;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
    }

    if (typeof value !== 'string') {
      console.warn(`Translation value is not a string: ${key}`);
      return key;
    }

    // Replace parameters in the string
    return value.replace(/\{(\w+)\}/g, (match, param) => {
      return params[param] !== undefined ? params[param] : match;
    });
  }

  // Update the page language attribute
  updatePageLanguage() {
    document.documentElement.lang = this.currentLocale;
    document.documentElement.setAttribute('data-locale', this.currentLocale);
  }

  // Change language
  async changeLanguage(locale) {
    if (!this.availableLocales.includes(locale)) {
      console.warn(`Locale ${locale} is not available`);
      return false;
    }

    await this.loadTranslations(locale);
    this.updatePageLanguage();
    this.updateAllTexts();
    this.updateLanguageSelector();
    
    // Update URL without reloading the page
    const url = new URL(window.location);
    url.searchParams.set('lang', locale);
    window.history.replaceState({}, '', url);
    
    return true;
  }

  // Update all text elements on the page
  updateAllTexts() {
    // Update elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      const translated = this.t(key);
      element.textContent = translated;
    });

    // Update elements with data-i18n-placeholder attribute
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
      const key = element.getAttribute('data-i18n-placeholder');
      const translated = this.t(key);
      element.placeholder = translated;
    });

    // Update title
    document.title = this.t('title');
  }

  // Get current locale
  getCurrentLocale() {
    return this.currentLocale;
  }

  // Get available locales
  getAvailableLocales() {
    return this.availableLocales;
  }

  // Create language selector HTML
  createLanguageSelector() {
    const selector = document.createElement('div');
    selector.className = 'language-selector';
    
    const label = document.createElement('span');
    label.textContent = '🌐 ';
    selector.appendChild(label);
    
    this.availableLocales.forEach(locale => {
      const button = document.createElement('button');
      button.className = `lang-btn ${locale === this.currentLocale ? 'active' : ''}`;
      button.textContent = this.getLocaleName(locale);
      button.setAttribute('data-locale', locale);
      button.onclick = () => this.changeLanguage(locale);
      selector.appendChild(button);
    });
    
    return selector;
  }

  // Update language selector buttons
  updateLanguageSelector() {
    const buttons = document.querySelectorAll('.lang-btn');
    buttons.forEach(button => {
      const locale = button.getAttribute('data-locale');
      if (locale === this.currentLocale) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
  }

  // Get display name for locale
  getLocaleName(locale) {
    const names = {
      'en': 'English',
      'de': 'Deutsch',
      'es': 'Español',
      'fr': 'Français',
      'it': 'Italiano',
      'pt': 'Português',
      'ru': 'Русский',
      'ja': '日本語',
      'ko': '한국어',
      'zh': '中文'
    };
    return names[locale] || locale.toUpperCase();
  }
}

// Global i18n instance
window.i18n = new I18n();
