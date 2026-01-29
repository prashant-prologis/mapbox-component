(() => {
  // MAPBOX SETUP
  mapboxgl.accessToken =
    "pk.eyJ1IjoicGhvbGxpcy1wcm9sb2dpcyIsImEiOiJjbWl4cGt1ajUwN2JpM2RvOXdqOWFmb3U3In0.RyiaedumDC0gnw6FeFKqrA";

  const BASE_STYLE_URL =
    "mapbox://styles/phollis-prologis/cmixr0gqa000d01rj1py34kjg";

  // These are your local style JSONs used by the Map/Satellite buttons
  const STREETS_STYLE_URL = "../styles-map/style-map.json";
  const SATELLITE_STYLE_URL = "../styles-hybrid/style-hybrid.json";

  // MARKETS
  const MARKETS = {
    "pl-silesia": {
      name: "Poland — Silesia (Chorzów / Ruda Śląska / Dąbrowa / Ujazd)",
      labelLngLat: [18.85, 50.315],
      feature: {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [18.28, 50.24],
              [18.36, 50.46],
              [18.85, 50.49],
              [19.33, 50.44],
              [19.34, 50.3],
              [19.1, 50.22],
              [18.6, 50.2],
              [18.28, 50.24], // close
            ],
          ],
        },
      },
    },
  };

  // Default = first market
  const DEFAULT_MARKET_ID = Object.keys(MARKETS)[0];
  const DEFAULT_MARKET = MARKETS[DEFAULT_MARKET_ID];
  // MAP INIT
  const map = new mapboxgl.Map({
    container: "map",
    style: BASE_STYLE_URL,
    center: DEFAULT_MARKET.labelLngLat,
    zoom: 8,
    attributionControl: false,
  });

  window.map = map;

  // MARKET LAYER IDS
  const SOURCE_ID = "market-source";
  const FILL_ID = "market-fill";
  const LINE_ID = "market-outline";

  let activeMarketId = DEFAULT_MARKET_ID;
  let marketLabelMarker = null;
  let marketLabelEl = null;

  function getActiveMarket() {
    return MARKETS[activeMarketId];
  }

  function ensureMarketLabelMarker() {
    const m = getActiveMarket();
    if (!m) return;

    if (!marketLabelEl) {
      marketLabelEl = document.createElement("div");
      marketLabelEl.className = "market-label";

      // Inline styles (no CSS dependency)
      marketLabelEl.style.background = "rgba(24, 69, 67, 0.9)";
      marketLabelEl.style.color = "#FFFFFF";
      marketLabelEl.style.padding = "10px";
      marketLabelEl.style.borderRadius = "8px";
      marketLabelEl.style.fontSize = "12px";
      marketLabelEl.style.fontWeight = "700";
      marketLabelEl.style.lineHeight = "1.2";
      marketLabelEl.style.textAlign = "center";
      marketLabelEl.style.maxWidth = "380px";
      marketLabelEl.style.pointerEvents = "none";
      marketLabelEl.style.boxShadow = "0 8px 24px rgba(0,0,0,0.18)";
    }

    marketLabelEl.textContent = m.name;

    if (!marketLabelMarker) {
      marketLabelMarker = new mapboxgl.Marker({
        element: marketLabelEl,
        anchor: "center",
      })
        .setLngLat(m.labelLngLat)
        .addTo(map);
    } else {
      marketLabelMarker.setLngLat(m.labelLngLat);
    }
  }

  function ensureMarketLayers() {
    const m = getActiveMarket();
    if (!m) return;

    // Source
    if (!map.getSource(SOURCE_ID)) {
      map.addSource(SOURCE_ID, { type: "geojson", data: m.feature });
    } else {
      map.getSource(SOURCE_ID).setData(m.feature);
    }

    // Fill
    if (!map.getLayer(FILL_ID)) {
      map.addLayer({
        id: FILL_ID,
        type: "fill",
        source: SOURCE_ID,
        paint: {
          "fill-color": "#23F1E0",
          "fill-opacity": 0, // outline only
        },
      });
    }

    // Outline
    if (!map.getLayer(LINE_ID)) {
      map.addLayer({
        id: LINE_ID,
        type: "line",
        source: SOURCE_ID,
        paint: {
          "line-color": "#23F1E0",
          "line-width": 1.8,
        },
      });
    }
  }

  function fitToActiveMarket({ padding = 20, duration = 0 } = {}) {
    const m = getActiveMarket();
    if (!m) return;

    const bounds = new mapboxgl.LngLatBounds();
    const geom = m.feature.geometry;

    const extendRing = (ring) => ring.forEach((c) => bounds.extend(c));

    if (geom.type === "Polygon") {
      geom.coordinates.forEach((ring) => extendRing(ring));
    } else if (geom.type === "MultiPolygon") {
      geom.coordinates.forEach((poly) =>
        poly.forEach((ring) => extendRing(ring))
      );
    }

    map.fitBounds(bounds, { padding, duration });
  }

  function setActiveMarket(marketId, { fit = true } = {}) {
    if (!MARKETS[marketId]) return;
    activeMarketId = marketId;

    if (!map.isStyleLoaded()) {
      map.once("style.load", () => setActiveMarket(marketId, { fit }));
      return;
    }

    ensureMarketLayers();
    ensureMarketLabelMarker();
    if (fit) fitToActiveMarket({ padding: 20, duration: 0 });
  }
  window.setActiveMarket = setActiveMarket;

  function setStyle(type) {
    map.setStyle(
      type === "satellite" ? SATELLITE_STYLE_URL : STREETS_STYLE_URL
    );
  }

  function setMapStyle(style, el) {
    setStyle(style);

    // UI button active state (if element provided)
    if (el) {
      const buttons = el.parentElement?.querySelectorAll(".btn") || [];
      buttons.forEach((btn) => btn.classList.remove("active"));
      el.classList.add("active");
    }
    document.body.classList.toggle("is-satellite", style === "satellite");
  }

  window.setStyle = setStyle;
  window.setMapStyle = setMapStyle;

  // When style changes, Mapbox clears custom sources/layers, so re-add market UI
  map.on("style.load", () => {
    ensureMarketLayers();
    ensureMarketLabelMarker();
  });

  map.once("load", () => {
    setActiveMarket(activeMarketId, { fit: true });
  });
  // markers
  const assets = [
    {
      id: 109136,
      title: "Prologis Park Chorzow DC4A",
      type: "building_asset",
      lat: 50.2652,
      lng: 18.948683,
    },
    {
      id: 109816,
      title: "Prologis Park Dabrowa DC1A",
      type: "building_asset",
      lat: 50.353264,
      lng: 19.266626,
    },
    {
      id: 110146,
      title: "Prologis Park Chorzów DC1A",
      type: "building_asset",
      lat: 50.258286,
      lng: 18.9452,
    },
    {
      id: 110206,
      title: "Prologis Park Ruda Slaska DC2",
      type: "building_asset",
      lat: 50.2468693,
      lng: 18.918227,
    },
    {
      id: 110211,
      title: "Prologis Park Chorzów DC5",
      type: "building_asset",
      lat: 50.263557,
      lng: 18.950676,
    },
    {
      id: 113136,
      title: "Prologis Park Chorzów DC1B",
      type: "building_asset",
      lat: 50.25775,
      lng: 18.945791,
    },
    {
      id: 116196,
      title: "Prologis Park Chorzow DC4B",
      type: "building_asset",
      lat: 50.2646,
      lng: 18.949442,
    },
    {
      id: 116626,
      title: "Prologis Park Ujazd BTS Land - 82 000 sqm build-out",
      type: "land_asset",
      lat: 50.450726,
      lng: 18.335188,
    },
    {
      id: 116666,
      title: "Prologis Ruda Slaska BTS Land - 13 900 SQM build-out",
      type: "land_asset",
      lat: 50.246693,
      lng: 18.913788,
    },
    {
      id: 116676,
      title: "Prologis Ruda Slaska BTS Land - 5700 SQM build-out",
      type: "land_asset",
      lat: 50.24693667,
      lng: 18.91821691,
    },
  ];

  const ICONS_BY_TYPE = {
    building_asset: "./assets/icons/city.svg",
    land_asset: "./assets/icons/city.svg",
  };

  // Keep refs if you ever want to remove/update them later
  const assetMarkers = [];

  /**
   * Adds multiple markers with the SAME HTML structure
   */
  function addAssetMarkers(map, rows) {
    assetMarkers.forEach((m) => m.remove());
    assetMarkers.length = 0;

    let currentPopup = null;

    rows.forEach((row) => {
      const iconUrl = ICONS_BY_TYPE[row.type] || "./assets/icons/city.svg";
      // Marker DOM
      const el = document.createElement("div");
      // el.className = "custom-city-marker";
      el.style.cursor = "pointer";
      // Pin
      const pin = document.createElement("div");
      pin.className = "marker-pin";
      // Image
      const img = document.createElement("img");
      img.className = "marker-img";
      img.src = iconUrl;
      img.alt = row.title || "";
      pin.appendChild(img);
      el.appendChild(pin);
      // Marker
      const marker = new mapboxgl.Marker(el, { anchor: "bottom" }).setLngLat([
        Number(row.lng),
        Number(row.lat),
      ]);
      const popupContent = `
  <div class="property-popup">
    <div class="property-popup__left">
      <img
        class="property-popup__img"
        src="${row.imageUrl || "./assets/icons/property.png"}"
        alt="${row.title || ""}"
      />
      ${
        row.badge ? `<div class="property-popup__badge">${row.badge}</div>` : ""
      }
    </div>
    <div class="property-popup__right">
      ${
        row.kicker
          ? `<div class="property-popup__kicker">${row.kicker}</div>`
          : ""
      }

      ${
        row.metric || row.unit
          ? `<div class="property-popup__metric">
             <span class="property-popup__metricVal">${row.metric || ""}</span>
             <span class="property-popup__metricUnit">${row.unit || ""}</span>
           </div>`
          : ""
      }
      <div class="property-popup__title">${row.title || ""}</div>
      ${
        row.description
          ? `<div class="property-popup__desc">${row.description}</div>`
          : ""
      }
    </div>
  </div>
`;

      // Popup with offset for better positioning
      const popup = new mapboxgl.Popup({
        offset: [0, -60],
        closeButton: false,
        className: "property-tooltip-popup",
      }).setHTML(popupContent);

      marker.setPopup(popup);
      marker.addTo(map);
      assetMarkers.push(marker);
    });
    // Close popup when clicking on map
    map.on("click", () => {
      if (currentPopup) {
        currentPopup.remove();
        currentPopup = null;
      }
    });
  }

  // Usage:
  // call when map is ready
  if (map.loaded()) {
    addAssetMarkers(map, assets);
  } else {
    map.once("load", () => addAssetMarkers(map, assets));
  }
})();
