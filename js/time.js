
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

        if (paragraphs.length < 2) {
            clockElem = document.createElement('p');
            footer.appendChild(clockElem);
        } else {
            clockElem = paragraphs[1];
        }

        if (clockElem.textContent !== timeString) {
            clockElem.textContent = timeString;
        }
    }

    init() {
        window.addEventListener('DOMContentLoaded', () => {
            this.updateClock();
            setInterval(() => this.updateClock(), 100);
        });
    }
}

new Clock();