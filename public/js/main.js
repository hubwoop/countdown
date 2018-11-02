/* Object definitions */

class Location {

    constructor(city, latitude, longitude, timeZoneOffset, whereOnEarthID) {
        this.currentTime = null;
        this.sunset = 0;
        this.sunrise = 0;
        this.twilightBegin = 0;
        this.twilightEnd = 0;
        this.city = city;
        this.latitude = latitude;
        this.longitude = longitude;
        this.timeZoneOffset = timeZoneOffset;
        this.dayLength = 0;
        this.whereOnEarthID = whereOnEarthID;
        this.termperature = null;
        this.weather = null;
        this.fetchDate = null;
    }

    get dayTimeProgression() {
        return (((new Date() - this.sunrise) / 1000) / (this.dayLength)) * 100;
    }

    updateSunTimes() {
        const relativeFetchDate = this.decideOnFetchDate();
        let that = this;
        console.log(`fetching: https://api.sunrise-sunset.org/json?lat=${this.latitude}&lng=${this.longitude}&formatted=0&date=${relativeFetchDate}`);
        fetch(`https://api.sunrise-sunset.org/json?lat=${this.latitude}&lng=${this.longitude}&formatted=0&date=${relativeFetchDate}`)
            .then(function (response) {
                if (response.status !== 200) {
                    console.log('Looks like there was a problem. Status Code: ' + response.status);
                    return;
                }
                response.json().then(function (data) {
                    that.sunrise = new Date(data.results.sunrise);
                    that.sunset = new Date(data.results.sunset);
                    that.twilightBegin = new Date(data.results.civil_twilight_begin);
                    that.twilightEnd = new Date(data.results.civil_twilight_end);
                    that.dayLength = data.results.day_length;
                    that.fetchDate = new Date();
                });
            })
            .catch(function (err) {
                console.log('Fetch Error :-S', err);
            })
    }

    decideOnFetchDate() {
        let localDate = new Date();
        if ((localDate.getUTCHours() + this.timeZoneOffset) >= 24) {
            return 'tomorrow';
        } else if ((localDate.getUTCHours() + this.timeZoneOffset) < 0) {
            return 'yesterday';
        } else {
            return 'today';
        }
    }
}

class Gradient {

    constructor(top, bottom) {
        this.top = top;
        this.bottom = bottom;
    }

}

class Halves {

    constructor(upper, lower) {
        this.upper = upper;
        this.lower = lower;
        this.lastReturend = null;
    }

    // https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Iteration_protocols
    [Symbol.iterator]() {
        return {
            next: () => {
                if (null === this.lastReturend) {
                    this.lastReturend = this.upper;
                    return {value: this.upper, done: false};
                } else if (this.upper === this.lastReturend) {
                    this.lastReturend = this.lower;
                    return {value: this.lower, done: false};
                } else {
                    this.lastReturend = null;
                    return {done: true};
                }
            }
        }
    };

    updateDaytimeBasedVisuals(date) {
        for (const half of this) {
            half.updateGradient(date);
            // fetch sunrise/sunset on new days
            const currentDay = date.getDay();
            if (!half.location.fetchDate || currentDay > half.location.fetchDate.getDay() || currentDay > half.location.sunset.getDay()) {
                half.location.updateSunTimes();
            }
        }
    }

    updateLocalTimes(date) {
        let minute = Halves.forceTwoDigits(date.getMinutes());
        let second = Halves.forceTwoDigits(date.getSeconds());
        for (const half of this) {
            half.location.currentTime = {
                hour: (date.getUTCHours() + half.location.timeZoneOffset) % 24,
                minute: minute,
                second: second
            };
            half.updateTimeDisplay()
        }
    }

    static forceTwoDigits(i) {
        return (i < 10) ? '0' + i : i;
    }
}

class Half {

    constructor(location, id) {
        this.location = location;
        this.id = id;
        this.element = document.getElementById(id);
        this.gradient = null;
        document.getElementById(`${this.id}Location`).textContent = location.city;
    }

    hasChildElementWithClass(css_class) {
        return this.element.getElementsByClassName(css_class).length > 0;
    }

    get hasSun() {
        return this.hasChildElementWithClass("sun")
    }

    get hasParticles() {
        return this.hasChildElementWithClass("particles-js-canvas-el")
    }

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/set
    set DayTime(gradient) {
        if(halves.upper.location.city === this.location.city) {
            document.body.style.setProperty(`--top-half-top-color`, gradient.top);
            document.body.style.setProperty(`--top-half-bottom-color`, gradient.bottom);
        } else {
            document.body.style.setProperty(`--bottom-half-top-color`, gradient.top);
            document.body.style.setProperty(`--bottom-half-bottom-color`, gradient.bottom);
        }
        this.gradient = gradient;
        this.toggleNightMode();
        this.toggleDayMode();
    }

