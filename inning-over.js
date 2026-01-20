const team =
	JSON.parse(localStorage.getItem("team1")) ||
	JSON.parse(localStorage.getItem("team2"));

const container = document.getElementById("highlights");

Object.entries(team).forEach(([name, player]) => {
	if (typeof player !== "object") return;

	const videos = [
		...(player.fours || []),
		...(player.sixes || [])
	];

	if (videos.length === 0) return;

	// ===== SECTION =====
	const section = document.createElement("section");

	const title = document.createElement("div");
	title.className = "section-title";
	title.innerHTML = `
		<p>${name.toUpperCase()} – ${player.runs} (${player.balls})</p>
	`;
	section.appendChild(title);

	// ===== CAROUSEL =====
	const wrapper = document.createElement("div");
	wrapper.className = "carousel-wrapper";

	const carousel = document.createElement("div");
	carousel.className = "carousel";

	const angleStep = 360 / videos.length;
	const radius = 180;

	videos.forEach((item, i) => {
		const card = document.createElement("div");
		card.className = "card";
		card.style.transform = `
			rotateX(${i * angleStep}deg)
			translateZ(${radius}px)
		`;

		const vid = document.createElement("video");
		vid.src = item.video;
		vid.muted = true;
		vid.loop = true;
        vid.playsInline = true;
        vid.autoplay = true;
		vid.play();

		card.appendChild(vid);
		card.onclick = () => openLightbox(item.video);

		carousel.appendChild(card);
	});

	wrapper.appendChild(carousel);
	section.appendChild(wrapper);
	container.appendChild(section);

	enableRotation(carousel, angleStep);
});

/* ===== ROTATION ===== */

function enableRotation(carousel, step) {
	let rotation = 0;

	let interval = setInterval(() => {
		rotation += step;
		carousel.style.transform = `rotateX(${rotation}deg)`;
	}, 3000);

	carousel.addEventListener("mouseover", () => clearInterval(interval));
	carousel.addEventListener("mouseout", () => {
		interval = setInterval(() => {
			rotation += step;
			carousel.style.transform = `rotateX(${rotation}deg)`;
		}, 3000);
	});
}

/* ===== LIGHTBOX ===== */

const lightbox = document.getElementById("lightbox");
const lightboxVideo = document.getElementById("lightboxVideo");
const closeBtn = document.getElementById("closeBtn");

function openLightbox(src) {
	lightboxVideo.src = src;
	lightbox.classList.add("active");
}

closeBtn.onclick = () => {
	lightbox.classList.remove("active");
	lightboxVideo.pause();
	lightboxVideo.src = "";
};

lightbox.onclick = (e) => {
	if (e.target === lightbox) closeBtn.click();
};

document.querySelector(".continue").addEventListener("click", ()=>{
    window.location.href = "match.html";
})