// Melbourne
// https://api.sunrise-sunset.org/json?lat=-37.814&lng=-144.96332
// Erlangen
// https://api.sunrise-sunset.org/json?lat=49.59099&lng=11.00783

/* Object definitions */

class Location {
    constructor(city, latitude, longitude, timeZoneOffset) {
        this.sunset = 0;
        this.sunrise = 0;
        this.twilightBegin = 0;
        this.twilightEnd = 0;
        this.city = city;
        this.latitude = latitude;
        this.longitude = longitude;
        this.timeZoneOffset = timeZoneOffset;
        this.dayLength = 0;
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
}

class Half {

    constructor(location, id) {
        this.location = location;
        this.id = id;
        this.hasParticles = false;
        this.hasSun = false;
        this.element = document.getElementById(id);
        this.gradient = null;
    }

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/set
    set setCurrentDayTime(gradient) {
        document.body.style.setProperty(`--${this.location.city}-top-color`, gradient.top);
        document.body.style.setProperty(`--${this.location.city}-bottom-color`, gradient.bottom);
        this.gradient = gradient;
        this.toggleNightMode();
        this.toggleDayMode();
    }

    toggleNightMode() {
        if (this.gradient === DAYTIME_GRADIENTS.night && !this.hasParticles) {
            particlesJS.load(this.id, 'js/assets/particles.json');
            this.hasParticles = true;
        }
        if (this.gradient !== DAYTIME_GRADIENTS.night && this.hasParticles) {
            this.element.removeChild(this.element.firstChild);
            this.hasParticles = false;
        }
    }

    toggleDayMode() {
        if (this.gradient === DAYTIME_GRADIENTS.day && !this.hasSun) {
            let daySecondsAlreadyPassed = (this.location.sunrise - (new Date())) / 1000;
            this.element.insertAdjacentHTML('afterbegin',
                `<div class="sunWrapper" style="animation: sunArc ${this.location.dayLength}s linear infinite;`
                 + `animation-delay: ${daySecondsAlreadyPassed}s;"><div class="sun"></div></div>`
            );
            this.hasSun = true;
        }
        if (this.gradient !== DAYTIME_GRADIENTS.day && this.hasSun) {
            this.element.removeChild(this.element.firstChild);
            this.hasSun = false;
        }
    }
}


/* Globals */

const countdownDate = new Date(Date.UTC(2018, 7, 2, 19, 35)).getTime();
const totalDistance = countdownDate - new Date(Date.UTC(2018, 1, 10, 9, 30, 0)).getTime();

const DAYTIME_GRADIENTS = {
    dawn: new Gradient('#63adf7', '#ffb539'),
    dusk: new Gradient('#485661', '#ff822b'),
    night: new Gradient('#0a1722', '#415a84'),
    day: new Gradient('#86d4f7', '#55a7ff')
};
let ticker;
let halted = false;
let melbourne = new Location('melbourne', -37.814, 144.96332, 11);
let erlangen = new Location('erlangen', 49.59099, 11.00783, 1);
let halves = new Halves(
    new Half(erlangen, 'upperHalf', false),
    new Half(melbourne, 'lowerHalf', false)
);

/* Functions */
function updateCountdown(date) {

    const now = date.getTime();
    const distance = countdownDate - now;
    let progress = ((totalDistance - distance) / totalDistance)*100;
    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);
    let countdownText = `${days}d ${hours}h ${minutes}m ${seconds}s`;

    if (distance <= 0) {
        // Countdown over.
        clearInterval(ticker);
        countdownText = '<div class="alert alert-success" role="alert">yaaay :D!</div>';
        progress = 100
    }
    document.getElementById('progress').style.width = `${progress}%`;
    document.getElementById('countdown').innerHTML = countdownText;
}

function updateLocalTimes(date) {

    function forceTwoDigits(i) {
        return (i < 10) ? '0' + i : i;
    }

    let hourErlangen = (date.getUTCHours() + 1) % 24;
    let hourMelbourne = (date.getUTCHours() + 11) % 24;
    let minute = forceTwoDigits(date.getMinutes());
    let second = forceTwoDigits(date.getSeconds());
    document.getElementById('erlangen').innerHTML = `${hourErlangen}:${minute}:${second}`;
    document.getElementById('melbourne').innerHTML = `${hourMelbourne}:${minute}:${second}`;
}

function decideOnGradient(location, date) {
    // console.log(`${date} >= ${location.sunrise} && ${date} <= ${location.sunset}`);
    if (date >= location.twilightBegin && date <= location.twilightEnd) {
        if (date <= location.sunrise) {
            return DAYTIME_GRADIENTS.dawn;
        } else if (date <= location.sunset) {
            return DAYTIME_GRADIENTS.day;
        } else {
            return DAYTIME_GRADIENTS.dusk;
        }
    } else {
        return DAYTIME_GRADIENTS.night;
    }
}

function getSunTimes(location) {
    // Melbourne https://api.sunrise-sunset.org/json?lat=-37.814&lng=-144.96332
    // Erlangen https://api.sunrise-sunset.org/json?lat=49.59099&lng=11.00783

    function decideOnFetchDate() {
        let localDate = new Date();
        if ((localDate.getUTCHours() + location.timeZoneOffset) >= 24) {
            return 'tomorrow';
        } else if ((localDate.getUTCHours() + location.timeZoneOffset) < 0) {
            return 'yesterday';
        } else {
            return 'today';
        }
    }

    let fetchDate = decideOnFetchDate();

    console.log(`fetching: https://api.sunrise-sunset.org/json?lat=${location.latitude}&lng=${location.longitude}&formatted=0&date=${fetchDate}`);
    fetch(`https://api.sunrise-sunset.org/json?lat=${location.latitude}&lng=${location.longitude}&formatted=0&date=${fetchDate}`)
        .then(function (response) {
            if (response.status !== 200) {
                console.log('Looks like there was a problem. Status Code: ' + response.status);
                return;
            }

            response.json().then(function (data) {
                location.sunrise = new Date(data.results.sunrise);
                location.sunset = new Date(data.results.sunset);
                location.twilightBegin = new Date(data.results.civil_twilight_begin);
                location.twilightEnd = new Date(data.results.civil_twilight_end);
                location.dayLength = data.results.day_length;
            });
        })
        .catch(function (err) {
            console.log('Fetch Error :-S', err);
        });
}

function updateDaytimeBasedVisuals(date) {
    for (const half of halves) {
        half.setCurrentDayTime = decideOnGradient(half.location, date);
    }
}


function runTicker() {
    ticker = setInterval(function () {

        let date = new Date();
        updateCountdown(date);
        updateLocalTimes(date);
        updateDaytimeBasedVisuals(date);

    }, 1000);
    halted = false;
    return ticker;
}

window.onload = function () {
    console.log("Available commands:\nhalt() stops periodic updates.\nresume() enables periodic updates.")
    for (const half of halves) {
        getSunTimes(half.location);
    }
    ticker = runTicker();
};

function halt() {
    if(!halted) {
        clearInterval(ticker);
        halted = true;
    } else {
        console.log("Already HALTED...")
    }
}

function resume() {
    if(!halted) {
        console.log("Already RUNNING...")
    } else {
        ticker = runTicker();
    }

}