const rootStyles = getComputedStyle(document.documentElement);

// Main JS for Mapbox UI
mapboxgl.accessToken =
  "pk.eyJ1IjoicGhvbGxpcy1wcm9sb2dpcyIsImEiOiJjbWl4cGt1ajUwN2JpM2RvOXdqOWFmb3U3In0.RyiaedumDC0gnw6FeFKqrA";

const propertyLngLat = [
  -118.1415221999, 33.978311];

const BASE_STYLE_URL = "mapbox://styles/phollis-prologis/cmixr0gqa000d01rj1py34kjg";

const map = new mapboxgl.Map({
  container: "map",
  style: BASE_STYLE_URL,
  attributionControl: false,
  center: propertyLngLat,
  zoom: 13,
});

// fix for route disapperaing on style change
// Keep the last selected route so we can re-render after style changes
let currentRouteFeature = null;
function ensureRouteLayers() {
  // Route line
  if (!map.getSource("route")) {
    map.addSource("route", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] }
    });
  }
  if (!map.getLayer("route")) {
    map.addLayer({
      id: "route",
      type: "line",
      source: "route",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": "#22C3B3", "line-width": 5 }
    });
  }

  // Start/end points
  if (!map.getSource("route-points")) {
    map.addSource("route-points", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] }
    });
  }
  if (!map.getLayer("route-points")) {
    map.addLayer({
      id: "route-points",
      type: "circle",
      source: "route-points",
      paint: {
        "circle-radius": 7,
        "circle-color": "#22C3B3",
        "circle-stroke-width": 1,
        "circle-stroke-color": "#ffffff"
      }
    });
  }
}
// When style changes (satellite/map), Mapbox removes custom layers/sources.
// Re-add them and re-apply the current route.
map.on("style.load", () => {
  ensureRouteLayers();

  if (currentRouteFeature) {
    const routeSrc = map.getSource("route");
    if (routeSrc) routeSrc.setData(currentRouteFeature);
    updateStartEndPoints(currentRouteFeature);
  }
});

// fix ends
const mapsById = new Map(); 

function registerMap(mapId, mapInstance) {
  mapsById.set(mapId, mapInstance);
}
registerMap("main", map);

function setMapStyle(style, el) {
  const ui = el.closest(".map-ui");
  if (!ui) return;

  const group = el.closest(".map-type-btn-gap");
  group.querySelectorAll(".btn").forEach((btn) => btn.classList.remove("active"));
  el.classList.add("active");

  ui.classList.toggle("is-satellite", style === "satellite");

  if (style === "satellite") {
    ui.querySelectorAll(".bottom-controls .pill")
      .forEach((pill) => pill.setAttribute("aria-selected", "false"));
  }

  setStyle(style, ui);
}


