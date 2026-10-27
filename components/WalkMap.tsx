"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  getWalkLocations,
  subscribeToWalkLocations,
  WalkLocation,
} from "@/lib/db";

// Rough centre of Dubai, used before any point has arrived
const DUBAI_CENTER: [number, number] = [25.2048, 55.2708];

export function WalkMap({
  walkId,
  heightClass = "h-72",
  autoFit = true,
}: {
  walkId: string;
  heightClass?: string;
  autoFit?: boolean;
}) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const [points, setPoints] = useState<WalkLocation[]>([]);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Boot the map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    try {
      // Leaflet needs the container to have a size before init. Our parent
      // enforces a height class, so this is fine on first paint.
      const map = L.map(containerRef.current, {
        center: DUBAI_CENTER,
        zoom: 11,
        zoomControl: true,
        attributionControl: true,
        // Cooperate with the page: don't swallow touch scroll
        scrollWheelZoom: false,
      });

      // OpenStreetMap standard tiles — free, no API key, works globally.
      // (CARTO's cdn now requires a key; this is the reliable fallback.)
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      // The polyline for the trail; empty until points arrive
      const polyline = L.polyline([], {
        color: "#0E1C2F",
        weight: 4,
        opacity: 0.85,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);
      polylineRef.current = polyline;

      mapRef.current = map;
      setReady(true);
    } catch (e: any) {
      setMapError(e?.message || "Could not create the map.");
    }

    return () => {
      try {
        mapRef.current?.remove();
      } catch {}
      mapRef.current = null;
      polylineRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Fix leaflet's size calculation after it mounts inside a flex/absolute parent
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const t = setTimeout(() => {
      try {
        mapRef.current?.invalidateSize();
      } catch {}
    }, 60);
    return () => clearTimeout(t);
  }, [ready]);

  // Load the trail once, then subscribe to realtime inserts
  useEffect(() => {
    let cancelled = false;
    getWalkLocations(walkId)
      .then((pts) => {
        if (!cancelled) setPoints(pts);
      })
      .catch(() => {});
    const unsub = subscribeToWalkLocations(walkId, (loc) => {
      setPoints((prev) =>
        prev.some((p) => p.id === loc.id) ? prev : [...prev, loc],
      );
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [walkId]);

  // Draw / update trail + marker when points change
  useEffect(() => {
    const map = mapRef.current;
    const polyline = polylineRef.current;
    if (!ready || !map || !polyline || points.length === 0) return;

    const latlngs = points.map((p) => [p.lat, p.lng] as [number, number]);
    polyline.setLatLngs(latlngs);

    const latest = latlngs[latlngs.length - 1];

    // Create / move the walker marker (lime dot with midnight ring + pulse)
    if (!markerRef.current) {
      const icon = L.divIcon({
        className: "ww-walker-marker",
        html: `
          <div style="position:relative;width:22px;height:22px;">
            <span style="position:absolute;inset:-8px;border-radius:999px;background:rgba(216,232,107,0.4);animation:ww-pulse 1.8s ease-out infinite;"></span>
            <span style="position:absolute;inset:0;border-radius:999px;background:#D8E86B;border:2.5px solid #0E1C2F;box-shadow:0 2px 6px rgba(14,28,47,0.25);"></span>
          </div>
          <style>
            @keyframes ww-pulse {
              0%   { transform: scale(0.6); opacity: 0.9; }
              100% { transform: scale(1.6); opacity: 0; }
            }
          </style>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      markerRef.current = L.marker(latest, { icon }).addTo(map);
    } else {
      markerRef.current.setLatLng(latest);
    }

    if (autoFit) {
      if (latlngs.length === 1) {
        map.setView(latest, 16, { animate: true });
      } else {
        try {
          const bounds = L.latLngBounds(latlngs);
          map.fitBounds(bounds, { padding: [48, 48], maxZoom: 17 });
        } catch {
          map.setView(latest, 16, { animate: true });
        }
      }
    }
  }, [points, ready, autoFit]);

  if (mapError) {
    return (
      <div
        className={`flex ${heightClass} w-full items-center justify-center rounded-xl border border-paper bg-paper/80 px-4 text-center text-xs leading-relaxed text-midnight/80`}
      >
        <span>{mapError}</span>
      </div>
    );
  }

  return (
    <div
      className={`relative ${heightClass} w-full overflow-hidden rounded-xl bg-paper`}
    >
      <div ref={containerRef} className="absolute inset-0" />
      {!ready && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-midnight/60">
          Loading map…
        </div>
      )}
      {ready && points.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-bone/60 px-4 text-center text-sm text-midnight/70 backdrop-blur-sm">
          Waiting for the walker&apos;s first location…
        </div>
      )}
    </div>
  );
}
