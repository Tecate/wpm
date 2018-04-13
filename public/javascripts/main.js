//bugs
// double spaces don't render in copy
// spaces at end of lines don't render in copy

// features
// cursor


var layoutQuerty = ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "Backspace", "Tab", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]", "\\", "CapsLock", "a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'", "Enter", "Shift", "z", "x", "c", "v", "b", "n", "m", ",", ".", "/", "Shift", " "];
var layoutDvorak = ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "[", "]", "Backspace", "Tab", "'", ",", ".", "p", "y", "f", "g", "c", "r", "l", "/", "=", "\\", "CapsLock", "a", "o", "e", "u", "i", "d", "h", "t", "n", "s", "-", "Enter", "Shift", ";", "q", "j", "k", "x", "b", "m", "w", "v", "z", "Shift", " "];
var layoutSelected = layoutQuerty;

var copy = "";
var copyEl = document.getElementById("copy");
var currentString = "";
// var currentStringEscaped = currentString.escape();
var errors = 0;
var accuracy = 0;
var startTime = null;

var roundStats = {
  wpm: 0,
  cpm: 0,
  errors: 0,
  accuracy: 0
};

var pastRounds = [];

var roundOver = false;

var errorStartPos = null;


var graphData = new TimeSeries();

// initialize smoothie chart
function createTimeline() {
  var chart = new SmoothieChart({ grid: { strokeStyle:'rgba(0, 0, 0, 0)', fillStyle:'rgba(0, 0, 0, 0)',
    lineWidth: 0, millisPerPixel: 50, verticalSections: 0, interpolation: 'linear', labels: {disabled:true,fontSize:0}, maxValue:1000, minValue:1000, scaleSmoothing:0
    } });
  chart.addTimeSeries(graphData);
  chart.streamTo(document.getElementById("chart"), 500);
}

$(document).ready(function() {
  $("#copy-wrapper").addClass("copy-width-anim");

  getQuote();
  createTimeline();
  
  // draw keyboard using selected layout
  for (i=0;i<layoutSelected.length;i++) {
    if      (layoutSelected[i] == "Backspace") { $(".key-"+i).html("bksp");}
    else if (layoutSelected[i] == "CapsLock")  { $(".key-"+i).html("caps");}
    else if (layoutSelected[i] == "Enter")     { $(".key-"+i).html("entr");}
    else if (layoutSelected[i] == "Shift")     { $(".key-"+i).html("shft");}
    else                                       { $(".key-"+i).html(layoutSelected[i]);}
  }

  // originally using keypress
  // every time a key is pressed
  document.addEventListener('keydown', (event) => {
    var keyName = event.key;
    var keyCode = event.keyCode;
    var keyIndex = layoutSelected.indexOf(keyName);
    if (!$("input").is(":focus")) {
      event.preventDefault();

      if (keyName == "F5") {
        window.location.reload(false); 
      }

      if (keyName == "Escape") {
        newRound();
      } else if (roundOver == false) {
        // handle backspace or add character to total input
        if (keyName == "Backspace") { // remove character
          currentString = currentString.slice(0, -1);
        } else if (keyName.length == 1) { // add character
          currentString = currentString+keyName;
        }
        checkSpeed();
        spellCheck(keyName);
      } else if (roundOver == true) {
        if (keyName == "Enter") { // remove character
          newRound();
        }
      }

      $("#input").html(currentString);
    }

    if (keyIndex != -1) {
      var pressedKey = keyIndex;
      if (keyIndex == 41 && event.location == 2) { pressedKey = 52 }
      $(".key-"+pressedKey).addClass("fade");
      setTimeout(function(){
        $(".key-"+pressedKey).removeClass("fade");
      }, 250);
    }
    // console.log('keypress event\n\n' + 'key: ' + keyName);
  });
});

function newRound() {
  startTime = null;
  currentString = "";
  roundStats.errors = 0;
  roundStats.accuracy = 1;
  graphData.data = []; // clear graph
  roundOver = false;
  $("#copy").html("");
  $(".wpm").html("WPM: 0.0");
  $("#cpm").html("CPM: 0.0");
  $("#errors").html("Errors: 0");
  $("#accuracy").html("Accuracy: 100%");
  $("#copy").removeClass("transparent");
  $("#end-screen").removeClass("opaque");
  $("#copy").addClass("opaque");
  $("#end-screen").addClass("transparent");
  getQuote();
}

function focusScreen(screen) {
  // copy
  // end-screen
}

function getQuote(){
  $.ajax({
    url: "https://api.forismatic.com/api/1.0/?",
    dataType: "jsonp",
    data: "method=getQuote&format=jsonp&lang=en&jsonp=?",
    success: function( response ) {
      copy = response.quoteText.trim();
      $("#copy").html(copy);
    }
  });
}

