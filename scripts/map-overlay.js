// map-modal
const mapModalEl = document.getElementById("mapModal");
const openMapBtn = document.querySelector(".js-open-map");
const closeMapBtns = document.querySelectorAll(".js-close-map");

let modalMap = null;

function openMapModal() {
  if (!mapModalEl) return;
  mapModalEl.classList.add("is-open");
  mapModalEl.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");

  if (!modalMap) {
    modalMap = new mapboxgl.Map({
      container: "mapModalCanvas",
      style: BASE_STYLE_URL,
      center: map.getCenter(),
      zoom: map.getZoom(),
      bearing: map.getBearing(),
      pitch: map.getPitch(),
      attributionControl: false,
    });
    registerMap("modal", modalMap);

    const cityData = {
      img: "./assets/icons/city.svg", // Replace with dynamic value from JSON
      name: "City Center",
    };
    const cityMarkerEl = document.createElement("div");
    //city marker innerhtml fix
    const markerPin = document.createElement("div");
    markerPin.className = "marker-pin";

    const img = document.createElement("img");
    img.className = "marker-img";
    img.src = cityData.img;
    img.alt = cityData.name || "";

    markerPin.appendChild(img);
    cityMarkerEl.appendChild(markerPin);
    // city marker ends
    new mapboxgl.Marker({ element: cityMarkerEl, anchor: "bottom" })
      .setLngLat(propertyLngLat)
      .addTo(modalMap);
  }
  injectTopControlsIntoModal(modalMap);

  requestAnimationFrame(() => modalMap?.resize());
}
function injectTopControlsIntoModal(modalMap) {
  const holder = document.querySelector("#mapModal .top-controls-holder");
  if (!holder || holder.children.length) return;
  // innerhtml fix
  // Clear holder safely
  holder.replaceChildren();

  // map-ui
  const mapUI = document.createElement("div");
  mapUI.className = "map-ui";
  mapUI.dataset.mapId = "modal";

  // top-controls
  const topControls = document.createElement("div");
  topControls.className = "top-controls";

  // map-type-btn-gap
  const mapTypeGap = document.createElement("div");
  mapTypeGap.className = "map-type-btn-gap";

  const mapBtn = document.createElement("button");
  mapBtn.className = "btn active";
  mapBtn.type = "button";
  mapBtn.dataset.style = "streets";
  mapBtn.setAttribute("aria-label", "Switch to map view");
  mapBtn.textContent = "Map";
  mapBtn.onclick = () => setMapStyle("streets", mapBtn);

  const satelliteBtn = document.createElement("button");
  satelliteBtn.className = "btn";
  satelliteBtn.type = "button";
  satelliteBtn.dataset.style = "satellite";
  satelliteBtn.setAttribute("aria-label", "Switch to satellite view");
  satelliteBtn.textContent = "Satellite";
  satelliteBtn.onclick = () => setMapStyle("satellite", satelliteBtn);

  mapTypeGap.append(mapBtn, satelliteBtn);

  // map-zoom-btn-gap
  const zoomGap = document.createElement("div");
  zoomGap.className = "map-zoom-btn-gap";

  const zoomOutBtn = document.createElement("button");
  zoomOutBtn.className = "btn";
  zoomOutBtn.type = "button";
  zoomOutBtn.dataset.zoom = "out";
  zoomOutBtn.setAttribute("aria-label", "Zoom out");
  zoomOutBtn.textContent = "−";

  const zoomInBtn = document.createElement("button");
  zoomInBtn.className = "btn";
  zoomInBtn.type = "button";
  zoomInBtn.dataset.zoom = "in";
  zoomInBtn.setAttribute("aria-label", "Zoom in");
  zoomInBtn.textContent = "+";

  zoomGap.append(zoomOutBtn, zoomInBtn);

  // assemble
  topControls.append(mapTypeGap, zoomGap);
  mapUI.appendChild(topControls);
  holder.appendChild(mapUI);
  // innerhtml fix ends

  // Zoom buttons
  holder.querySelector("[data-zoom='in']")?.addEventListener("click", () => modalMap.zoomIn());
  holder.querySelector("[data-zoom='out']")?.addEventListener("click", () => modalMap.zoomOut());
}
function closeMapModal() {
  if (!mapModalEl) return;
  mapModalEl.classList.remove("is-open");
  mapModalEl.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

openMapBtn?.addEventListener("click", openMapModal);
closeMapBtns.forEach((btn) =>
  btn.addEventListener("click", closeMapModal)
);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && mapModalEl.classList.contains("is-open")) {
    closeMapModal();
  }
});

// map-modal ends