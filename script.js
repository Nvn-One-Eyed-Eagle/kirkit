/* =========================
   DOM ELEMENTS
========================= */

const team1 = JSON.parse(localStorage.getItem("team1"));
const team2 = JSON.parse(localStorage.getItem("team2"));
const over = JSON.parse(localStorage.getItem("overs"));
const previewBtn = document.getElementById("previewBtn");
const previewVideos = document.getElementById("previewVideos");

let overVideos = []; // stores video URLs


if (!team1 || !team2) {
  alert("Teams not selected!");
}

let players = team1; // ⚠️ MUST BE let (inning switch)

const strike = document.querySelector(".player-box");
const nonstrike = document.querySelector(".nstrike");
const infoContainer = document.getElementById("infoContainer");
const stop = document.querySelector("#stop");
const butts = document.querySelector(".runs");

const info = document.querySelector("#wic");
const oinfo = document.querySelector("#otherinfo");

let inningsCompleted = 0; 



/*===========================*/



const video = document.getElementById("camera");
const status = document.getElementById("status");
const recordBtn = document.getElementById("record");
const stopBtn = document.getElementById("stop");
const abandonBtn = document.getElementById("abandon");

let stream;
let recorder;
let chunks = [];
let isRecording = false;
let isPaused = false;
let discard = false;

// INIT CAMERA (BACK CAMERA)
(async () => {
    try{
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
            audio: true
        });
        video.srcObject = stream;
        status.textContent = "Back camera ready";
    }catch(err){
        status.textContent = "Camera access failed";
        console.error(err);
    }
})();

// START RECORDING
function startRecording(){
    chunks = [];
    discard = false;

    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = e => {
        if (e.data.size) chunks.push(e.data);
    };

    recorder.onstop = () => {
        if (discard) return;

        const blob = new Blob(chunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);

        overVideos.push(url);

        // keep only last 6 balls (1 over)
        if (overVideos.length > 6) {
            URL.revokeObjectURL(overVideos.shift());
        }

        status.textContent = "Ball recorded";
    };


    recorder.start();
    isRecording = true;
    isPaused = false;
    recordBtn.textContent = "⏸";
    status.textContent = "Recording…";
}

// PAUSE / RESUME
function togglePause(){
    if (!isRecording) return;

    if (!isPaused){
        recorder.pause();
        isPaused = true;
        recordBtn.textContent = "▶";
        status.textContent = "Paused";
    } else {
        recorder.resume();
        isPaused = false;
        recordBtn.textContent = "⏸";
        status.textContent = "Recording…";
    }
}

// STOP & SAVE
function stopAndSave(){
    if (!isRecording) return;
    discard = false;
    recorder.stop();
    isRecording = false;
    isPaused = false;
    recordBtn.textContent = "▶";
}

// ABANDON
function abandonRecording(){
    if (!isRecording) return;
    discard = true;
    recorder.stop();
    isRecording = false;
    isPaused = false;
    recordBtn.textContent = "▶";
    status.textContent = "Recording abandoned";
}

// EVENTS
recordBtn.onclick = () => {
    if (!isRecording) startRecording();
    else togglePause();
};

stopBtn.onclick = stopAndSave;
abandonBtn.onclick = abandonRecording;



/* =========================
   UI UPDATE
========================= */
function update() {
  info.innerText = `Wic : ${players.wicket}`;
  oinfo.innerHTML = `
    Over : ${players.overs}
    &nbsp;&nbsp; Ball : ${players.totalballs - players.overs * 6}
    &nbsp;&nbsp; Run : ${players.totalruns}
  `;
}

/* =========================
   RADIAL MENU
========================= */
document.getElementById("radialBtn").addEventListener("click", () => {
  document.getElementById("radialMenu").classList.toggle("active");
});


/* =========================
   MATCH DATA
========================= */

const inning_score = {};

/* =========================
   STATE FLAGS
========================= */
let strikeSet = false;
let allset = false;
let wicketFallen = false;

/* =========================
   HELPERS
========================= */
function getAvailableBatsmen() {
  return Object.keys(players).filter(
    p => typeof players[p] === "object"
  );
}
function isAllOut() {
  return getAvailableBatsmen().length === 0;
}

previewBtn.addEventListener("click", () => {
    previewVideos.innerHTML = "";

    if (overVideos.length === 0) {
        alert("No videos recorded for this over");
        return;
    }

    overVideos.forEach(url => {
        const vid = document.createElement("video");
        vid.src = url;
        vid.controls = true;
        vid.playsInline = true;
        previewVideos.appendChild(vid);
    });
});



