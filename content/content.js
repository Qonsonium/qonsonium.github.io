const btn = document.getElementById("load-ppt");
const container = document.getElementById("ppt-container");

btn.addEventListener("click", () => {



if (isActive) {
    container.innerHTML = `
        <iframe 
        src="https://1drv.ms/p/c/7e906219fa19eb95/IQQYKa1E75O7TZ6j1z7Astv-AZjy4f_2CUw3OpgtOHm07Wk" 
        class="bombay-embed"
        loading="lazy"
        title="Presentation"> 
        </iframe>
    `;
  } else {
    container.innerHTML = "";
  }
});




const seek = document.getElementById('seekbar');
if (seek) {
  function updateSeekBg() {
    const min = Number(seek.min) || 0;
    const max = Number(seek.max) || 100;
    const val = Number(seek.value);
    const pct = ((val - min) / (max - min)) * 100;
    seek.style.setProperty('--percent', pct + '%');
  }
  seek.addEventListener('input', updateSeekBg);
  // initialize on load
  updateSeekBg();
}
(() => {
  const windowIds = ["demos", "chiptuneplayer"];
  let highestZ = 100;

  windowIds.forEach((id) => {
    const win = document.getElementById(id);
    const bar = win?.querySelector(".title-bar");
    const closeButton = win?.querySelector(".window-close");

    if (!win || !bar) {
      return;
    }

    let activePointer = null;
    let offsetX = 0;
    let offsetY = 0;

    bar.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".window-close")) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;

      const rect = win.getBoundingClientRect();
      win.style.position = "fixed";
      win.style.width = `${rect.width}px`;
      win.style.left = `${rect.left}px`;
      win.style.top = `${rect.top}px`;
      win.style.margin = "0";
      win.style.transform = "none";
      win.style.zIndex = `${++highestZ}`;
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      activePointer = e.pointerId;
      bar.setPointerCapture(e.pointerId);
      e.preventDefault();
    });

    bar.addEventListener("pointermove", (e) => {
      if (activePointer !== e.pointerId) return;

      const minLeft = Math.min(0, 96 - win.offsetWidth);
      const maxLeft = window.innerWidth - win.offsetWidth;
      const left = Math.min(maxLeft, Math.max(minLeft, e.clientX - offsetX));
      const top = Math.min(
        Math.max(0, window.innerHeight - bar.offsetHeight),
        Math.max(0, e.clientY - offsetY)
      );
      win.style.left = `${left}px`;
      win.style.top = `${top}px`;
    });

    function stopDrag(e) {
      if (activePointer !== e.pointerId) return;
      activePointer = null;
    }

    bar.addEventListener("pointerup", stopDrag);
    bar.addEventListener("pointercancel", stopDrag);
    bar.addEventListener("lostpointercapture", stopDrag);

    win.addEventListener("pointerdown", () => {
      win.style.zIndex = `${++highestZ}`;
    });

    closeButton?.addEventListener("click", (e) => {
      e.stopPropagation();
      win.hidden = true;
    });
  });
})();