function setStyle(type, ui) {
  const mapId = ui.dataset.mapId;
  const mapInstance = mapsById.get(mapId);
  if (!mapInstance) return;

  mapInstance.setStyle(
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

const placesToken = "AAPTxy8BH1VEsoebNVZXo8HurLmr_fzoB_OJeMHTT117x7yTw6PTdp6kXVqjeR36gVvs31jWOHGqDqy2itT7XXo-Ba2PD9gPJ5hHjfWEMI3cWeGYEVX65AU5PTA1vvNcB1OlwIpmCy9rlHQzXdy8cvBbIy8bQ674ZYxWTY1uPclh1jpg84krvHrUH8yqu0OIxydKtn7uhxS1Ydj2kv97eWoGXtP2xuTUwVaLdk3H7k9HjtY.AT1_82PMU3Il"
const placesRadiusMeters = Number(1609.344); // NEED TO MAKE THIS DYNAMIC [default 8kms]
const placesPageSize = Number(20);
map.on("load", async () => {
ensureRouteLayers();


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

  // Fetch ArcGIS categories per pill // arcGis api call starts
  const searchGroups = [
    {
      key: "food",
      terms: ["Restaurant", "Fast Food Restaurant", "Cafe", "Convenience Store", "Supermarket"],
      pointType: "Food",
    },
    {
      key: "transport",
      terms: ["Train Station", "Metro", "Subway Station", "Airport", "Port", "Marine Terminal"],
      pointType: "Transport",
    },
    {
      key: "amenities",
      terms: ["Gas Station", "Electric Vehicle Charging Station", "Banks", "Parking Lots"],
      pointType: "Amenity",
    },
  ];

  // common args
  const [lng, lat] = propertyLngLat;

  const baseParams = {
    lng,
    lat,
    radiusMeters: placesRadiusMeters,
    pageSize: placesPageSize,
    token: placesToken,
  };

  //build all requests (flattened)
  const requests = searchGroups.flatMap((g) =>
    g.terms.map((searchText) =>
      fetchArcgisPlacesNearPoint({ ...baseParams, searchText }).then((results) => ({
        groupKey: g.key,
        pointType: g.pointType,
        results,
      }))
    )
  );

  //run promises concurrently
  const responses = await Promise.all(requests);

  //aggregate into points by group
  const points = Object.fromEntries(searchGroups.map((g) => [g.key, []]));

  for (const { groupKey, pointType, results } of responses) {
    points[groupKey].push(...arcgisResultsToPoints(results, pointType));
  }

  //dedupe each group (final structure for pills)
  for (const g of searchGroups) {
    points[g.key] = dedupePoints(points[g.key]);
  }
  // arcGis api call ends
  // MARKER COLORS:
  const colors = {
    food: rootStyles.getPropertyValue('--color-food-pin').trim(),
    transport: rootStyles.getPropertyValue('--color-transport-pin').trim(),
    amenities: rootStyles.getPropertyValue('--color-amenities-pin').trim(),
  };

  const icons = {
    food: "./assets/icons/food-dark.svg",
    transport: "./assets/icons/transport-dark.svg",
    amenities: "./assets/icons/amenities-dark.svg"
  };
  // Create markers for selected POI/s
  const markersByLayer = {};
  for (const layer in points) {
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
  // create nearby route cards
function kmToMiles(km) {
  return km * 0.621371;
}

function formatMilesFromProps(objOrProps) {
  const tryGet = (o) => {
    if (!o) return null;
    if (typeof o.Total_Miles === "number" && !Number.isNaN(o.Total_Miles)) return o.Total_Miles;
    if (typeof o.Total_Kilometers === "number" && !Number.isNaN(o.Total_Kilometers)) return kmToMiles(o.Total_Kilometers);
    return null;
  };

  // direct (route object top-level)
  let miles = tryGet(objOrProps);
  if (miles == null && objOrProps?.routesdata?.properties) {
    miles = tryGet(objOrProps.routesdata.properties);
  }
  if (miles == null && objOrProps?.properties) {
    miles = tryGet(objOrProps.properties);
  }

  if (miles == null) return "";

  // round: show one decimal if >= 10, else round integer
  const rounded = miles >= 10 ? Math.round(miles * 10) / 10 : Math.round(miles);
  return `${rounded} miles`;
}

function getArrowSVG() {
  return `
  <svg width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7 21l14-14M21 21V7H7"
      stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
  `;
}

// create card using a normalized route object
function createNearbyRouteCard(routeObj, index) {
  const card = document.createElement("div");
  card.className = "nearby-route-card";
  card.dataset.routeIndex = index;
  card.style.cursor = "pointer";

  const name =
    (typeof routeObj.name === "string" && routeObj.name) ||
    routeObj?.routesdata?.properties?.Name ||
    routeObj?.properties?.Name ||
    "";

  card.innerHTML = `
    <div class="nearby-route-info">
      <div class="nearby-route-name">${name}</div>
      <div class="nearby-route-distance">
        ${formatMilesFromProps(routeObj)}
      </div>
    </div>
    <div class="nearby-route-arrow">${getArrowSVG()}</div>
  `;
  return card;
}

// Normalize incoming data into an array of "route objects".
// Supported inputs:
//  - FeatureCollection (old): { type: "FeatureCollection", features: [...] }
//  - Array of route objects (new): [ { name, routesdata, Total_Kilometers, ... }, ... ]
function getRoutesArray(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw;
  }
  if (raw.type === "FeatureCollection" && Array.isArray(raw.features)) {
    return raw.features.map((f) => {
      return {
        name: f?.properties?.Name || "",
        routesdata: f,
        // copy properties so distance lookups work
        ...f?.properties,
      };
    });
  }
  //if its single Feature, wrap it
  if (raw.type === "Feature" && raw.properties) {
    return [{
      name: raw.properties.Name || "",
      routesdata: raw,
      ...raw.properties
    }];
  }
  return [];
}

let routesGeojsonRaw = null; // raw fetch result
let routesList = [];         // normalized array used for rendering and click mapping

function renderNearbyRouteCards(rawData) {
  const container = document.getElementById("nearbyRoutes");
  if (!container) {
    console.error("Missing container #nearbyRoutes in HTML");
    return;
  }

  routesGeojsonRaw = rawData;   
  routesList = getRoutesArray(rawData);

  container.innerHTML = "";
  routesList.forEach((routeObj, index) => {
    container.appendChild(createNearbyRouteCard(routeObj, index));
  });
}

// fetch & render nearby routes
try {
  const res = await fetch("./data/routes_calculated.geojson");
  const data = await res.json();
  console.log("1. routes raw:", data);
  renderNearbyRouteCards(data);
} catch (err) {
  console.error("Failed to load routes:", err);
}

// Event delegation for click on cards
document.getElementById("nearbyRoutes")?.addEventListener("click", (e) => {
  const card = e.target.closest(".nearby-route-card");
  if (!card) return;
// add this lines for active state of card
  document.querySelectorAll(".nearby-route-card.active")
    .forEach(el => el.classList.remove("active"));
  card.classList.add("active");
// active state ended
  const idx = Number(card.dataset.routeIndex);
  if (Number.isNaN(idx)) return;

  const routeObj = routesList[idx];
  if (!routeObj) return;

  const routeFeature = routeObj.routesdata || (routeObj.type === "Feature" ? routeObj : null);
  if (!routeFeature) {
    console.warn("Clicked route doesn't contain a GeoJSON Feature to display", routeObj);
    return;
  }

  updateRoute(routeFeature);
});

  // card create end
});

// to update the route
function updateRoute(routeFeature) {
  if (!routeFeature || routeFeature.type !== "Feature") {
    console.warn("updateRoute expects a GeoJSON Feature", routeFeature);
    return;
  }
  currentRouteFeature = routeFeature; // remember latest route
ensureRouteLayers();                // in case style just changed

  updateStartEndPoints(routeFeature);
  const src = map.getSource("route");
  if (!src) return;

  src.setData(routeFeature);
  map.once("idle", () => {
    fitToFeatureBounds(routeFeature);
  });
}
// fit bounds of route line into map
function fitToFeatureBounds(
  feature,
  { padding = 80, duration = 800, maxZoom = 16 } = {}
) {
  if (!feature?.geometry) return;
  const bounds = new mapboxgl.LngLatBounds();
  const extendLine = (line) => {
    line.forEach((coord) => bounds.extend(coord));
  };
  const geom = feature.geometry;

  if (geom.type === "LineString") {
    extendLine(geom.coordinates);
  } else if (geom.type === "MultiLineString") {
    geom.coordinates.forEach((line) => extendLine(line));
  } else {
    console.warn("[fitToFeatureBounds] Unsupported geometry:", geom.type);
    return;
  }

  // Prevent over-zooming on very short routes
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  const isTiny =
    Math.abs(sw.lng - ne.lng) < 1e-6 &&
    Math.abs(sw.lat - ne.lat) < 1e-6;

  if (isTiny) {
    map.easeTo({
      center: [sw.lng, sw.lat],
      zoom: Math.min(map.getZoom(), maxZoom),
      duration
    });
    return;
  }

  map.fitBounds(bounds, {
    padding,
    duration,
    maxZoom,
    linear: true
  });
}

// start end dots
function updateStartEndPoints(routeFeature) {
  const source = map.getSource("route-points");
  if (!source) {
    console.warn("route-points source not ready yet");
    return;
  }
  const coords = routeFeature?.geometry?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return;

  const start = coords[0];                    // [lng, lat]
  const end = coords[coords.length - 1];      // [lng, lat]

  source.setData({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { pt: "start" },
        geometry: { type: "Point", coordinates: start }
      },
      {
        type: "Feature",
        properties: { pt: "end" },
        geometry: { type: "Point", coordinates: end }
      }
    ]
  });
}


// arcGIS
// ArcGIS Places fetch (NEW)
async function fetchArcgisPlacesNearPoint({ lng, lat, searchText, radiusMeters, pageSize, token }) {
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
  if (!Array.isArray(data.results)) throw new Error("ArcGIS Places response missing results[]");
  return data.results;
}