function spellCheck(keyName) {
    if (currentString == copy.substring(0,currentString.length)) {
      errorStartPos = null;
//       copyEl.setAttribute('data-value', currentString+"|");
      var nextWord;
      if (copy.indexOf(" ", currentString.length+1) == -1) {
        nextWord = copy.length;
      } else {
        nextWord = copy.indexOf(" ", currentString.length+1);
      }
      var copyCurrent = copy.substring(copy.lastIndexOf(" ", currentString.length), nextWord);
      console.log(copy.lastIndexOf(" ", currentString.length), copy.indexOf(" ", currentString.length+1));
      var copyLeft = copy.substring(0, copy.lastIndexOf(" ", currentString.length));
      var copyRight = copy.substring(copyCurrent.length+copyLeft.length, copy.length);

      $("#copy").html('<span class="copy-left">' + copyLeft + '</span>' + '<span class="copy-current">' + copyCurrent + '</span>' + '<span class="copy-right">' + copyRight + '</span>');
      if (currentString == copy) { roundFinished(); }

    } else { // on mistyped character
      if (errorStartPos == null) { errorStartPos = currentString.length; }
      if (keyName != "Backspace") { roundStats.errors++; }
      var copyLeft = copy.substring(0, errorStartPos-1);
      var copyCurrent = copy.substring(errorStartPos-1, currentString.length);
      var copyRight = copy.substring(currentString.length, copy.length);
      $("#copy").html('<span class="copy-left">' + copyLeft + '</span>' + '<span class="copy-error">' + copyCurrent + '</span>' + '<span class="copy-right">' + copyRight + '</span>');
    }
}

function calculateWpm(startTimeMs, currentTimeMs, totalWords) {
	var mins = ((currentTimeMs - startTimeMs) / 1000) / 60;
	return (totalWords / mins).toFixed(2);
}

function checkSpeed() {
	if(currentString === "") {
		startTime = null;
		$(".wpm").html("WPM: 0.0");
		$("#cpm").html("CPM: 0.0");
		$("#errors").html("Errors: 0");
		$("#accuracy").html("Accuracy: 100%");
	} else if(startTime === null) {
		startTime = performance.now();
	} else {
    // update graph after fourth character
    if (currentString.length > 4) {
      graphData.append(new Date().getTime(), calculateWpm(startTime, performance.now(), currentString.length)); 
    }

    roundStats.cpm = calculateWpm(startTime, performance.now(), currentString.length);
    roundStats.wpm = (roundStats.cpm/5).toFixed(2);
    roundStats.accuracy = ((copy.length-roundStats.errors)/copy.length*100).toFixed(2);

    $("#cpm").html("CPM: " + roundStats.cpm);
    $(".wpm").html("WPM: " + roundStats.wpm);
    $("#errors").html("Errors: " + roundStats.errors);
		$("#accuracy").html("Accuracy: " + roundStats.accuracy + "%");
	}
}

function roundFinished() {
  roundOver = true;
  $("#copy").removeClass("opaque");
  $("#end-screen").removeClass("transparent");
  $("#copy").addClass("transparent");
  $("#end-screen").addClass("opaque");
  // $("#end-screen").html(roundStats.wpm);
  $("#past-rounds").empty();

  // accChart.update();
  drawAccChart();


  // update & display past rounds
  if (pastRounds.length > 9) { // cap at history of 10
    pastRounds.pop();
  }
  pastRounds.unshift(Object.assign({}, roundStats)); // we need to store a copy of the object and not the object itsself
  for (var i=0;i<pastRounds.length;i++) {
    $("<div />", {
          text: pastRounds[i].wpm+" WPM / " /*+pastRounds[i].cpm+" CPM / "*/ + pastRounds[i].accuracy + " ACC"
        }).appendTo("#past-rounds");
  }

  // calculate & display averages
  var wpmSum = 0;
  var accSum = 0;
  for( var i = 0; i < pastRounds.length; i++ ){
      wpmSum += parseFloat(pastRounds[i].wpm);
      accSum += parseFloat(pastRounds[i].accuracy);
  }
  console.log("sums", wpmSum, accSum);
  var wpmAvg = (wpmSum/pastRounds.length).toFixed(2);
  var accAvg = (accSum/pastRounds.length).toFixed(2);
  console.log("avgs", wpmAvg, accAvg);
  $("#average-wpm").html("Avg WPM: " + wpmAvg);
  $("#average-accuracy").html("Avg Accuracy: " + accAvg + "%");
  rankSpeed(roundStats.wpm);
  sendStats();
}

