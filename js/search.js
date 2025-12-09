/*
    Resumen: cómo funciona la búsqueda

    - Se carga un índice preconstruido (`js/search/search-index.json`) con las claves
        que apuntan a los textos traducidos de cada sección de cada página.
    - La página actual se indexa dinámicamente (h2, h3, h4, p, li, span) para
        proporcionar resultados instantáneos locales.
    - Las búsquedas se normalizan (minúsculas, sin acentos) para mejorar coincidencias.
    - Se muestran sugerencias en un desplegable con fragmentos (snippets) y enlaces
        hacia la sección correspondiente (local o en otras páginas).
    - Al cambiar el idioma se reindexa la página y se actualizan las traducciones.
*/
class Search {
    constructor() {
        this.searchInput = null;
        this.searchIndex = null;
        this.translations = {};
        this.currentPageContent = [];
        this.init();
    }

    async init() {
        try {
            await this.loadSearchIndex();
            // Con `defer` en los scripts, `window.i18n` ya está inicializado aquí.
            this.translations = window.i18n.translations;
            this.setupSearch();
            this.setupLanguageListener();
        } catch (error) {
            console.error('Search init error:', error);
        }
    }

    setupLanguageListener() {
        // Escucha el cambio de idioma (disparado por el módulo i18n)
        // Al cambiar el idioma re-indexamos la página y re-ejecutamos la búsqueda actual.
        window.addEventListener('languageChanged', async () => {
            this.translations = window.i18n.translations;
            this.indexCurrentPage();
            if (this.searchInput?.value.trim()) {
                this.search();
            }
        });
    }

    async loadSearchIndex() {
        // Carga el índice de búsqueda preconstruido (JSON)
        const response = await fetch('js/search/search-index.json');
        this.searchIndex = await response.json();
    }

