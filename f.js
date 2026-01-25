const players = JSON.parse(localStorage.getItem("matchData"));
localStorage.setItem("inning",0);
localStorage.setItem("end",false);
// Populate Grid
Object.entries(players).forEach(([name, player]) => {
  if (!player || typeof player !== "object" || !("runs" in player)) return;

  const div = document.createElement("div");
  div.className = "grid-box";

  if (player.bold) return;

  div.textContent = name.charAt(0).toUpperCase() + name.slice(1);
  document.querySelector(".top-grid").appendChild(div);
});

const playerss = document.querySelectorAll(".grid-box");
const team1 = document.querySelector(".team-1");
const team2 = document.querySelector(".team-2");

let turn = 0; 

playerss.forEach(item => {
  item.addEventListener("click", () => {
    if (item.classList.contains("selected")) return;

    item.classList.add("selected");

    const row = document.createElement("div");
    row.className = "team-row";
    
    // UI Tweak: Added first letter to circle
    const initial = item.innerText.charAt(0);
    
    row.innerHTML = `
      <div class="circle">${initial}</div>
      <div class="rect">${item.innerText}</div>
    `;

    const targetTeam = turn % 2 === 0 ? team1 : team2;
    targetTeam.appendChild(row);

    turn++;

    row.addEventListener("click", () => {
      row.remove();
      item.classList.remove("selected");

      turn--;
      if (turn < 0) turn = 0;
    });
  });
});

const teamStats = () => ({
  totalruns: 0,
  totalballs: 0,
  overs: 0,
  wicket: 0
});

function getTeamNames(containerSelector) {
  return [...document.querySelectorAll(`${containerSelector} .rect`)]
    .map(el => el.innerText.toLowerCase().trim());
}

function buildTeamsOnGo(players) {
  const team1Names = getTeamNames(".team-1");
  const team2Names = getTeamNames(".team-2");

  const team1 = teamStats();
  const team2 = teamStats();

  Object.entries(players).forEach(([name, data]) => {
    if (typeof data !== "object" || !("runs" in data)) return;

    if (team1Names.includes(name.toLowerCase())) {
      team1[name] = data;
    } 
    else if (team2Names.includes(name.toLowerCase())) {
      team2[name] = data;
    }
  });

  return { team1, team2 };
}

const goBtn = document.querySelector(".go-btn");



goBtn.addEventListener("click", () => {
  const { team1, team2 } = buildTeamsOnGo(players);
  const overs = Number(document.getElementById("oversInput").value) || 0;
  if (overs <= 0) return alert("Enter valid overs");

  localStorage.setItem("overs",JSON.stringify(overs));
  localStorage.setItem("team1",JSON.stringify(team1));
  localStorage.setItem("team2",JSON.stringify(team2));


  goBtn.textContent = "Teams Locked!";
  goBtn.style.background = "#10b981"; // Green color
  
  document.querySelectorAll(".grid-box").forEach(el => {
    el.style.pointerEvents = "none";

  window.location.href = "match.html"
  });
  
  // Disable removing players
  document.querySelectorAll(".team-row").forEach(el => {
    el.style.pointerEvents = "none";
  });
});