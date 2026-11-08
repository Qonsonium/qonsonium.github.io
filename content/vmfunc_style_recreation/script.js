const boot = document.getElementById("boot");
const continueBtn = document.getElementById("continueBtn");
const startBtn = document.getElementById("startBtn");
const startMenu = document.getElementById("startMenu");
const taskClock = document.getElementById("taskClock");
const bigClock = document.getElementById("bigClock");
const lastUpdated = document.getElementById("lastUpdated");
const copyBtn = document.getElementById("copyBtn");

let zIndex = 30;

continueBtn.addEventListener("click", () => {
  boot.classList.add("hidden");
});

document.querySelectorAll("[data-window]").forEach((el) => {
  el.addEventListener("click", (e) => {
    e.preventDefault();
    const id = el.dataset.window;
    openWindow(id);
    startMenu.classList.remove("show");
  });
});

document.querySelectorAll(".close-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const win = e.target.closest(".window");
    if (win) win.classList.add("hidden-window");
  });
});

function openWindow(id) {
  const win = document.getElementById(id);
  if (!win) return;
  win.classList.remove("hidden-window");
  focusWindow(win);
}

function focusWindow(win) {
  document.querySelectorAll(".window").forEach((w) => w.classList.remove("active-window"));
  win.classList.add("active-window");
  win.style.zIndex = ++zIndex;
}

document.querySelectorAll(".window").forEach((win) => {
  win.addEventListener("mousedown", () => focusWindow(win));
});


document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    const target = tab.dataset.tab;

    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));

    tab.classList.add("active");
    document.getElementById(target).classList.add("active");
  });
});


startBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  startMenu.classList.toggle("show");
});

document.addEventListener("click", (e) => {
  if (!startMenu.contains(e.target) && e.target !== startBtn) {
    startMenu.classList.remove("show");
  }
});


function updateClock() {
  const now = new Date();
  const shortTime = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const longTime = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  taskClock.textContent = shortTime;
  bigClock.textContent = longTime;
  lastUpdated.textContent = now.toLocaleString();
}

updateClock();
setInterval(updateClock, 1000);


copyBtn.addEventListener("click", async () => {
  const code = document.getElementById("buttonCode").value;
  try {
    await navigator.clipboard.writeText(code);
    copyBtn.textContent = "Copied!";
    setTimeout(() => (copyBtn.textContent = "Copy"), 1200);
  } catch {
    alert("Could not copy. Select the text manually.");
  }
});


document.querySelectorAll(".window").forEach((win) => {
  const bar = win.querySelector(".titlebar");
  if (!bar) return;

  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;

  bar.addEventListener("mousedown", (e) => {
    if (window.innerWidth <= 900) return;
    dragging = true;
    focusWindow(win);
    offsetX = e.clientX - win.offsetLeft;
    offsetY = e.clientY - win.offsetTop;
    document.body.style.userSelect = "none";
  });

  document.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    win.style.left = `${e.clientX - offsetX}px`;
    win.style.top = `${e.clientY - offsetY}px`;
    win.style.right = "auto";
    win.style.bottom = "auto";
  });

  document.addEventListener("mouseup", () => {
    dragging = false;
    document.body.style.userSelect = "";
  });
});
