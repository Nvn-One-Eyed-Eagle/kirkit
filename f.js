const strike = document.querySelector(".player-box");
const nonstrike = document.querySelector(".nstrike");
const infoContainer = document.getElementById("infoContainer");
const stop = document.querySelector("#stop");
const butts = document.querySelector(".runs");

const info = document.querySelector("#wic");
const oinfo = document.querySelector("#otherinfo");

/*===========================*/
/* CAMERA + RECORDING LOGIC */
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

/* ✅ CAMERA INIT (ONLY WHEN NEEDED) */
async function initCamera() {
  if (stream) return;

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: true
    });
    video.srcObject = stream;
    status.textContent = "Camera ready";
  } catch (err) {
    status.textContent = "Camera access failed";
    console.error(err);
  }
}

/* START RECORDING */
async function startRecording() {
  if (!allset) {
    status.textContent = "Select strike & non-strike first";
    return;
  }

  await initCamera();

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

    const a = document.createElement("a");
    a.href = url;
    a.download = "recording.webm";
    a.click();

    URL.revokeObjectURL(url);
    status.textContent = "Video saved";
  };

  recorder.start();
  isRecording = true;
  isPaused = false;
  recordBtn.textContent = "⏸";
  status.textContent = "Recording…";
}

/* PAUSE / RESUME */
function togglePause() {
  if (!isRecording) return;

  if (!isPaused) {
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

/* STOP & SAVE */
function stopAndSave() {
  if (!isRecording) return;
  discard = false;
  recorder.stop();
  isRecording = false;
  isPaused = false;
  recordBtn.textContent = "▶";
}

/* ABANDON */
function abandonRecording() {
  if (!isRecording) return;
  discard = true;
  recorder.stop();
  isRecording = false;
  isPaused = false;
  recordBtn.textContent = "▶";
  status.textContent = "Recording abandoned";
}

/* EVENTS */
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
   MATCH DATA
========================= */
function createPlayer() {
  return {
    runs: 0,
    balls: 0,
    sixes: 0,
    fours: 0,
    bold: false,
    get runRate() {
      return this.balls ? (this.runs / this.balls) * 6 : 0;
    }
  };
}

const players = {
  mohit: createPlayer(),
  nitin: createPlayer(),
  amit: createPlayer(),
  mirdul: createPlayer(),

  totalruns: 0,
  totalballs: 0,
  overs: 0,
  wicket: 0
};

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
  return Object.keys(players).filter(p => typeof players[p] === "object");
}

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

      if (wicketFallen) {
        if (name === nonstrike.innerText) return;
        strike.innerText = name;
        wicketFallen = false;
        update();
        stop.classList.remove("lock");
        return;
      }

      if (!strikeSet) {
        strike.innerText = name;
        strikeSet = true;
        stop.classList.remove("lock");
      } else if (strike.innerText !== name) {
        nonstrike.innerText = name;
        allset = true;
        status.textContent = "Players set. Ready to record.";
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
    if (players[name]?.bold) {
      inning_score[name] = players[name];
      delete players[name];
    }
  }
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

    if (players.totalballs % 6 === 0) players.overs++;

    update();
    butts.classList.add("lock");
  });
});
