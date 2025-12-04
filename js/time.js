
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
        let paragraphs = footer.querySelectorAll('p');
        let clockElem;

        if (paragraphs.length < 3) {
            clockElem = document.createElement('p');
            footer.appendChild(clockElem);
        } else {
            clockElem = paragraphs[2];
        }

        if (clockElem.textContent !== timeString) {
            clockElem.textContent = timeString;
        }
    }

    addLastModified() {
        const footer = document.querySelector('footer');
        const lastModifiedElem = document.createElement('p');
        const lastModified = new Date(document.lastModified);
        const formattedDate = lastModified.toLocaleDateString(navigator.language, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        lastModifiedElem.textContent = `Última actualización: ${formattedDate}`;
        footer.appendChild(lastModifiedElem);
    }

    init() {
        window.addEventListener('DOMContentLoaded', () => {
            this.addLastModified();
            this.updateClock();
            setInterval(() => this.updateClock(), 100);
        });
    }
}

new Clock();