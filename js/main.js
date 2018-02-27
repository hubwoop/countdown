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

function Half(location, id, hasParticles) {
    this.location = location;
    this.id = id;
    this.hasParticles = hasParticles;
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

let melbourne = new Location("melbourne", -37.814, 144.96332, 11);
let erlangen = new Location("erlangen", 49.59099, 11.00783, 1);
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
    let countdownText = days + "d " + hours + "h " + minutes + "m " + seconds + "s ";

    if (distance <= 0) {
        // Countdown over.
        clearInterval(x);
        countdownText = '<div class="alert alert-success" role="alert">yaaay :D!</div>';
    }
    document.getElementById("countdown").innerHTML = countdownText;
}

function updateLocalTimes(date) {
    let hourErlangen = (date.getUTCHours() + 1) % 24;
    let hourMelbourne = (date.getUTCHours() + 11) % 24;
    let minute = forceTwoDigits(date.getMinutes());
    let second = forceTwoDigits(date.getSeconds());
    document.getElementById("erlangen").innerHTML = hourErlangen + ":" + minute + ":" + second;
    document.getElementById("melbourne").innerHTML = hourMelbourne + ":" + minute + ":" + second;
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

// 1 second interval for countdown & clocks
let x = setInterval(function () {

    let date = new Date();
    updateCountdown(date);
    updateLocalTimes(date);

    let gradient = decideOnGradient(erlangen, date);
    setCityGradient(erlangen.city, gradient);
    nightModeTriggers(erlangen, gradient);

    gradient = decideOnGradient(melbourne, date);
    setCityGradient(melbourne.city, gradient);
    nightModeTriggers(melbourne, gradient);

}, 1000);

function forceTwoDigits(i) {
    return (i < 10) ? "0" + i : i;
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
                location.dayLength = data.results.daylength;
            });
        })
        .catch(function (err) {
            console.log('Fetch Error :-S', err);
        });
}

window.onload = function () {
    getSunTimes(melbourne);
    getSunTimes(erlangen);
};


