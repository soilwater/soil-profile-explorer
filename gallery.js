// Gallery: one card per profile listed in data/profiles.json

(async () => {
  const ids = await (await fetch("data/profiles.json")).json();

  for (const id of ids) {
    const p = await (await fetch(`profiles/${id}/profile.json`)).json();
    const info = p.info || {};
    const card = document.createElement("a");
    card.className = "card";
    card.href = `profile.html?id=${encodeURIComponent(id)}`;
    card.innerHTML = `
      <img src="profiles/${id}/tiles/thumb.jpg" alt="">
      <div class="card-body">
        <h3></h3><div class="class"></div><div class="place"></div>
        <div class="summary"></div><div class="meta"></div>
      </div>`;
    card.querySelector("h3").textContent = p.name;
    card.querySelector(".class").textContent = [info.WRB, info.USDA].filter(Boolean).join(" · ");
    card.querySelector(".place").textContent = info.Location || "";
    card.querySelector(".summary").textContent = p.summary || "";
    card.querySelector(".meta").textContent = `${p.horizons.length} horizons · ${p.features.length} features`;
    document.getElementById("cards").append(card);
  }
})();
