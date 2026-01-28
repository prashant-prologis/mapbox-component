const rootStyles = getComputedStyle(document.documentElement);

// Main JS for Mapbox UI
mapboxgl.accessToken =
  "pk.eyJ1IjoicGhvbGxpcy1wcm9sb2dpcyIsImEiOiJjbWl4cGt1ajUwN2JpM2RvOXdqOWFmb3U3In0.RyiaedumDC0gnw6FeFKqrA ";

const propertyLngLat = [-118.1415219999, 33.978311];

const BASE_STYLE_URL =
  "mapbox://styles/phollis-prologis/cmixr0gqa000d01rj1py34kjg";

const map = new mapboxgl.Map({
  container: "map",
  style: BASE_STYLE_URL,
  attributionControl: false,
  center: propertyLngLat,
  zoom: 14,
});
window.map = map

function setMapStyle(style, el) {
  setStyle(style);
  const buttons = el.parentElement.querySelectorAll(".btn");
  buttons.forEach((btn) => btn.classList.remove("active"));
  el.classList.add("active");
  document.body.classList.toggle("is-satellite", style === "satellite");
}

function setStyle(type) {
  map.setStyle(
    type === "satellite"
      ? "./styles-hybrid/style-hybrid.json"
      : "./styles-map/style-map.json"
  );
}

// Toggle Map Filters (mobile)
function toggleMapFilters() {
  const filters = document.querySelector(".bottom-controls");
  filters.classList.toggle("is-visible");
}

// Hide filter pills by default on mobile
function handleMobileFilters() {
  const filters = document.querySelector(".bottom-controls");
  const toggleBtn = document.querySelector(".map-filters-toggle");
  if (window.innerWidth <= 600) {
    filters.classList.remove("is-visible");
    toggleBtn.style.display = "flex";
  } else {
    filters.classList.add("is-visible");
    toggleBtn.style.display = "none";
  }
}
window.addEventListener("resize", handleMobileFilters);
window.addEventListener("DOMContentLoaded", handleMobileFilters);
//
const placesToken =
  "AAPTxy8BH1VEsoebNVZXo8HurLmr_fzoB_OJeMHTT117x7yTw6PTdp6kXVqjeR36gVvs31jWOHGqDqy2itT7XXo-Ba2PD9gPJ5hHjfWEMI3cWeGYEVX65AU5PTA1vvNcB1OlwIpmCy9rlHQzXdy8cvBbIy8bQ674ZYxWTY1uPclh1jpg84krvHrUH8yqu0OIxydKtn7uhxS1Ydj2kv97eWoGXtP2xuTUwVaLdk3H7k9HjtY.AT1_82PMU3Il";
