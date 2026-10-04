// Description view (optional add-on): a full-width horizon table, with a depth-scaled
// profile strip whose horizons are joined to their table rows by connector bands.
// To remove: delete description.js + description.css and their two lines in profile.html.

(async () => {
  const id = new URLSearchParams(location.search).get("id");
  const dir = `profiles/${id}/`;
  const [p, dzi] = await Promise.all([
    fetch(dir + "profile.json").then(r => r.json()),
    fetch(dir + "tiles/image.dzi").then(r => r.text()),
  ]);
  const thumb = new Image();
  thumb.src = dir + "tiles/thumb.jpg";
  await thumb.decode();
  const scale = thumb.naturalHeight / +dzi.match(/Height="(\d+)"/)[1];   // thumbnail px per full-image px

  // ---------- Viewer / Description switch in the header ----------
  const sw = document.createElement("div");
  sw.className = "view-switch";
  sw.innerHTML = `<button data-view="viewer" aria-pressed="true">Viewer</button><button data-view="description" aria-pressed="false">Description</button>`;
  document.querySelector(".site-header").append(sw);

  // ---------- The view: strip | connectors | table ----------
  const view = document.createElement("main");
  view.className = "description";
  view.hidden = true;
  view.innerHTML = `
    <div class="desc-grid">
      <canvas class="desc-strip"></canvas>
      <svg class="desc-links"></svg>
      <table class="desc-table">
        <thead><tr><th>Horizon</th><th>Depth (cm)</th><th>Description</th></tr></thead>
        <tbody></tbody>
      </table>
    </div>
    <p class="desc-note">The strip is drawn to depth scale. Click a row to see that horizon in the viewer.</p>`;
  document.querySelector(".layout").after(view);

  const tbody = view.querySelector("tbody");
  for (const h of p.horizons) {
    const tr = tbody.insertRow();
    for (const text of [h.name, `${h.top_cm}–${h.bottom_cm}`, h.description]) tr.insertCell().textContent = text;
    tr.onclick = () => {
      show("viewer");
      document.querySelector(`#horizons button[title="${CSS.escape(h.name)}"]`)?.click();
    };
  }

  sw.onclick = e => { const b = e.target.closest("button"); if (b) show(b.dataset.view); };
  addEventListener("resize", () => { if (!view.hidden) draw(); });
  if (location.hash === "#description") show("description");

  function show(which) {
    const desc = which === "description";
    view.hidden = !desc;
    sw.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", b.dataset.view === which));
    history.replaceState(null, "", location.pathname + location.search + (desc ? "#description" : ""));
    if (desc) draw();
  }

  // ---------- Draw the strip and connector bands to match the table's row positions ----------
  function draw() {
    const canvas = view.querySelector("canvas"), svg = view.querySelector("svg");
    const maxCm = p.horizons.at(-1).bottom_cm;

    // Make rows match horizon thickness as far as the text allows: each row gets
    // max(its natural height, thickness × k), with k chosen to fill a comfortable height.
    const rows = [...tbody.rows];
    rows.forEach(r => r.style.height = "");
    const natural = rows.map(r => r.offsetHeight);
    const thick = p.horizons.map(h => h.bottom_cm - h.top_cm);
    const target = Math.max(natural.reduce((a, b) => a + b, 0), 520, innerHeight - 200);
    const fill = k => rows.reduce((s, _, i) => s + Math.max(natural[i], thick[i] * k), 0);
    let lo = 0, hi = target;
    for (let n = 0; n < 40; n++) { const mid = (lo + hi) / 2; fill(mid) < target ? lo = mid : hi = mid; }
    rows.forEach((r, i) => r.style.height = `${Math.max(natural[i], thick[i] * lo)}px`);

    const top = tbody.offsetTop, H = tbody.offsetHeight;
    const k = H / maxCm;                                            // screen px per cm on the strip
    const sy = p.zero_y_px * scale, sh = maxCm * p.px_per_cm * scale;  // strip's source rows in the thumbnail
    const W = Math.round(Math.min(170, Math.max(70, H * thumb.naturalWidth / sh)));

    const dpr = devicePixelRatio || 1;
    Object.assign(canvas, { width: W * dpr, height: H * dpr });
    Object.assign(canvas.style, { width: `${W}px`, height: `${H}px`, marginTop: `${top}px` });
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(thumb, 0, sy, thumb.naturalWidth, sh, 0, 0, W, H);

    ctx.strokeStyle = "rgba(255,255,255,.85)";
    ctx.setLineDash([4, 3]);
    for (const h of p.horizons.slice(1)) {
      ctx.beginPath(); ctx.moveTo(0, h.top_cm * k); ctx.lineTo(W, h.top_cm * k); ctx.stroke();
    }

    const L = 56;
    svg.setAttribute("width", L);
    svg.setAttribute("height", H);
    svg.style.marginTop = `${top}px`;
    svg.innerHTML = p.horizons.map((h, i) => {
      const row = tbody.rows[i], r1 = row.offsetTop - top, r2 = r1 + row.offsetHeight;
      // alternating shades match the zebra-striped table rows
      return `<polygon points="0,${h.top_cm * k} ${L},${r1} ${L},${r2} 0,${h.bottom_cm * k}"
                fill="#fff" fill-opacity="${i % 2 ? 0.04 : 0.14}" stroke="rgba(255,255,255,.55)" stroke-width="1" />`;
    }).join("");
  }
})();