/* =========================
   RENDER PLAYERS
========================= */
function renderPlayers() {
  const parent = document.querySelector("#teamplayer");
  if (!parent) return;

  parent.innerHTML = "";

  for (const name of getAvailableBatsmen()) {
    const div = document.createElement("div");
    div.className = "team-player";
    div.innerText = name;

    if (wicketFallen && name === nonstrike.innerText) {
      div.classList.add("disabled");
    }

    div.addEventListener("click", () => {

      /* AFTER WICKET */
      if (wicketFallen) {
        if (name === nonstrike.innerText) return;

        strike.innerText = name;
        wicketFallen = false;
        stop.classList.remove("lock");
        update();
        return;
      }

      /* INITIAL SETUP */
      if (!strikeSet) {
        strike.innerText = name;
        stop.classList.remove("lock");
        strikeSet = true;
      } 
      else if (strike.innerText !== name) {
        nonstrike.innerText = name;
        allset = true;
        document.querySelector(".display").classList.remove("lock");
      }

      update();
    });

    parent.appendChild(div);
  }
}

renderPlayers();

/* =========================
   FINALIZE OUT PLAYER
========================= */
function finalizeOutPlayer() {
  for (const name in players) {
    const p = players[name];
    if (p?.bold) {
      inning_score[name] = p;
      delete players[name];
    }
  }
}

/* =========================
   END INNING
========================= */
function endInning() {
  console.log("Inning Over");
  butts.classList.add("lock");
  document.querySelector("#radialBtn").classList.add("lock")
  document.querySelector("#bating").innerText = "Team 2";

  // Save remaining players' scores
  for (const name in players) {
    if (typeof players[name] === "object") {
      inning_score[name] = players[name];
    }
  }

  inningsCompleted++;

  // 👉 IF BOTH TEAMS HAVE BATTED
  if (inningsCompleted === 2) {
    // Optional: store final scores
    localStorage.setItem("team1", JSON.stringify(team1));
    localStorage.setItem("team2", JSON.stringify(team2));

    //STOP EVERYTHING & REDIRECT
    window.location.href = "matchover.html";
    return;
  }

  // Reset UI + state for next innings
  strike.innerText = "";
  nonstrike.innerText = "";
  strikeSet = false;
  allset = false;
  wicketFallen = false;

  // Switch batting team
  players = players === team1 ? team2 : team1;

  renderPlayers();
  update();
}


/* =========================
   RUN BUTTONS
========================= */
document.querySelectorAll(".square, .circle").forEach(btn => {
  btn.addEventListener("click", () => {
    if (!allset) return;

    const run = +btn.innerText;
    const batter = players[strike.innerText];

    players.totalballs++;
    players.totalruns += run;

    batter.runs += run;
    batter.balls++;

    if (run === 4) batter.fours++;
    if (run === 6) batter.sixes++;

    if (run === 1 || run === 3 || players.totalballs % 6 === 0) {
      [strike.innerText, nonstrike.innerText] =
        [nonstrike.innerText, strike.innerText];
    }

    if (players.totalballs % 6 === 0) {
      players.overs++;

    if (players.overs === 1 || isAllOut()) {
      endInning();
      return;
    }
    }

    update();
    butts.classList.add("lock");
    document.querySelector("#radialBtn").classList.add("lock")
    document.querySelector(".display").classList.remove("lock");
  });
});

/* =========================
   WICKET BUTTON
========================= */
document.querySelector(".bold-btn").addEventListener("click", () => {
  const outPlayer = strike.innerText;

  players.wicket++;
  players[outPlayer].balls++;
  players.totalballs++;
  players[outPlayer].bold = true;

  stop.classList.add("lock");
  update();

  finalizeOutPlayer();
  if (isAllOut()) {
    endInning();
    return;
  }

  const remaining = getAvailableBatsmen();

  if (remaining.length === 1 && remaining[0] === nonstrike.innerText) {
    strike.innerText = nonstrike.innerText;
    nonstrike.innerText = "";
    wicketFallen = false;
    stop.classList.remove("lock");
    butts.classList.add("lock");
    document.querySelector("#radialBtn").classList.add("lock")
    document.querySelector(".display").classList.remove("lock");
    update();
    return;
  }

  wicketFallen = true;
  strike.innerText = "Select...";
  renderPlayers();
  butts.classList.add("lock");
  document.querySelector("#radialBtn").classList.add("lock")
  document.querySelector(".display").classList.remove("lock");
  update();
});

/* =========================
   STOP BUTTON
========================= */
stop.addEventListener("click", () => {
  document.querySelector("#radialBtn").classList.remove("lock");
  if (!allset) return;
  infoContainer.classList.remove("locked");
  butts.classList.remove("lock");
  document.querySelector(".display").classList.add("lock");
});

/* =========================
   DOT BALL
========================= */
document.querySelector(".dot-btn")?.addEventListener("click", () => {
  if (!allset) return;
  butts.classList.add("lock");
  document.getElementById("radialMenu").classList.toggle("active");

  players.totalballs++;
  players[strike.innerText].balls++;

  if (players.totalballs % 6 === 0) {
    [strike.innerText, nonstrike.innerText] =
      [nonstrike.innerText, strike.innerText];

    players.overs++;

  if (players.overs === over || isAllOut()) {
    endInning();
    return;
  }
  }

  update();
  document.querySelector("#radialBtn").classList.add("lock")
  document.querySelector(".display").classList.remove("lock");
});
