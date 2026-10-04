// Profile viewer: profile.html?id=KE-067
// Draws horizons as bands (dashed top line + label) and features as dots on an OpenSeadragon image.
// Clicking a horizon or a dot opens a callout card on the image.

(async () => {
  const id = new URLSearchParams(location.search).get("id");
  const dir = `profiles/${id}/`;
  const p = await (await fetch(dir + "profile.json")).json();
  const $ = sel => document.getElementById(sel);

  // depth (cm) <-> image pixel row
  const yOf = cm => p.zero_y_px + cm * p.px_per_cm;
  const cmOf = y => (y - p.zero_y_px) / p.px_per_cm;

  // ---------- Text ----------
  const info = p.info || {};
  document.title = `${p.name} · Soil Monoliths`;
  $("name").textContent = p.name;
  $("sub").textContent = [info.WRB, info.Location].filter(Boolean).join(" · ");
  $("summary").textContent = p.summary || "";
  for (const [label, value] of Object.entries(info)) {
    if (!value) continue;
    $("info").insertAdjacentHTML("beforeend", "<dt></dt><dd></dd>");
    $("info").lastElementChild.previousElementSibling.textContent = label;
    $("info").lastElementChild.textContent = value;
  }
  // credit text, with any URLs turned into links
  for (const part of (p.credit || "").split(/(https?:\/\/\S+)/)) {
    if (/^https?:\/\//.test(part)) {
      const a = Object.assign(document.createElement("a"), { href: part, target: "_blank", textContent: new URL(part).hostname });
      $("credit").append(a);
    } else $("credit").append(part);
  }

  // ---------- Side lists ----------
  const items = [
    ...p.horizons.map(h => ({ kind: "horizon", data: h, title: h.name, depth: `${h.top_cm}–${h.bottom_cm} cm` })),
    ...p.features.map(f => ({ kind: "feature", data: f, title: f.title, depth: `${Math.round(cmOf(f.y))} cm` })),
  ];
  for (const it of items) {
    it.li = document.createElement("li");
    it.li.innerHTML = `<button><span class="${it.kind === "horizon" ? "chip" : "swatch"}"></span>
      <span class="title"></span><span class="depth"></span></button>`;
    it.li.querySelector(".title").textContent = it.title;
    it.li.querySelector("button").title = it.title;
    it.li.querySelector(".depth").textContent = it.depth;
    it.li.querySelector("button").onclick = () => select(it, true);
    $(it.kind === "horizon" ? "horizons" : "features").append(it.li);
  }

  // ---------- Viewer ----------
  const thumb = new Image();               // also gives the image's aspect ratio for the overview
  thumb.src = dir + "tiles/thumb.jpg";
  await thumb.decode();

  const viewer = OpenSeadragon({
    id: "osd",
    tileSources: dir + "tiles/image.dzi",
    showNavigationControl: false,
    showNavigator: true,
    navigatorPosition: "TOP_RIGHT",
    navigatorHeight: "260px",
    navigatorWidth: Math.max(50, Math.round(260 * thumb.width / thumb.height)) + "px",
    navigatorAutoFade: false,
    visibilityRatio: 1,            // keep the image inside the frame...
    constrainDuringPan: true,      // ...while dragging, not just after
    minZoomImageRatio: 1,          // can't zoom out past the whole profile
    maxZoomPixelRatio: 3,
    gestureSettingsMouse: { clickToZoom: false, dblClickToZoom: true, flickEnabled: false },
    gestureSettingsTouch: { clickToZoom: false, dblClickToZoom: true, flickEnabled: false },
  });
  $("zoom-in").onclick = () => viewer.viewport.zoomBy(1.5);
  $("zoom-out").onclick = () => viewer.viewport.zoomBy(1 / 1.5);
  $("home").onclick = () => viewer.viewport.goHome();

  // "Show" checkboxes: toggle a class on the viewer; hidden things also stop being clickable
  const shown = { grid: true, horizons: true, features: true };
  for (const key of Object.keys(shown)) {
    $(`show-${key}`).onchange = e => {
      shown[key] = e.target.checked;
      $("osd").classList.toggle(`no-${key}`, !shown[key]);
      if (selected && !shown[selected.kind + "s"]) select(null);
    };
  }

  // "Image" presets: a CSS filter on the photo only (overlays keep their colors); see style.css
  document.querySelectorAll('input[name="look"]').forEach(r => r.onchange = () => $("osd").dataset.look = r.value);

  // when the profile is narrower than the frame, keep it centered so it only scrolls up/down
  const narrower = () => viewer.viewport.getBounds().width >= 1;
  viewer.addHandler("canvas-drag", e => { if (narrower()) e.delta.x = 0; });
  viewer.addHandler("canvas-scroll", e => {
    if (!narrower()) return;
    e.preventDefaultAction = true;                       // zoom about the profile's center line
    const ref = viewer.viewport.pointFromPixel(e.position);
    ref.x = 0.5;
    viewer.viewport.zoomBy(e.scroll > 0 ? 1.2 : 1 / 1.2, ref);
    viewer.viewport.applyConstraints();
  });
  viewer.addHandler("animation-finish", () => {
    const c = viewer.viewport.getCenter();
    if (narrower() && Math.abs(c.x - 0.5) > 1e-4) viewer.viewport.panTo(new OpenSeadragon.Point(0.5, c.y));
  });

  let width, height;
  viewer.addHandler("open", () => {
    ({ x: width, y: height } = viewer.world.getItemAt(0).getContentSize());
    const vp = viewer.viewport;
    const add = (el, x, y, w, h) => viewer.addOverlay({ element: el, location: vp.imageToViewportRectangle(x, y, w, h) });

    // start zoomed in on the top ~50 cm (the Full profile button shows everything)
    vp.fitBounds(vp.imageToViewportRectangle(0, 0, width, Math.min(height, yOf(50))), true);

    // 10 x 10 cm grid, starting at 0 cm
    const grid = document.createElement("div");
    grid.className = "grid";
    const step = 10 * p.px_per_cm, gridH = height - yOf(0);
    grid.style.backgroundSize = `${(step / width) * 100}% 100%, 100% ${(step / gridH) * 100}%`;
    add(grid, 0, yOf(0), width, gridH);

    // one band per horizon (its top edge is the boundary line), plus a line under the last one
    for (const it of items.filter(i => i.kind === "horizon")) {
      it.el = document.createElement("div");
      it.el.className = "band";
      it.el.appendChild(document.createElement("span")).textContent = `${it.title} · ${it.depth}`;
      add(it.el, 0, yOf(it.data.top_cm), width, yOf(it.data.bottom_cm) - yOf(it.data.top_cm));
    }
    const last = document.createElement("div");
    last.className = "line";
    add(last, 0, yOf(p.horizons.at(-1).bottom_cm), width, 0);

    for (const it of items.filter(i => i.kind === "feature")) {
      it.el = document.createElement("div");
      it.el.className = "dot";
      viewer.addOverlay({ element: it.el, location: vp.imageToViewportCoordinates(it.data.x, it.data.y),
                          placement: OpenSeadragon.Placement.CENTER });
    }

    // horizon color chips: sampled from the middle of each horizon in the thumbnail
    const c = Object.assign(document.createElement("canvas"), { width: thumb.width, height: thumb.height });
    const ctx = c.getContext("2d");
    ctx.drawImage(thumb, 0, 0);
    for (const it of items.filter(i => i.kind === "horizon")) {
      const bottom = Math.min(it.data.bottom_cm, cmOf(height));      // only the part inside the photo
      const y = yOf((it.data.top_cm + bottom) / 2) * thumb.height / height;
      const px = ctx.getImageData(thumb.width * 0.3, y - 2, thumb.width * 0.4, 4).data;
      const avg = [0, 1, 2].map(k => { let s = 0; for (let i = k; i < px.length; i += 4) s += px[i]; return Math.round(s / (px.length / 4)); });
      it.li.querySelector(".chip").style.background = `rgb(${avg})`;
    }
  });

  // ---------- What is under the pointer: a dot (within 14 px), otherwise the horizon at that depth ----------
  function hitTest(pos) {
    const vp = viewer.viewport;
    const dot = shown.features && items.find(it => it.kind === "feature" &&
      vp.imageToViewerElementCoordinates(new OpenSeadragon.Point(it.data.x, it.data.y)).distanceTo(pos) < 14);
    if (dot) return dot;
    const depth = cmOf(vp.viewerElementToImageCoordinates(pos).y);
    return (shown.horizons && items.find(it => it.kind === "horizon" && depth >= it.data.top_cm && depth < it.data.bottom_cm)) || null;
  }

  viewer.addHandler("canvas-click", e => { if (e.quick) select(hitTest(e.position), false); });

  // hover: highlight what would be selected, show the depth readout
  let hovered = null;
  viewer.element.addEventListener("pointermove", ev => {
    const r = viewer.element.getBoundingClientRect();
    const pos = new OpenSeadragon.Point(ev.clientX - r.left, ev.clientY - r.top);
    const pt = viewer.viewport.viewerElementToImageCoordinates(pos);
    $("depth").textContent = `${cmOf(pt.y).toFixed(1)} cm`;
    $("xy").textContent = `x ${Math.round(pt.x)}, y ${Math.round(pt.y)}`;

    const hit = hitTest(pos);
    if (hit !== hovered) {
      hovered?.el?.classList.remove("hover");
      hit?.el?.classList.add("hover");
      hovered = hit;
      viewer.canvas.style.cursor = hit ? "pointer" : "";
    }
  });
  viewer.element.addEventListener("pointerleave", () => { hovered?.el?.classList.remove("hover"); hovered = null; });

  // ---------- Selection: a callout card on the image for both horizons and features ----------
  let selected = null;
  $("c-close").onclick = () => select(null);

  function select(it, zoom) {
    selected = it;
    items.forEach(i => { i.li.classList.toggle("active", i === it); i.el?.classList.toggle("active", i === it); });
    $("callout").hidden = $("leader").hidden = !it;
    if (!it) return;

    $("c-depth").textContent = `${it.kind === "horizon" ? "Horizon" : "Feature"} · ${it.depth}`;
    $("c-title").textContent = it.title;
    $("c-text").textContent = it.data.description;
    placeCallout();

    if (zoom) {
      const r = it.kind === "horizon"
        ? [0, yOf(it.data.top_cm), width, yOf(it.data.bottom_cm) - yOf(it.data.top_cm)]
        : [it.data.x - 8 * p.px_per_cm, it.data.y - 8 * p.px_per_cm, 16 * p.px_per_cm, 16 * p.px_per_cm];
      viewer.viewport.fitBounds(viewer.viewport.imageToViewportRectangle(...r));
    }
  }

  // keep the callout next to its anchor while panning/zooming, joined by a leader line
  viewer.addHandler("update-viewport", placeCallout);

  function placeCallout() {
    if (!selected) return;
    const card = $("callout"), line = $("leader"), stage = $("stage"), vp = viewer.viewport;
    const W = stage.clientWidth, H = stage.clientHeight;
    const screen = (x, y) => vp.imageToViewerElementCoordinates(new OpenSeadragon.Point(x, y));

    // anchor: the dot itself, or the middle of the visible part of the horizon band (right side of the soil)
    let a;
    if (selected.kind === "feature") {
      a = screen(selected.data.x, selected.data.y);
    } else {
      const t = Math.max(0, screen(0, yOf(selected.data.top_cm)).y), b = Math.min(H, screen(0, yOf(selected.data.bottom_cm)).y);
      a = b > t ? new OpenSeadragon.Point(Math.min(W - 20, screen(width * 0.8, 0).x), (t + b) / 2) : null;
    }
    const onScreen = a && a.x >= 0 && a.x <= W && a.y >= 0 && a.y <= H;
    card.hidden = line.hidden = !onScreen;
    if (!onScreen) return;

    // card to the right of the anchor (left if there's no room), slightly above, kept inside the frame
    const gap = 60, cw = card.offsetWidth, ch = card.offsetHeight;
    const right = a.x + gap + cw < W - 8;
    const left = Math.max(8, right ? a.x + gap : a.x - gap - cw);
    const top = Math.min(Math.max(a.y - ch / 2 - 30, 8), H - ch - 8);
    card.style.left = `${left}px`;
    card.style.top = `${top}px`;

    // leader line from the anchor to the card's near edge
    const ax = right ? left : left + cw, ay = top + Math.min(ch / 2, 28);
    const len = Math.hypot(ax - a.x, ay - a.y), ang = Math.atan2(ay - a.y, ax - a.x);
    Object.assign(line.style, { left: `${a.x}px`, top: `${a.y}px`, width: `${len}px`, transform: `rotate(${ang}rad)` });
  }
})();