const placesRadiusMeters = Number(1609.344); // NEED TO MAKE THIS DYNAMIC [default 8kms]
const placesPageSize = Number(20);
map.on("load", async () => {
  // Route line
  map.addSource("route", {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: [],
    },
  });
  map.addLayer({
    id: "route",
    type: "line",
    source: "route",
    layout: {
      "line-join": "round",
      "line-cap": "round",
    },
    paint: {
      "line-color": "#22C3B3",
      "line-width": 5,
    },
  });

  // for start & end point dots on map
  map.addSource("route-points", {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: [],
    },
  });
  // dots layer added
  map.addLayer({
    id: "route-points",
    type: "circle",
    source: "route-points",
    paint: {
      "circle-radius": 7,
      "circle-color": "#22C3B3",
      "circle-stroke-width": 1,
      "circle-stroke-color": "#ffffff",
    },
  });

  // Custom city marker at map center
  // Accept city image from a variable
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
    .addTo(map);

  // Markers
  // Build points dynamically from ArcGIS Places
  function arcgisResultsToPoints(results, fallbackAddress = "") {
    return (results || [])
      .map((r) => {
        const x = r?.location?.x;
        const y = r?.location?.y;
        if (typeof x !== "number" || typeof y !== "number") return null;

        return {
          lngLat: [x, y],
          name: String(r?.name || "Place"),
          address: String(
            r?.address?.streetAddress ||
              r?.address?.label ||
              r?.address?.locality ||
              fallbackAddress
          ),
          _id: r?.placeId, // for dedupe
        };
      })
      .filter(Boolean);
  }

  function dedupePoints(list) {
    const seen = new Set();
    const out = [];
    for (const p of list) {
      const key =
        p._id ||
        `${p.lngLat[0].toFixed(6)},${p.lngLat[1].toFixed(6)}|${p.name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(p);
    }
    return out;
  }

  // Fetch ArcGIS categories per pill
  const [
    foodRestaurant,
    foodGrocery,
    transportBus,
    transportTrain,
    amenitiesPark,
  ] = await Promise.all([
    fetchArcgisPlacesNearPoint({
      lng: propertyLngLat[0],
      lat: propertyLngLat[1],
      searchText: "restaurant",
      radiusMeters: placesRadiusMeters,
      pageSize: placesPageSize,
      token: placesToken,
    }),
    fetchArcgisPlacesNearPoint({
      lng: propertyLngLat[0],
      lat: propertyLngLat[1],
      searchText: "grocery",
      radiusMeters: placesRadiusMeters,
      pageSize: placesPageSize,
      token: placesToken,
    }),
    fetchArcgisPlacesNearPoint({
      lng: propertyLngLat[0],
      lat: propertyLngLat[1],
      searchText: "bus",
      radiusMeters: placesRadiusMeters,
      pageSize: placesPageSize,
      token: placesToken,
    }),
    fetchArcgisPlacesNearPoint({
      lng: propertyLngLat[0],
      lat: propertyLngLat[1],
      searchText: "train",
      radiusMeters: placesRadiusMeters,
      pageSize: placesPageSize,
      token: placesToken,
    }),
    fetchArcgisPlacesNearPoint({
      lng: propertyLngLat[0],
      lat: propertyLngLat[1],
      searchText: "park",
      radiusMeters: placesRadiusMeters,
      pageSize: placesPageSize,
      token: placesToken,
    }),
  ]);

  // Now build points in the exact structure the pills expect
  const points = {
    food: dedupePoints([
      ...arcgisResultsToPoints(foodRestaurant, "Food"),
      ...arcgisResultsToPoints(foodGrocery, "Food"),
    ]),
    transport: dedupePoints([
      ...arcgisResultsToPoints(transportBus, "Transport"),
      ...arcgisResultsToPoints(transportTrain, "Transport"),
    ]),
    amenities: dedupePoints([
      ...arcgisResultsToPoints(amenitiesPark, "Amenity"),
    ]),
  };

  // MARKER COLORS:
  const colors = {
    food: rootStyles.getPropertyValue("--color-food-pin").trim(),
    transport: rootStyles.getPropertyValue("--color-transport-pin").trim(),
    amenities: rootStyles.getPropertyValue("--color-amenities-pin").trim(),
  };
  // const colors = {
  //   food: "#88FF8D",
  //   transport: "#DBD94B",
  //   amenities: "#4BA3DB",
  // };
  const icons = {
    food: "./assets/icons/food-dark.svg",
    transport: "./assets/icons/transport-dark.svg",
    amenities: "./assets/icons/amenities-dark.svg",
  };
  // Create markers for selected POI/s
  const markersByLayer = {};
  for (const layer in points) {
    // markersByLayer[layer] = points[layer].map((item) => {
    //         const marker = new mapboxgl.Marker({ color: colors[layer] }).setLngLat(
    //     item.lngLat
    //   );
    markersByLayer[layer] = points[layer].map((item) => {
      const el = document.createElement("div");
      el.className = "pin-marker";
      el.style.setProperty("--pin-color", colors[layer]);

      el.innerHTML = `
      <div class="pin">
        <img src="${icons[layer]}" alt="${layer}" />
      </div>
    `;

      const marker = new mapboxgl.Marker(el).setLngLat(item.lngLat);

      // Use flex column for popup content
      const popupContent = `
        <div class="popup-content-flex">
          <strong>${item.name}</strong>
          <span>${item.address}</span>
        </div>
      `;
      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(popupContent);
      marker.setPopup(popup);
      return marker;
    });
  }

  const enabled = new Set();
  // disable the pins POI inside popup
  function resetPillsAndPins() {
    // Remove active UI for pills
    controls.querySelectorAll(".pill").forEach((btn) => {
      btn.classList.remove("is-active");
      btn.setAttribute("aria-selected", "false");
    });

    // Remove all markers from map and clear enabled layers
    enabled.forEach((layer) => {
      (markersByLayer[layer] || []).forEach((m) => m.remove());
    });
    enabled.clear();
  }

  function toggleLayer(layer) {
    const list = markersByLayer[layer] || [];
    const turnOn = !enabled.has(layer);

    if (turnOn) {
      enabled.add(layer);
      list.forEach((m) => m.addTo(map));
    } else {
      enabled.delete(layer);
      list.forEach((m) => m.remove());
    }

    return turnOn;
  }

  // Single event listener
  const controls = document.querySelector(".bottom-controls");
  controls.addEventListener("click", (e) => {
    const btn = e.target.closest(".pill");
    if (!btn) return;

    const layer = btn.dataset.type;
    const isOn = toggleLayer(layer);

    // active UI
    btn.classList.toggle("is-active", isOn);
    btn.setAttribute("aria-selected", isOn ? "true" : "false");
  });

  // click Nearby Routes cards
  document.querySelectorAll(".nearby-route-card").forEach((card) => {
    card.style.cursor = "pointer";

    card.addEventListener("click", async () => {
      try {
        const res = await fetch("./data/data.geojson"); // adjust path!
        console.log("res: ", res);
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
        const geojson = await res.json();
        updateRoute(geojson);
      } catch (err) {
        console.error("Failed to load route GeoJSON:", err);
      }
    });
  });
});

// to update the route
function updateRoute(geojson) {
  console.log("geoJSON: ".geojson);
  let data = geojson;

  if (geojson.type === "FeatureCollection") {
    // data = geojson.features?.[0];
    data = geojson.features?.[5];
    console.log("[]1: ", data);
    updateStartEndPoints(data);
  } else if (
    geojson.type === "LineString" ||
    geojson.type === "MultiLineString"
  ) {
    data = { type: "Feature", properties: {}, geometry: geojson };
  }

  if (!data || data.type !== "Feature") {
    console.error("Invalid GeoJSON for route:", geojson);
    return;
  }

  const src = map.getSource("route");
  if (!src) return; // map not loaded yet
  src.setData(data); // updates route dynamically
}
// start end dots
function updateStartEndPoints(routeFeature) {
  console.log("routeFeature: ", routeFeature);
  const coords = routeFeature?.geometry?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return;

  const start = coords[0]; // [lng, lat]
  const end = coords[coords.length - 1]; // [lng, lat]

  map.getSource("route-points").setData({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { pt: "start" },
        geometry: { type: "Point", coordinates: start },
      },
      {
        type: "Feature",
        properties: { pt: "end" },
        geometry: { type: "Point", coordinates: end },
      },
    ],
  });
}

// arcGIS
// ArcGIS Places fetch (NEW)
async function fetchArcgisPlacesNearPoint({
  lng,
  lat,
  searchText,
  radiusMeters,
  pageSize,
  token,
}) {
  const params = new URLSearchParams({
    x: String(lng),
    y: String(lat),
    radius: String(radiusMeters || 1609.344),
    pageSize: String(pageSize || 20),
    f: "json",
  });

  const st = String(searchText || "").trim();
  if (st.length >= 3) params.set("searchText", st);

  const url = `https://places-api.arcgis.com/arcgis/rest/services/places-service/v1/places/near-point?${params.toString()}`;

  const resp = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`ArcGIS Places HTTP ${resp.status}: ${text}`);
  }

  const data = await resp.json();
  if (!Array.isArray(data.results))
    throw new Error("ArcGIS Places response missing results[]");
  return data.results;
}
// add top controls to modal-map
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
  holder
    .querySelector("[data-zoom='in']")
    ?.addEventListener("click", () => modalMap.zoomIn());
  holder
    .querySelector("[data-zoom='out']")
    ?.addEventListener("click", () => modalMap.zoomOut());
}
// market-map