    setupSearch() {
        const form = document.querySelector('header > form');
        this.searchInput = form?.querySelector('input[type="search"]');
        if (!this.searchInput || !form) return;

        // Evitar que el formulario recargue la página al pulsar Enter
        form.addEventListener('submit', (e) => e.preventDefault());

        // Indexar el contenido de la página actual para búsquedas rápidas
        this.indexCurrentPage();

        // Buscar mientras el usuario escribe
        this.searchInput.addEventListener('input', () => this.search());

        // Manejo de teclado: Enter selecciona la primera sugerencia, Escape cierra
        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const firstSuggestion = document.querySelector('[data-search-suggestion]');
                if (firstSuggestion) {
                    firstSuggestion.click();
                }
            } else if (e.key === 'Escape') {
                this.hideSuggestions();
            }
        });

        // Cerrar el desplegable si se hace clic fuera del formulario de búsqueda
        document.addEventListener('click', (e) => {
            if (!e.target.closest('form[role="search"]')) {
                this.hideSuggestions();
            }
        });
    }

    indexCurrentPage() {
        const main = document.querySelector('main');
        if (!main) return;

        // Seleccionamos los elementos que queremos indexar en la página
        const elements = main.querySelectorAll('h2, h3, h4, p, li, span');

        // Guardamos id, texto original y texto normalizado (sin acentos, en minúsculas)
        this.currentPageContent = Array.from(elements).map(el => {
            let id = el.id || el.closest('section, article')?.id;
            if (!id) {
                id = 's-' + Math.random().toString(36).substr(2, 9);
                el.id = id;
            }

            return {
                id,
                text: el.textContent.trim(),
                normalizedText: this.normalize(el.textContent)
            };
        });
    }

    normalize(text) {
        // Normaliza el texto para búsquedas insensibles a mayúsculas y acentos
        return text.toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Elimina diacríticos (acentos)
            .trim();
    }

    search() {
        const query = this.normalize(this.searchInput.value);

        // Requerimos al menos 2 caracteres para iniciar búsqueda
        if (query.length < 2) {
            this.hideSuggestions();
            return;
        }

        // Resultados en la página actual (máx. 3)
        const currentResults = this.currentPageContent
            .filter(item => item.normalizedText.includes(query))
            .slice(0, 3);

        // Resultados en otras páginas usando el índice preconstruido
        const otherResults = this.searchOtherPages(query);

        this.showSuggestions(query, currentResults, otherResults);
    }

    searchOtherPages(query) {
        if (!this.searchIndex) return [];

        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const results = [];

        // Recorremos cada página del índice y buscamos coincidencias en sus secciones
        for (const [page, data] of Object.entries(this.searchIndex)) {
            if (page === currentPage) continue;

            const pageTitle = this.getText(data.title);
            const matches = [];

            for (const section of data.sections) {
                // Cada sección tiene una lista de claves (paths en el objeto de traducciones)
                const sectionMatches = [];
                for (const key of section.keys) {
                    const text = this.getText(key);
                    const normalizedText = this.normalize(text);

                    if (normalizedText.includes(query)) {
                        // Extraemos un fragmento (snippet) alrededor de la coincidencia para mostrar contexto
                        const matchIndex = normalizedText.indexOf(query);
                        const start = Math.max(0, matchIndex - 20);
                        const end = Math.min(text.length, matchIndex + query.length + 40);

                        let snippet = text.substring(start, end);
                        if (start > 0) snippet = '...' + snippet;
                        if (end < text.length) snippet = snippet + '...';

                        sectionMatches.push({
                            text: snippet,
                            context: this.getText(section.title),
                            id: section.id
                        });
                    }
                }
                matches.push(...sectionMatches);
            }

            if (matches.length > 0) {
                results.push({ page, title: pageTitle, matches: matches.slice(0, 4) });
            }
        }

        return results;
    }

    getText(key) {
        // Dada una clave en formato "a.b.c", navega en this.translations y devuelve la cadena
        const parts = key.split('.');
        let value = this.translations;
        for (const part of parts) {
            value = value?.[part];
            if (!value) return '';
        }
        return String(value);
    }

    showSuggestions(query, currentResults, otherResults) {
        this.hideSuggestions();

        // Si no hay resultados en ningún sitio, mostramos un mensaje de "no hay resultados"
        if (currentResults.length === 0 && otherResults.length === 0) {
            const dropdown = document.createElement('aside');
            dropdown.setAttribute('data-search-suggestions', '');
            dropdown.setAttribute('aria-live', 'polite');
            dropdown.innerHTML = `<p data-no-results>${this.getText('search.noResults')}</p>`;
            this.searchInput.closest('form').appendChild(dropdown);
            return;
        }

        const dropdown = document.createElement('aside');
        dropdown.setAttribute('data-search-suggestions', '');
        dropdown.setAttribute('aria-live', 'polite');

        let html = '';

        // Resultados de la página actual
        currentResults.forEach(item => {
            html += `<a href="#${item.id}" data-search-suggestion>
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                    <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <span>${item.text.substring(0, 60)}${item.text.length > 60 ? '...' : ''}</span>
                <small>${this.getText('search.currentPage')}</small>
            </a>`;
        });

        // Resultados de otras páginas (con contexto)
        otherResults.forEach(page => {
            page.matches.forEach(match => {
                html += `<a href="${page.page}#${match.id}" data-search-suggestion>
                    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                        <path fill="currentColor" d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                    </svg>
                    <span><strong>${match.context}:</strong> ${match.text}</span>
                    <small>${page.title}</small>
                </a>`;
            });
        });

        dropdown.innerHTML = html;
        this.searchInput.closest('form').appendChild(dropdown);

        // Manejar clicks en las sugerencias: si es ancla local, hacemos scroll suave y destacamos
        dropdown.querySelectorAll('[data-search-suggestion]').forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                if (href.startsWith('#')) {
                    e.preventDefault();
                    const element = document.getElementById(href.substring(1));
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        element.setAttribute('data-search-focus', '');
                        setTimeout(() => element.removeAttribute('data-search-focus'), 2000);
                    }
                }
                this.hideSuggestions();
            });
        });
    }

    hideSuggestions() {
        // Elimina el desplegable de sugerencias si existe
        document.querySelector('[data-search-suggestions]')?.remove();
    }
}

new Search();