
class Clock {
    constructor() {
        this.init();
    }

    isFirefox() {
        return navigator.userAgent.toLowerCase().includes('firefox');
    }

    updateClock() {
        let timeString;

        if (this.isFirefox() && typeof Temporal !== 'undefined' && Temporal.Now) {
            timeString = Temporal.Now.plainTimeISO().toString({ smallestUnit: 'second' });
        } else {
            timeString = new Date().toLocaleTimeString(navigator.language, { hour12: false, timeStyle: "medium" });
        }

        const footer = document.querySelector('footer');
        let clockElem = footer.querySelector('p[data-time="true"]');

        if (!clockElem) {
            clockElem = document.createElement('p');
            clockElem.dataset.time = 'true';
            footer.appendChild(clockElem);
        }

        const label = window.i18n.getTranslation('footer.time');
        const fullTimeString = `${label} ${timeString}`;

        if (clockElem.textContent !== fullTimeString) {
            clockElem.textContent = fullTimeString;
        }
    }

    addLastModified() {
        const footer = document.querySelector('footer');
        const lastModifiedElem = document.createElement('p');
        const lastModified = new Date(document.lastModified);
        // Usar toLocaleDateString para dd/mm/aaaa
        const formattedDate = lastModified.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        // Store the date so we can update the label when language changes
        lastModifiedElem.dataset.date = formattedDate;
        lastModifiedElem.dataset.lastModified = 'true';

        // Get translation from i18n
        const label = window.i18n.getTranslation('footer.lastUpdate');
        lastModifiedElem.textContent = `${label} ${formattedDate}`;
        footer.appendChild(lastModifiedElem);
    }

    updateLastModifiedLabel() {
        const lastModifiedElem = document.querySelector('p[data-last-modified="true"]');
        if (lastModifiedElem) {
            const date = lastModifiedElem.dataset.date;
            const label = window.i18n.getTranslation('footer.lastUpdate');
            lastModifiedElem.textContent = `${label} ${date}`;
        }
    }

    async init() {
        // Esperar a que i18n esté completamente cargado
        await window.i18n.ready;

        // With defer, DOM and i18n are ready when this executes
        this.addLastModified();
        this.updateClock();
        setInterval(() => this.updateClock(), 1000);

        // Listen for language changes
        window.addEventListener('languageChanged', () => {
            this.updateLastModifiedLabel();
            this.updateClock(); // Actualizar también la etiqueta del reloj
        });
    }
}

new Clock();