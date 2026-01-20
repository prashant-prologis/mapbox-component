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

    modalMap.on("load", async () => {
      initBaseMapUI(modalMap);
      // Sync route data from main map (if any)
      const mainRouteSource = map.getSource("route");
      if (mainRouteSource) {
        const routeData = mainRouteSource._data;
        modalMap.getSource("route")?.setData(routeData);
      }

      modalMap.resize();
      
    });
      const cityData = {
    img: "./assets/icons/city.svg", // Replace with dynamic value from JSON
    name: "City Center",
  };
  const cityMarkerEl = document.createElement("div");
  cityMarkerEl.className = "custom-city-marker";
  cityMarkerEl.innerHTML = `
    <div class="marker-pin">
      <img src="${cityData.img}" alt="${cityData.name}" class="marker-img" />
    </div>
  `;
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

  holder.innerHTML = `
    <div class="top-controls">
      <div class="map-type-btn-gap">
        <button class="btn active" type="button" data-style="streets">Map</button>
        <button class="btn" type="button" data-style="satellite">Satellite</button>
      </div>

      <div class="map-zoom-btn-gap">
        <button class="btn" type="button" data-zoom="out">−</button>
        <button class="btn" type="button" data-zoom="in">+</button>
      </div>
    </div>
  `;

  // Style buttons
  const styleBtns = holder.querySelectorAll("[data-style]");
  styleBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const style = btn.dataset.style;

      modalMap.setStyle(
        style === "satellite"
          ? "./styles-hybrid/style-hybrid.json"
          : "./styles-map/style-map.json"
      );

      styleBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

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