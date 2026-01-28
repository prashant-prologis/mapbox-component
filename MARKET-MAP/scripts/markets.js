// markets.js
(() => {
  const map = window.map;
  if (!map) {
    console.error("[markets.js] window.map not found. Load map-init.js first.");
    return;
  }

  // IDs
  const MARKET_SOURCE_ID = "market-active-source";
  const MARKET_FILL_LAYER_ID = "market-active-fill";
  const MARKET_OUTLINE_LAYER_ID = "market-active-outline";

  // Markets data (6–10 points each + mixed structures)
  const MARKETS = {
    "dc-md-va": {
      name: "Maryland, Washington D.C., and Northern Virginia",
      labelLngLat: [-77.0369, 38.9072],
      feature: {
        type: "Feature",
        properties: { id: "dc-md-va" },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [-77.60, 39.10],
              [-77.30, 39.35],
              [-76.95, 39.45],
              [-76.55, 39.40],
              [-76.25, 39.05],
              [-76.30, 38.70],
              [-76.70, 38.55],
              [-77.20, 38.55],
              [-77.55, 38.75],
              [-77.60, 39.10], // close
            ],
          ],
        },
      },
    },

    "baltimore": {
      name: "Baltimore Metro",
      labelLngLat: [-76.6122, 39.2904],
      feature: {
        type: "Feature",
        properties: { id: "baltimore" },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [-76.92, 39.45],
              [-76.75, 39.56],
              [-76.52, 39.60],
              [-76.30, 39.52],
              [-76.22, 39.36],
              [-76.33, 39.20],
              [-76.58, 39.14],
              [-76.82, 39.24],
              [-76.92, 39.45], // close
            ],
          ],
        },
      },
    },
  };

  let activeMarketId = "dc-md-va";

  // ---- Market name HTML marker (for CSS-like styling) ----
  let marketLabelMarker = null;
  let marketLabelEl = null;

  function ensureMarketLabelMarker() {
    const m = MARKETS[activeMarketId];
    if (!m) return;

    if (!marketLabelEl) {
      marketLabelEl = document.createElement("div");
      marketLabelEl.className = "market-label";

      // Apply requested styles (inline so you don't need CSS)
      marketLabelEl.style.background = "rgba(24, 69, 67, 0.9)";
      marketLabelEl.style.borderRadius = "8px";
      marketLabelEl.style.padding = "10px";
      marketLabelEl.style.color = "#FFFFFF";

      // a few sensible defaults (optional but helpful)
      marketLabelEl.style.fontWeight = "700";
      marketLabelEl.style.fontSize = "12px";
      marketLabelEl.style.lineHeight = "1.2";
      marketLabelEl.style.textAlign = "center";
      marketLabelEl.style.maxWidth = "380px";
      marketLabelEl.style.pointerEvents = "none"; // don't block map interactions
      marketLabelEl.style.boxShadow = "0 8px 24px rgba(0,0,0,0.18)";
    }

    marketLabelEl.textContent = m.name; //field_market_display_name

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

  function getActiveMarketFeature() {
    return MARKETS[activeMarketId]?.feature;
  }

  function ensureMarketLayers() {
    const feature = getActiveMarketFeature();
    if (!feature) return;

    // Source: active market polygon
    if (!map.getSource(MARKET_SOURCE_ID)) {
      map.addSource(MARKET_SOURCE_ID, { type: "geojson", data: feature });
    } else {
      map.getSource(MARKET_SOURCE_ID).setData(feature);
    }

    // Fill (optional visibility)
    if (!map.getLayer(MARKET_FILL_LAYER_ID)) {
      map.addLayer({
        id: MARKET_FILL_LAYER_ID,
        type: "fill",
        source: MARKET_SOURCE_ID,
        paint: {
          "fill-color": "#23F1E0",
          "fill-opacity": 0, // outline-only
        },
      });
    }

    // Outline
    if (!map.getLayer(MARKET_OUTLINE_LAYER_ID)) {
      map.addLayer({
        id: MARKET_OUTLINE_LAYER_ID,
        type: "line",
        source: MARKET_SOURCE_ID,
        paint: {
          "line-color": "#23F1E0",
          "line-width": 1.8,
        },
      });
    }
  }

  function fitToFeatureBounds(feature, { padding = 10, duration = 800 } = {}) {
    const bounds = new mapboxgl.LngLatBounds();

    const extendRing = (ring) => ring.forEach((c) => bounds.extend(c));

    const geom = feature.geometry;
    if (geom.type === "Polygon") {
      geom.coordinates.forEach((ring) => extendRing(ring));
    } else if (geom.type === "MultiPolygon") {
      geom.coordinates.forEach((poly) =>
        poly.forEach((ring) => extendRing(ring))
      );
    } else {
      console.warn("[markets.js] Unsupported geometry:", geom.type);
      return;
    }

    map.fitBounds(bounds, { padding, duration });
  }

  function setActiveMarket(marketId, { fit = true } = {}) {
    if (!MARKETS[marketId]) return;
    activeMarketId = marketId;

    // If style not ready yet, wait
    if (!map.isStyleLoaded()) {
      map.once("style.load", () => setActiveMarket(marketId, { fit }));
      return;
    }

    ensureMarketLayers();

    // Update active polygon
    map.getSource(MARKET_SOURCE_ID)?.setData(getActiveMarketFeature());

    // Update market label (HTML marker)
    ensureMarketLabelMarker();

    if (fit) fitToFeatureBounds(getActiveMarketFeature());

    // optional active button styling
    document.querySelectorAll(".market-btn[data-market-id]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.marketId === marketId);
      btn.setAttribute(
        "aria-selected",
        btn.dataset.marketId === marketId ? "true" : "false"
      );
    });
  }

  function bindMarketButtons() {
    const container = document.querySelector(".market-buttons");
    if (!container) return;

    container.addEventListener("click", (e) => {
      const btn = e.target.closest(".market-btn[data-market-id]");
      if (!btn) return;
      setActiveMarket(btn.dataset.marketId, { fit: true });
    });
  }

  // Expose if you ever want inline onclick:
  window.setActiveMarket = setActiveMarket;

  // Map events
  map.on("style.load", () => {
    // Style reload clears sources/layers, so re-add them
    ensureMarketLayers();

    // Keep current market active after style switch
    setActiveMarket(activeMarketId, { fit: false });

    // HTML marker survives style changes, but we re-sync position/text anyway
    ensureMarketLabelMarker();
  });

  map.on("load", () => {
    ensureMarketLayers();
    setActiveMarket(activeMarketId, { fit: true });
    ensureMarketLabelMarker();
  });

  // DOM ready for buttons
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindMarketButtons);
  } else {
    bindMarketButtons();
  }
})();

 