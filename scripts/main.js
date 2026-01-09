// Main JS for Mapbox UI
mapboxgl.accessToken =
  "pk.eyJ1IjoicGhvbGxpcy1wcm9sb2dpcyIsImEiOiJjbWl4cGt1ajUwN2JpM2RvOXdqOWFmb3U3In0.RyiaedumDC0gnw6FeFKqrA ";

const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/phollis-prologis/cmixr0gqa000d01rj1py34kjg",
  attributionControl: false,
  // center: [-76.6122, 39.2904], // Baltimore
  center: [-76.525583, 39.25904],
  zoom: 12,
});

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

map.on("load", () => {
  // Route line
  // Route line (create once)
  map.addSource("route", {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: [] // empty initially
    }
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
      "line-width": 8,
    },
  });
//  loadRouteFromFile();

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
    .setLngLat([-76.525583, 39.25904])
    .addTo(map);

  // Markers
  //CO-ORDINATES:
  const points = {
    food: [
      {
        lngLat: [-76.531397, 39.257645],
        name: "Joe's Diner",
        address: "123 Main St",
      },
      {
        lngLat: [-76.53085, 39.263673],
        name: "Pizza Place",
        address: "456 Elm St",
      },
      {
        lngLat: [-76.526655, 39.262439],
        name: "Cafe Good Eats",
        address: "789 Oak Ave",
      },
      {
        lngLat: [-76.51244, 39.25816],
        name: "Burger Spot",
        address: "321 Maple Rd",
      },
    ],
    transport: [
      {
        lngLat: [-76.5201, 39.2601],
        name: "Bus Stop A",
        address: "100 Transit Blvd",
      },
      {
        lngLat: [-76.5185, 39.2623],
        name: "Metro Station",
        address: "200 Metro Ave",
      },
    ],
    amenities: [
      { lngLat: [-76.5252, 39.2598], name: "City Park", address: "Park Lane" },
    ],
  };

  // MARKER COLORS:
  const colors = {
    food: "#88FF8D",
    transport: "#DBD94B",
    amenities: "#4BA3DB",
  };
const icons = {
  food: "./assets/icons/food.svg",
  transport: "./assets/icons/transport.svg",
  amenities: "./assets/icons/amenities.svg"
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

  // Toggle helper functions
  const enabled = new Set();

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
        const res = await fetch("./data/routes_calculated.geojson"); // adjust path!
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
        const geojson = await res.json();
        updateRoute(geojson);
        console.log('Card Clicked: ', geojson)
      } catch (err) {
        console.error("Failed to load route GeoJSON:", err);
      }
    });
  });
});

// to update the route
function updateRoute(geojson) {
  let data = geojson;

  if (geojson.type === "FeatureCollection") {
    // data = geojson.features?.[0];
    data = geojson.features?.[1];
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
// modal-map
const mapCard = document.getElementById('mapCard');
const overlay = document.getElementById('mapOverlay');
const openBtns = document.querySelectorAll('.js-open-map');
const closeBtn = overlay.querySelector('.map-overlay-close');

function openMapOverlay() {
    mapCard.classList.add('is-popup');
    overlay.classList.add('active');

    // resize map if needed
    setTimeout(() => {
        if (window.map && map.resize) map.resize();
    }, 100);
}

function closeMapOverlay() {
    mapCard.classList.remove('is-popup');
    overlay.classList.remove('active');

    setTimeout(() => {
        if (window.map && map.resize) map.resize();
    }, 100);
}

// open from any button
openBtns.forEach(btn => btn.addEventListener('click', openMapOverlay));

// close
closeBtn.addEventListener('click', closeMapOverlay);

// optional: ESC to close
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeMapOverlay();
});

