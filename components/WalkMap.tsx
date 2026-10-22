"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl, { LngLatBoundsLike } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  getWalkLocations,
  subscribeToWalkLocations,
  WalkLocation,
} from "@/lib/db";

// Dubai default — rough centre, used before any point has arrived
const DUBAI_CENTER: [number, number] = [55.2708, 25.2048];

export function WalkMap({
  walkId,
  heightClass = "h-72",
  autoFit = true,
}: {
  walkId: string;
  heightClass?: string;
  autoFit?: boolean;
}) {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [points, setPoints] = useState<WalkLocation[]>([]);
  const [ready, setReady] = useState(false);
  const [missingToken, setMissingToken] = useState(false);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  // Boot the map once
  useEffect(() => {
    if (!token) {
      setMissingToken(true);
      return;
    }
    if (!containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: DUBAI_CENTER,
      zoom: 11,
      attributionControl: true,
      cooperativeGestures: true, // Scroll-to-zoom requires Ctrl, so the page scrolls normally
    });
    map.on("load", () => {
      // Trail source + line layer
      map.addSource("trail", {
        type: "geojson",
        data: emptyLine(),
      });
      map.addLayer({
        id: "trail-line",
        type: "line",
        source: "trail",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#0E1C2F",
          "line-width": 4,
          "line-opacity": 0.85,
        },
      });
      setReady(true);
    });
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initial trail fetch + realtime subscription
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getWalkLocations(walkId)
      .then((pts) => {
        if (cancelled) return;
        setPoints(pts);
      })
      .catch(() => {});

    const unsub = subscribeToWalkLocations(walkId, (loc) => {
      setPoints((prev) => [...prev, loc]);
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [walkId, token]);

  // Draw trail + move marker when points change
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;

    if (points.length === 0) return;

    const coords = points.map((p) => [p.lng, p.lat] as [number, number]);

    // Update trail polyline
    const src = map.getSource("trail") as mapboxgl.GeoJSONSource | undefined;
    if (src) {
      src.setData({
        type: "Feature",
        geometry: { type: "LineString", coordinates: coords },
        properties: {},
      });
    }

    // Move / create current-position marker
    const latest = coords[coords.length - 1];
    if (!markerRef.current) {
      const el = document.createElement("div");
      el.innerHTML = walkerDotMarkup();
      el.style.cursor = "default";
      markerRef.current = new mapboxgl.Marker({
        element: el,
        anchor: "center",
      })
        .setLngLat(latest)
        .addTo(map);
    } else {
      markerRef.current.setLngLat(latest);
    }

    // Fit view to the trail (with a nudge on the latest point so it isn't at the edge)
    if (autoFit) {
      if (coords.length === 1) {
        map.easeTo({ center: latest, zoom: 16, duration: 600 });
      } else {
        const bounds = coords.reduce(
          (b, c) => b.extend(c as [number, number]),
          new mapboxgl.LngLatBounds(coords[0], coords[0]),
        );
        map.fitBounds(bounds as LngLatBoundsLike, {
          padding: 48,
          duration: 600,
          maxZoom: 17,
        });
      }
    }
  }, [points, ready, autoFit]);

  if (missingToken) {
    return (
      <div
        className={`flex ${heightClass} w-full items-center justify-center rounded-xl border border-paper bg-paper/50 text-sm text-stone`}
      >
        Map unavailable — missing Mapbox token.
      </div>
    );
  }

  return (
    <div className={`relative ${heightClass} w-full overflow-hidden rounded-xl`}>
      <div ref={containerRef} className="absolute inset-0" />
      {points.length === 0 && ready && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-bone/60 text-center text-sm text-midnight/70 backdrop-blur-sm">
          Waiting for the walker&apos;s first location…
        </div>
      )}
    </div>
  );
}

function emptyLine() {
  return {
    type: "Feature" as const,
    geometry: { type: "LineString" as const, coordinates: [] as number[][] },
    properties: {},
  };
}

// A lime dot with a midnight ring = current walker position
function walkerDotMarkup() {
  return `
    <div style="
      position: relative;
      width: 22px; height: 22px;
    ">
      <span style="
        position: absolute; inset: -8px;
        border-radius: 999px;
        background: rgba(216, 232, 107, 0.35);
        animation: ww-pulse 1.8s ease-out infinite;
      "></span>
      <span style="
        position: absolute; inset: 0;
        border-radius: 999px;
        background: #D8E86B;
        border: 2.5px solid #0E1C2F;
        box-shadow: 0 2px 6px rgba(14,28,47,0.25);
      "></span>
      <style>
        @keyframes ww-pulse {
          0% { transform: scale(0.6); opacity: 0.9; }
          100% { transform: scale(1.6); opacity: 0; }
        }
      </style>
    </div>
  `;
}
