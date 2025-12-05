class I18n {
    constructor() {
        this.currentLang = localStorage.getItem('language') || 'es';
        this.translations = {};
        this.ready = this.init();
    }

    async init() {
        await this.loadTranslations(this.currentLang);

        this.updateHtmlLang();
        this.updatePageContent();
        this.setupLanguageSwitchers();
    }

    async loadTranslations(lang) {
        try {
            const response = await fetch(`js/i18n/${lang}.json`);
            this.translations = await response.json();
            this.currentLang = lang;
        } catch (error) {
            console.error(`Error loading translations for ${lang}:`, error);
            if (lang !== 'es') {
                await this.loadTranslations('es');
            }
        }
    }

    async switchLanguage(lang) {
        if (lang !== this.currentLang) {
            this.currentLang = lang;
            this.updateHtmlLang();

            await this.loadTranslations(lang);
            localStorage.setItem('language', lang);
            this.updatePageContent();
            this.updateActiveLanguageButton();

            window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
        }
    }

    updateHtmlLang() {
        document.documentElement.lang = this.currentLang;
    }

    getTranslation(key) {
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

        return value;
    }

    updatePageContent() {
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.getTranslation(key);
            if (translation && translation !== key) {
                element.textContent = translation;
            }
        });

        // Update all elements with data-i18n-placeholder attribute
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            const translation = this.getTranslation(key);
            if (translation && translation !== key) {
                element.placeholder = translation;
            }
        });

        this.updateMetaTags();

        this.updateTitle();

        document.querySelectorAll('[data-i18n-aria]').forEach(element => {
            const key = element.getAttribute('data-i18n-aria');
            const translation = this.getTranslation(key);
            if (translation && translation !== key) {
                element.setAttribute('aria-label', translation);
            }
        });
    }

    updateMetaTags() {
        const descriptionMeta = document.querySelector('meta[name="description"]');
        if (descriptionMeta) {
            const page = this.detectCurrentPage();
            const key = `${page}.metaDescription`;
            const translation = this.getTranslation(key);
            if (translation && translation !== key) {
                descriptionMeta.setAttribute('content', translation);
            }
        }
    }

    updateTitle() {
        const page = this.detectCurrentPage();
        const key = `${page}.title`;
        const translation = this.getTranslation(key);
        if (translation && translation !== key) {
            document.title = translation;
        }
    }

    detectCurrentPage() {
        const path = window.location.pathname;
        const filename = path.split('/').pop();

        if (filename === 'sobre-mi.html') return 'aboutMe';
        if (filename === 'aficiones.html') return 'hobbies';
        if (filename === 'proyectos.html') return 'projects';
        if (filename === 'ayuda.html') return 'help';
        return 'index';
    }

    setupLanguageSwitchers() {
        const languageSelect = document.querySelector('select[name="language"]');
        if (languageSelect) {
            // Set the current language in the select
            languageSelect.value = this.currentLang;

            // Listen for changes
            languageSelect.addEventListener('change', (e) => {
                const lang = e.target.value;
                this.switchLanguage(lang);
            });
        }
    }

    updateActiveLanguageButton() {
        const languageSelect = document.querySelector('select[name="language"]');
        if (languageSelect) {
            languageSelect.value = this.currentLang;
        }
    }

    getCurrentLanguage() {
        return this.currentLang;
    }

    getTranslationForKey(key) {
        return this.getTranslation(key);
    }
}

window.i18n = new I18n();