function rankSpeed(wpm) {
  var rank;
  if (wpm < 40)   { rank = "F"; }
  if (wpm >= 40)  { rank = "D"; }
  if (wpm >= 50)  { rank = "C"; }
  if (wpm >= 65)  { rank = "B"; }
  if (wpm >= 75)  { rank = "A"; }
  if (wpm >= 85)  { rank = "AA"; }
  if (wpm >= 90)  { rank = "AAA"; }
  if (wpm >= 100) { rank = "S"; }
  if (wpm >= 120) { rank = "SS"; }
  if (wpm >= 130) { rank = "SSS"; }
  if (wpm >= 140) { rank = "Godlike"; }
  if (roundStats.accuracy == 100) {rank = rank+"+"}
  $(".rank").html("Rank: " + rank);
}

  var pastWpmArray;
  for (var i=0;i<pastRounds.length;i++) {
    pastWpmArray.unshift(pastRounds[i].wpm);
  }
  console.log(pastWpmArray);
  pastWpmArray = [50, 65, 74, 66, 89, 90, 54, 100, 75, 82];

  var pastRoundsChart = new Chartist.Line('.past-rounds-chart', {
  labels: [],
  series: [
    [12, 9, 7, 8, 5, 2, 9, 7, 8, 5]
  ]
  }, {
    fullWidth: true
  });

function drawAccChart() {



  var accChart = new Chartist.Pie('.accuracy-donut', {
    // series: [roundStats.accuracy, (roundStats.accuracy-100)]
    series: [roundStats.accuracy, (100-roundStats.accuracy)],
    labels: [roundStats.accuracy]
  }, {
    donut: true,
    showLabel: true
  });

  accChart.on('draw', function(data) {
    if (roundOver === true) {

      if(data.type === 'slice') {
        // Get the total path length in order to use for dash array animation
        var pathLength = data.element._node.getTotalLength();

        // Set a dasharray that matches the path length as prerequisite to animate dashoffset
        data.element.attr({
          'stroke-dasharray': pathLength + 'px ' + pathLength + 'px'
        });

        // Create animation definition while also assigning an ID to the animation for later sync usage
        var animationDefinition = {
          'stroke-dashoffset': {
            id: 'anim' + data.index,
            dur: 500,
            from: -pathLength + 'px',
            to:  '0px',
            easing: Chartist.Svg.Easing.easeOutQuint,
            // We need to use `fill: 'freeze'` otherwise our animation will fall back to initial (not visible)
            fill: 'freeze'
          }
        };

        // If this was not the first slice, we need to time the animation so that it uses the end sync event of the previous animation
        if(data.index !== 0) {
          animationDefinition['stroke-dashoffset'].begin = 'anim' + (data.index - 1) + '.end';
        }

        // We need to set an initial value before the animation starts as we are not in guided mode which would do that for us
        data.element.attr({
          'stroke-dashoffset': -pathLength + 'px'
        });

        // We can't use guided mode as the animations need to rely on setting begin manually
        // See http://gionkunz.github.io/chartist-js/api-documentation.html#chartistsvg-function-animate
        data.element.animate(animationDefinition, false);
      }
        if(data.type === 'label') {
    
    if(data.index === 0) {
      data.element.attr({
        dx: data.element.root().width() / 2,
        dy: data.element.root().height() / 2
      });
    } else {
      data.element.remove();
    }
  }
    }
  });
}

var signinUrl = "/api/signin";
var signupUrl = "/api/signup";
var quoteUrl  = "/api/quote";
var statsUrl  = "/api/stats";


function submitQuote() {

}

function getStats() {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', statsUrl, true);
  //xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
  xhr.setRequestHeader("Authorization", window.localStorage.getItem("token"));

  xhr.addEventListener('load', function() {
   // var responseObject = JSON.parse(this.response);
    console.log(this.response);
  });
  console.log(window.localStorage.getItem("token"));
  var sendObject = JSON.stringify({token: window.localStorage.getItem("token")});

  console.log('going to send', sendObject);

  xhr.send();
}

function sendStats() {
  var xhr = new XMLHttpRequest();
  xhr.open('POST', statsUrl, true);
  //xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
  xhr.setRequestHeader("Authorization", window.localStorage.getItem("token"));

  // xhr.addEventListener('load', function() {
  //  // var responseObject = JSON.parse(this.response);
  //   console.log(this.response);
  // });
  // console.log(window.localStorage.getItem("token"));
  var sendObject = JSON.stringify(roundStats);

  console.log('going to send', sendObject);

  xhr.send(JSON.stringify(roundStats));
}

function signin() {
  var xhr = new XMLHttpRequest();
  xhr.open('POST', signinUrl, true);
  xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
  xhr.addEventListener('load', function() {
    var responseObject = JSON.parse(this.response);
    console.log(responseObject);
    if (responseObject.token) {
      window.localStorage.setItem('token', responseObject.token);
    } else {
      console.log("No token received");
    }
  });

  var sendObject = JSON.stringify({username: $("#username").val(), password: $("#password").val()});

  console.log('going to send', sendObject);

  xhr.send(sendObject);
}

function signup() {
  var xhr = new XMLHttpRequest();
  xhr.open('POST', signupUrl, true);
  xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
  xhr.addEventListener('load', function() {
    var responseObject = JSON.parse(this.response);
    console.log(responseObject);
    if (responseObject.token) {
      window.localStorage.setItem('token', responseObject.token);
    } else {
      console.log("No token received");
    }
  });

  var sendObject = JSON.stringify({username: $("#username").val(), password: $("#password").val()});

  console.log('going to send', sendObject);

  xhr.send(sendObject);
}