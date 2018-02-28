// Melbourne
// https://api.sunrise-sunset.org/json?lat=-37.814&lng=-144.96332
// Erlangen
// https://api.sunrise-sunset.org/json?lat=49.59099&lng=11.00783

/* Object definitions */

function Location(city, latitude, longitude, timeZoneOffset) {
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

function Gradient(top, bottom) {
    this.top = top;
    this.bottom = bottom;
}

function Halves(upper, lower) {
    this.upper = upper;
    this.lower = lower;
}

function Half(location, id) {
    this.location = location;
    this.id = id;
    this.hasParticles = false;
    this.hasSun = false;
    this.element = document.getElementById(id);
}


/* Globals */

const countdownDate = new Date(Date.UTC(2018, 7, 2, 19, 35)).getTime();

const daytimeGradients = {
    dawn: new Gradient('#63adf7', '#ffb539'),
    dusk: new Gradient('#485661', '#ff822b'),
    night: new Gradient('#0a1722', '#415a84'),
    day: new Gradient('#86d4f7', '#55a7ff')
};
let tick;
let melbourne = new Location('melbourne', -37.814, 144.96332, 11);
let erlangen = new Location('erlangen', 49.59099, 11.00783, 1);
let halves = new Halves(
    new Half(erlangen, 'upperhalf', false),
    new Half(melbourne, 'lowerhalf', false)
);

function updateCountdown(date) {

    let now = date.getTime();
    let distance = countdownDate - now;
    let days = Math.floor(distance / (1000 * 60 * 60 * 24));
    let hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    let minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    let seconds = Math.floor((distance % (1000 * 60)) / 1000);
    let countdownText = days + 'd ' + hours + 'h ' + minutes + 'm ' + seconds + 's ';

    if (distance <= 0) {
        // Countdown over.
        clearInterval(tick);
        countdownText = '<div class="alert alert-success" role="alert">yaaay :D!</div>';
    }
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
    document.getElementById('erlangen').innerHTML = hourErlangen + ':' + minute + ':' + second;
    document.getElementById('melbourne').innerHTML = hourMelbourne + ':' + minute + ':' + second;
}

function decideOnGradient(location, date) {
    // console.log(`${date} >= ${location.sunrise} && ${date} <= ${location.sunset}`);
    if (date >= location.twilightBegin && date <= location.twilightEnd) {
        if (date <= location.sunrise) {
            return daytimeGradients.dawn;
        } else if (date <= location.sunset) {
            return daytimeGradients.day;
        } else {
            return daytimeGradients.dusk;
        }
    } else {
        return daytimeGradients.night;
    }
}

function setCityGradient(city, gradient) {
    document.body.style.setProperty(`--${city}-top-color`, gradient.top);
    document.body.style.setProperty(`--${city}-bottom-color`, gradient.bottom);
}

function nightModeTriggers(location, gradient) {
    let half = (location === halves.upper.location) ? halves.upper : halves.lower;
    if (gradient === daytimeGradients.night && !half.hasParticles) {
        particlesJS.load(half.id, 'js/assets/particles.json');
        half.hasParticles = true;
    }
    if (gradient !== daytimeGradients.night && half.hasParticles) {
        half.element.removeChild(half.element.firstChild);
        half.hasParticles = false;
    }
}

function dayModeTriggers(location, gradient) {
    let half = (location === halves.upper.location) ? halves.upper : halves.lower;
    if (gradient === daytimeGradients.day && !half.hasSun) {
        let daySecondsAlreadyPassed = (location.sunrise - (new Date())) / 1000;
        half.element.insertAdjacentHTML('afterbegin',
            `<div class="sunWrapper" style="animation: drawArc1 ${location.dayLength}s linear infinite; 
             animation-delay: ${daySecondsAlreadyPassed}s;"><div class="sun"></div></div>`
        );
        //document.body.style.setProperty(`--${location.city}-day-length`, location.dayLength);
        //document.body.style.setProperty(`--${location.city}-day-passed`, daySecondsAlreadyPassed.toString());
        half.hasSun = true;
    }
    if (gradient !== daytimeGradients.day && half.hasSun) {
        half.element.removeChild(half.element.firstChild);
        half.hasSun = false;
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

    function updateDaytimeVisualsOf(location) {
        let gradient = decideOnGradient(location, date);
        // TODO: gradient in half speichern und dann nur triggers/sets ausführen wenn alter gradient != neuer gradient
        setCityGradient(location.city, gradient);
        nightModeTriggers(location, gradient);
        dayModeTriggers(location, gradient);
    }

    updateDaytimeVisualsOf(erlangen);
    updateDaytimeVisualsOf(melbourne);
}



window.onload = function () {
    getSunTimes(melbourne);
    getSunTimes(erlangen);

    tick = setInterval(function () {

        let date = new Date();
        updateCountdown(date);
        updateLocalTimes(date);
        updateDaytimeBasedVisuals(date);

    }, 1000);
};
