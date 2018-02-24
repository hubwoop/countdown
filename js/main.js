// Melbourne
// https://api.sunrise-sunset.org/json?lat=-37.814&lng=-144.96332
// Erlangen
// https://api.sunrise-sunset.org/json?lat=49.59099&lng=11.00783

/* Object definitions */

function SunTimes() {
    this.sunset = 0;
    this.sunrise = 0;
    this.twilightBegin = 0;
    this.twilightEnd = 0;
}

function Gradient(top, bottom) {
    this.top = top;
    this.bottom = bottom;
}


/* Globals */

const countdownDate = new Date(Date.UTC(2018, 7, 2, 19, 35)).getTime();

let melbourneSunTimes = new SunTimes();
let erlangenSunTimes = new SunTimes();

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
    let minute = date.getMinutes();
    let second = date.getSeconds();
    minute = addLeadingZero(minute);
    second = addLeadingZero(second);
    document.getElementById("erlangen").innerHTML = hourErlangen + ":" + minute + ":" + second;
    document.getElementById("melbourne").innerHTML = hourMelbourne + ":" + minute + ":" + second;


    function setCityGradient(city, gradient) {
        document.body.style.setProperty(`--${city}-top-color`, gradient.top);
        document.body.style.setProperty(`--${city}-bottom-color`, gradient.bottom);
    }


    if (hourErlangen > 6 && hourErlangen < 21) {
        setCityGradient('erlangen', daytimeGradients.day);
    } else {
        setCityGradient('erlangen', daytimeGradients.night);
    }

    if (hourMelbourne > 6 && hourMelbourne < 21) {
        setCityGradient('melbourne', daytimeGradients.day);
    } else {
        setCityGradient('melbourne', daytimeGradients.night);
    }

}

// 1 second interval for countdown & clocks
let x = setInterval(function () {

    let date = new Date();
    updateCountdown(date);
    updateLocalTimes(date);

}, 1000);

function addLeadingZero(i) {
    if (i < 10) { i = "0" + i }  // add zero in front of numbers < 10
    return i;
}

function getSunTimes(city) {
    // Melbourne https://api.sunrise-sunset.org/json?lat=-37.814&lng=-144.96332
    // Erlangen https://api.sunrise-sunset.org/json?lat=49.59099&lng=11.00783
    let latitude;
    let longitude;
    if (city === 'melbourne') {
        latitude = -37.814;
        longitude = -144.96332;
    } else {
        latitude = 49.59099;
        longitude = 11.00783;
    }
    // console.log(`https://api.sunrise-sunset.org/json?lat=${latitude}&lng=${longitude}&formatted=0`)
    fetch(`https://api.sunrise-sunset.org/json?lat=${latitude}&lng=${longitude}&formatted=0`)
        .then(function (response) {
            if (response.status !== 200) {
                console.log('Looks like there was a problem. Status Code: ' +
                    response.status);
                return;
            }

            // Examine the text in the response
            response.json().then(function (data) {
                console.log(data);
                let location;
                if (city === 'melbourne') {
                    location = melbourneSunTimes;
                } else {
                    location = erlangenSunTimes;
                }
                location.sunrise = new Date(data.results.sunrise);
                location.sunset = new Date(data.results.sunset);
                location.twilightBegin = new Date(data.results.civil_twilight_begin);
                location.twilightEnd = new Date(data.results.civil_twilight_end);
            });
        })
        .catch(function (err) {
            console.log('Fetch Error :-S', err);
        });
}

window.onload = function () {
    getSunTimes('melbourne');
    getSunTimes('erlangen');
};
