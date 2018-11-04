/* Object definitions */
class SunTimeAPI {
    constructor(location) {
        this.endoint = 'https://api.sunrise-sunset.org/json';
        this.fetching = false;
        this.location = location
    }

    updateSunTimes(relativeFetchDate) {
        let promise = this.startFetch(relativeFetchDate);
        this.processPromise(promise)
    }

    startFetch(relativeFetchDate) {
        console.log(`fetching: ${this.endoint}
        ?lat=${this.location.latitude}
        &lng=${this.location.longitude}
        &formatted=0
        &date=${relativeFetchDate}`
        );
        this.fetching = true;
        return fetch(`${this.endoint}?lat=${this.location.latitude}&lng=${this.location.longitude}&formatted=0&date=${relativeFetchDate}`)
    }

    processPromise(promise) {
        let that = this;
        promise.then(that.processResponse.bind(that))
        .catch((err) => { console.log('Fetch Error :-S', err); })
        .finally(() => { that.fetching = false });
    }

    processResponse(response) {
        SunTimeAPI.requireOkFrom(response);
        response.json().then(this.location.receiveSunTimes.bind(this.location))
    }

    static requireOkFrom(response) {
        if (response.status !== 200) {
            console.log('Looks like there was a problem. Status Code: ' + response.status);
            throw response.status;
        }
    }
}

class Location {

    constructor(city, latitude, longitude, timeZoneOffset) {
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
        this.suntimeAPI = new SunTimeAPI(this);
    }

    get dayTimeProgression() {
        return (((new Date() - this.sunrise) / 1000) / (this.dayLength)) * 100;
    }

    set time(date) {
        let minute = Location.forceTwoDigits(date.getMinutes());
        let second = Location.forceTwoDigits(date.getSeconds());

        if(!this.currentTime || (this.inFirstSecondsOfNewDay() && !this.suntimeAPI.fetching)) {
            this.updateSunTimes();
        }

        this.currentTime = {
            hour: (date.getUTCHours() + this.timeZoneOffset) % 24,
            minute: minute,
            second: second
        };
    }

    inFirstSecondsOfNewDay() {
        return this.currentTime.hour === 0
            && this.currentTime.minute === 0
            && this.currentTime.second < 5;
    }

    static forceTwoDigits(i) {
        return (i < 10) ? '0' + i : i;
    }

    updateSunTimes() {
        const relativeFetchDate = this.decideOnFetchDate();
        this.suntimeAPI.updateSunTimes(relativeFetchDate)
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

    receiveSunTimes(data) {
        const sunTimes = data.results;
        this.sunrise = new Date(sunTimes['sunrise']);
        this.sunset = new Date(sunTimes['sunset']);
        this.twilightBegin = new Date(sunTimes['civil_twilight_begin']);
        this.twilightEnd = new Date(sunTimes['civil_twilight_end']);
        this.dayLength = sunTimes['day_length'];
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
        }
    }

    updateLocalTimes(date) {
        for (const half of this) {
            half.location.time = date;
            half.updateTimeDisplay()
        }
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

class Countdown {
    constructor(startDate, endDate) {
        this.startTimeStamp = startDate.getTime();
        this.endTimeStamp = endDate.getTime();
        this.totalDistance = this.endTimeStamp - this.startTimeStamp;
        this.progresBar = document.getElementById('progress');
        this.countdownDisplay = document.getElementById('countdown');
    }

    update(date) {
        const now = date.getTime();
        const distance = this.endTimeStamp - now;
        let countdownText;
        let progress = 0;
        if (distance <= 0) {
            // Countdown over.
            clearInterval(heartbeat);
            countdownText = '<div class="alert alert-success" role="alert">yaaay :D!</div>';
            progress = 100
        } else {
            progress = ((this.totalDistance - distance) / this.totalDistance) * 100;
            const {days, hours, minutes, seconds} = Countdown.calculateTimeParts(distance);
            countdownText = `${days}d ${hours}h ${minutes}m ${seconds}s`;
        }
        this.progresBar.style.width = `${progress}%`;
        this.countdownDisplay.innerHTML = countdownText;
    }

    static calculateTimeParts(distance) {
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        return {days, hours, minutes, seconds};
    }
}

/* Globals */
const startDate = new Date(Date.UTC(2017, 13, 12, 12, 0));
const endDate = new Date(Date.UTC(2018, 11, 24, 0, 0));
let countdown = new Countdown(startDate, endDate);
const DAYTIME_GRADIENTS = {
    dawn: new Gradient('#63adf7', '#ffb539'),
    dusk: new Gradient('#485661', '#ff822b'),
    night: new Gradient('#0a1722', '#415a84'),
    day: new Gradient('#86d4f7', '#55a7ff')
};

let heartbeat;
let halted = false;
// for woeid goto https://developer.yahoo.com/weather/ and use the sample api:
// select woeid from geo.places(1) where text="north pole"
let nordpol = new Location('nordpol', 80, 10, 0);
let erlangen = new Location('erlangen', 49.59099, 11.00783, 1);
let halves = new Halves(
    new Half(erlangen, 'upperHalf'),
    new Half(nordpol, 'lowerHalf')
);

/* Functions */

window.onload = function () {
    console.log("Available commands:\nhalt() stops periodic updates.\nresume() enables periodic updates.");
    heartbeat = startHeartbeat();
};

function startHeartbeat() {

    heartbeat = setInterval(function () {

        let date = new Date();
        countdown.update(date);
        halves.updateLocalTimes(date);
        halves.updateDaytimeBasedVisuals(date);

    }, 1000);
    halted = false;
    return heartbeat;
}

// noinspection JSUnusedGlobalSymbols
function halt() {
    if (!halted) {
        clearInterval(heartbeat);
        halted = true;
    } else {
        console.log("Already HALTED...")
    }
}

// noinspection JSUnusedGlobalSymbols
function resume() {
    if (!halted) {
        console.log("Already RUNNING...")
    } else {
        heartbeat = startHeartbeat();
    }

}