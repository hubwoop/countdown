// Melbourne
// https://api.sunrise-sunset.org/json?lat=-37.814&lng=-144.96332
// Erlangen
// https://api.sunrise-sunset.org/json?lat=49.59099&lng=11.00783

/* Object definitions */

function Location(city, latitude, longitude, timezoneOffset) {
    this.sunset = 0;
    this.sunrise = 0;
    this.twilightBegin = 0;
    this.twilightEnd = 0;
    this.city = city;
    this.latitude = latitude;
    this.longitude = longitude;
    this.timezoneOffset = timezoneOffset;
}

function Gradient(top, bottom) {
    this.top = top;
    this.bottom = bottom;
}


/* Globals */

const countdownDate = new Date(Date.UTC(2018, 7, 2, 19, 35)).getTime();

let melbourne = new Location("melbourne", -37.814, 144.96332, 11);
let erlangen = new Location("erlangen", 49.59099, 11.00783, 1);

const daytimeGradients = {
    dawn: new Gradient('#63adf7', '#ffb539'),
    dusk: new Gradient('#485661', '#ff822b'),
    night: new Gradient('#7fffd4', '#4972a1'),
    day: new Gradient('#feffaa', '#f7f246')
};

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
    document.getElementById("melbourne").innerHTML = hourMelbourne  + ":" + minute + ":" + second;


    function setCityGradient(city, gradient) {
        document.body.style.setProperty(`--${city}-top-color`, gradient.top);
        document.body.style.setProperty(`--${city}-bottom-color`, gradient.bottom);
    }

    function decideOnGradient(location) {
        // console.log(`${date} >= ${location.sunrise} && ${date} <= ${location.sunset}`);
        if(date >= location.twilightBegin && date <= location.twilightEnd) {
            if(date <= location.sunrise) {
                setCityGradient(location.city, daytimeGradients.dawn);
            } else if (date <= location.sunset) {
                setCityGradient(location.city, daytimeGradients.day);
            } else {
                setCityGradient(location.city, daytimeGradients.dusk);
            }
        } else {
            setCityGradient(location.city, daytimeGradients.night);
        }
    }

    decideOnGradient(erlangen);
    decideOnGradient(melbourne);

}

// 1 second interval for countdown & clocks
let x = setInterval(function () {

    let date = new Date();
    updateCountdown(date);
    updateLocalTimes(date);

}, 1000);

function forceTwoDigits(i) {
    return (i < 10) ? "0" + i : i;
}

function getSunTimes(location) {
    // Melbourne https://api.sunrise-sunset.org/json?lat=-37.814&lng=-144.96332
    // Erlangen https://api.sunrise-sunset.org/json?lat=49.59099&lng=11.00783

    fetch(`https://api.sunrise-sunset.org/json?lat=${location.latitude}&lng=${location.longitude}&formatted=0`)
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
                console.log(location);
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