    set setSunProgression(percent) {
        if (this.hasSun) {
            if (percent < 0 || percent > 100) {
                throw "Please choose a value between 0 and 100"
            }
            let seconds = ((this.location.sunrise - this.location.sunset) / 1000) * (percent / 100);
            this.element.firstChild.style.setProperty("animation-delay", `${seconds}s`);
        } else {
            throw `There is no sun on ${this.location.city}-half...`;
        }
    }

    set setSunAnimationDuration(duration) {
        if (this.hasSun) {
            this.element.firstChild.style.setProperty("animation", `sunArc ${duration}s linear infinite`);
        } else {
            throw `There is no sun on ${this.location.city}-half...`;
        }
    }

    updateTimeDisplay() {
        document.getElementById(`${this.id}Countdown`).textContent =
            `${this.location.currentTime.hour}:${this.location.currentTime.minute}:${this.location.currentTime.second}`;
    }

    toggleNightMode() {
        if (this.gradient === DAYTIME_GRADIENTS.night && !this.hasParticles) {
            particlesJS.load(this.id, 'js/assets/particles.json');
        }
        if (this.gradient !== DAYTIME_GRADIENTS.night && this.hasParticles) {
            this.element.removeChild(this.element.firstChild);
        }
    }

    toggleDayMode() {
        if (this.gradient === DAYTIME_GRADIENTS.day && !this.hasSun) {
            this.element.insertAdjacentHTML('afterbegin', '<div class="sun"></div>');
            this.setSunAnimationDuration = this.location.dayLength;
            this.setSunProgression = this.location.dayTimeProgression;
        }
        if (this.gradient !== DAYTIME_GRADIENTS.day && this.hasSun) {
            this.element.removeChild(this.element.firstChild);
        }
    }

    updateGradient(date) {
        const gradient = this.decideOnGradient(date);
        if (this.gradient !== gradient) {
            this.DayTime = gradient;
        }
    }

    decideOnGradient(date) {
        if (date >= this.location.twilightBegin && date <= this.location.twilightEnd) {
            if (date <= this.location.sunrise) {
                return DAYTIME_GRADIENTS.dawn;
            } else if (date <= this.location.sunset) {
                return DAYTIME_GRADIENTS.day;
            } else {
                return DAYTIME_GRADIENTS.dusk;
            }
        } else {
            return DAYTIME_GRADIENTS.night;
        }
    }
}

/* Globals */

const countdownDate = new Date(Date.UTC(2018, 13, 29, 18, 0)).getTime();
const totalDistance = countdownDate - new Date(Date.UTC(2018, 1, 10, 9, 30, 0)).getTime();
const DAYTIME_GRADIENTS = {
    dawn: new Gradient('#63adf7', '#ffb539'),
    dusk: new Gradient('#485661', '#ff822b'),
    night: new Gradient('#0a1722', '#415a84'),
    day: new Gradient('#86d4f7', '#55a7ff')
};
const cloudHTML = generateCloudHTML();

let heartbeat;
let halted = false;
let samui = new Location('samui', 9.560653, 100.003414, 7, 1225442);
let erlangen = new Location('erlangen', 49.59099, 11.00783, 2, 680564);
let halves = new Halves(
    new Half(erlangen, 'upperHalf'),
    new Half(samui, 'lowerHalf')
);

/* Functions */

window.onload = function () {
    console.log("Available commands:\nhalt() stops periodic updates.\nresume() enables periodic updates.");
    for (const half of halves) {
        half.location.updateSunTimes();
    }
    heartbeat = startHeartbeat();
};

function startHeartbeat() {

    heartbeat = setInterval(function () {

        let date = new Date();
        updateCountdown(date);
        halves.updateLocalTimes(date);
        halves.updateDaytimeBasedVisuals(date);

    }, 1000);
    halted = false;
    return heartbeat;
}

function updateCountdown(date) {

    const now = date.getTime();
    const distance = countdownDate - now;
    let progress = ((totalDistance - distance) / totalDistance) * 100;
    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);
    let countdownText = `${days}d ${hours}h ${minutes}m ${seconds}s`;

    if (distance <= 0) {
        // Countdown over.
        clearInterval(heartbeat);
        countdownText = '<div class="alert alert-success" role="alert">yaaay :D!</div>';
        progress = 100
    }
    document.getElementById('progress').style.width = `${progress}%`;
    document.getElementById('countdown').innerHTML = countdownText;
}

function generateCloudHTML() {
    let cloudHTML = '<div id="clouds">';
    for (let i = 1; i < 6; i++) {
        cloudHTML += `<div class="cloud x${i}"></div>`
    }
    cloudHTML += '</div>';
    return cloudHTML;
}

function halt() {
    if (!halted) {
        clearInterval(heartbeat);
        halted = true;
    } else {
        console.log("Already HALTED...")
    }
}

function resume() {
    if (!halted) {
        console.log("Already RUNNING...")
    } else {
        heartbeat = startHeartbeat();
    }

}