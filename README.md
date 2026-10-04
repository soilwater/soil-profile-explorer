# soil-profile-explorer

A web-based application to explore soil profiles interactively.

Zoomable, high-resolution soil profile photos with horizon boundaries and clickable
features. It's a plain static website (HTML, CSS, JS and
[OpenSeadragon](https://openseadragon.github.io/)) hosted free on GitHub Pages.
There's no server, database or build step.

## Add a profile

Each profile is one folder:

```
profiles/KS-RILEY-01/
  original.jpg     your photo (the only file you add)
  profile.json     the only file you edit
  tiles/           generated: zoom tiles + thumbnail
```

1. **Photograph** the profile with a tape measure visible along the depth.
2. **Create the folder** `profiles/KS-RILEY-01/` and put the photo in it as `original.jpg`.
3. **Tile it.** This needs Python with Pillow installed (`pip install pillow`):
   ```
   python tools/add_profile.py KS-RILEY-01
   ```
   This makes `tiles/`, creates a blank `profile.json`, and adds the profile to the gallery.
4. **Fill in `profile.json`** (see below).
5. **Commit and push.** GitHub Pages updates the site within a minute or two.

To find depths and dot positions, open the profile locally (see below), hover over the
image, and read the readout in the bottom-left corner.

## profile.json

```json
{
  "name": "Riley County pit 1",
  "summary": "One or two sentences.",
  "info": {
    "USDA": "Pachic Argiustoll",
    "Location": "Riley County, Kansas",
    "Parent material": "Loess"
  },
  "credit": "Photo: …, CC BY 4.0 https://…",
  "px_per_cm": 85.3,
  "zero_y_px": 120,
  "horizons": [
    { "name": "Ap", "top_cm": 0, "bottom_cm": 20,
      "description": "Very dark grayish brown (10YR 3/2 moist) silt loam; moderate fine granular structure; friable; abrupt smooth boundary." }
  ],
  "features": [
    { "title": "Carbonate nodules", "x": 1520, "y": 6400, "description": "…" }
  ]
}
```

- `px_per_cm` is the number of image pixels per cm of depth, and `zero_y_px` is the
  pixel row of 0 cm. Get both from the tape in the photo: hover over the 0 cm and
  100 cm marks and read the `y` value for each.
  `px_per_cm = (y at 100 cm − y at 0 cm) / 100`.
- `info` is free-form: every label/value pair appears in the profile's metadata table.
  Add or leave out labels as needed. `WRB`, `USDA` and `Location` also appear on the gallery card.
- URLs in `credit` become links.
- Write horizon descriptions in standard field-description order: color (Munsell), texture,
  structure, consistence, features (mottles, cutans, concretions, carbonates), boundary.
- Horizons are drawn as boundary lines, and their color chips are sampled automatically from
  the photo. Features are drawn as dots at pixel position `x, y`.

## Preview locally

Double-click `serve.bat`, or run `python -m http.server 8000` in this folder, then open
<http://localhost:8000>. Opening `index.html` directly from disk won't work, because
browsers block loading the JSON files from local disk.

## Description view (optional)

The **Viewer / Description** switch on each profile page shows a full-width horizon table,
with a depth-scaled strip of the photo joined to each row by connector bands. Rows grow in
proportion to horizon thickness when there's room. It reads the same `horizons` data.

It is self-contained: to remove it, delete `description.js` and `description.css` and the
two lines marked `optional description view` in `profile.html`.

## Files

```
index.html, gallery.js    gallery
profile.html, viewer.js   profile viewer
description.js/.css       optional description view (see above)
style.css                 styles
data/profiles.json        list of profile folders, in display order
profiles/<ID>/            original.jpg, profile.json, tiles/ (made by the script)
tools/add_profile.py      makes tiles
lib/openseadragon/        OpenSeadragon 6.1.1 (local copy)
```

## Example profiles

Six ISRIC World Soil Reference Collection monoliths, used for teaching and as templates for
our own Kansas profiles. Photos are CC BY-SA 3.0, via [Wikimedia Commons](https://commons.wikimedia.org/).
Site and horizon data are condensed from [ISRIC – World Soil Information](https://isis.isric.org/).
Feature markers and notes were written for this site.

| ID | Soil | Where | Shows |
|---|---|---|---|
| KE-067 | Kastanozem | Kenya highlands | dark grassland topsoil, shrink–swell cracks, carbonates |
| SE-017 | Gleyic Podzol | boreal Sweden | bleached E horizon over humus–iron band |
| UY-001 | Planosol | Uruguay lowlands | abrupt textural change, Fe–Mn nodules, redox mottles |
| BR-013 | Ferralsol | Amazon, Brazil | deep, uniform, highly weathered clay, krotovina |
| DE-014 | Chernozem | Lower Saxony, Germany | thick dark topsoil on loess, worm channels, krotovinas |
| IT-011 | Vertisol | Lazio, Italy | shrink–swell clay, slickensides, wedge-shaped peds |
