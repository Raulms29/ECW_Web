
function isFirefox() {
    return navigator.userAgent.toLowerCase().includes('firefox');
}

function updateClock() {
    let timeString;

    if (isFirefox() && typeof Temporal !== 'undefined' && Temporal.Now) {
        timeString = Temporal.Now.plainTimeISO().toString({ smallestUnit: 'second' });
    } else {
        timeString = new Date().toLocaleTimeString(navigator.language, { hour12: false, timeStyle: "medium" });
    }

    const $footer = $('footer');
    let $paragraphs = $footer.find('p');
    let $clockElem;

    if ($paragraphs.length < 2) {
        $clockElem = $('<p></p>');
        $footer.append($clockElem);
    } else {
        $clockElem = $paragraphs.eq(1);
    }


    if ($clockElem.text() !== timeString) {
        $clockElem.text(timeString);
    }
}

setInterval(updateClock, 100);
window.addEventListener('DOMContentLoaded', updateClock);