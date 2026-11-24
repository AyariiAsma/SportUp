import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { GeoPoint } from '../types';

interface LeafletMapProps {
  center?: [number, number];
  zoom?: number;
  route?: GeoPoint[];
  currentPoint?: GeoPoint | null;
  markers?: Array<{
    id: string;
    lat: number;
    lng: number;
    title: string;
    subtitle?: string;
    badge?: string;
    onClick?: () => void;
  }>;
  interactive?: boolean;
  className?: string;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  center = [36.8528, 10.3233], // Default Tunis / Carthage
  zoom = 13,
  route = [],
  currentPoint = null,
  markers = [],
  interactive = true,
  className = 'w-full h-80',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const runnerMarkerRef = useRef<L.Marker | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center,
        zoom,
        zoomControl: interactive,
        dragging: interactive,
        touchZoom: interactive,
        scrollWheelZoom: interactive ? 'center' : false,
      });

      // CartoDB Dark Matter tiles (beautiful sleek dark map)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);

      mapInstanceRef.current = map;
      markersGroupRef.current = L.layerGroup().addTo(map);

      // Fix map rendering size after container mounting
      setTimeout(() => {
        map.invalidateSize();
      }, 200);
    }

    return () => {
      // Map cleanup on unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Route Polyline
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const latLngs = route.map(p => [p.lat, p.lng] as [number, number]);

    if (polylineRef.current) {
      polylineRef.current.setLatLngs(latLngs);
    } else if (latLngs.length > 0) {
      polylineRef.current = L.polyline(latLngs, {
        color: '#FF6B35',
        weight: 5,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);
    }

    // Auto-fit bounds if we have a route with multiple points
    if (latLngs.length > 1) {
      const bounds = L.latLngBounds(latLngs);
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 });
    }
  }, [route]);

  // Update Live Current Point / Runner Beacon
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (currentPoint) {
      const runnerIcon = L.divIcon({
        className: 'custom-runner-icon',
        html: `<div class="live-beacon"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      if (runnerMarkerRef.current) {
        runnerMarkerRef.current.setLatLng([currentPoint.lat, currentPoint.lng]);
      } else {
        runnerMarkerRef.current = L.marker([currentPoint.lat, currentPoint.lng], {
          icon: runnerIcon,
        }).addTo(map);
      }

      // Pan to follow runner if active
      map.panTo([currentPoint.lat, currentPoint.lng], { animate: true, duration: 0.5 });
    } else if (runnerMarkerRef.current) {
      runnerMarkerRef.current.remove();
      runnerMarkerRef.current = null;
    }
  }, [currentPoint]);

  // Update Markers (Events, etc.)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = markersGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    markers.forEach(m => {
      const customPin = L.divIcon({
        className: 'event-pin',
        html: `
          <div style="background: #1B263B; border: 2px solid #FF6B35; color: #FFF; border-radius: 20px; padding: 4px 10px; font-size: 12px; font-weight: 600; white-space: nowrap; box-shadow: 0 4px 12px rgba(0,0,0,0.5); display: flex; align-items: center; gap: 4px;">
            <span style="color: #FF6B35;">🏃</span> ${m.title}
          </div>
        `,
        iconSize: [120, 30],
        iconAnchor: [60, 15],
      });

      const marker = L.marker([m.lat, m.lng], { icon: customPin }).addTo(group);
      
      const popupHtml = `
        <div style="min-width: 160px; font-family: 'Inter', sans-serif;">
          <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px; color: #FFFFFF;">${m.title}</div>
          ${m.subtitle ? `<div style="font-size: 12px; color: #E0E1DD; margin-bottom: 6px;">${m.subtitle}</div>` : ''}
          ${m.badge ? `<span style="background: rgba(255,107,53,0.2); color: #FF6B35; font-size: 11px; padding: 2px 8px; border-radius: 999px; font-weight: 600;">${m.badge}</span>` : ''}
        </div>
      `;
      marker.bindPopup(popupHtml);

      if (m.onClick) {
        marker.on('click', m.onClick);
      }
    });

    if (markers.length > 0 && route.length === 0) {
      const groupBounds = L.latLngBounds(markers.map(m => [m.lat, m.lng] as [number, number]));
      map.fitBounds(groupBounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [markers, route.length]);

  return (
    <div
      ref={mapContainerRef}
      className={className}
      style={{ minHeight: '260px', width: '100%', borderRadius: '12px' }}
    />
  );
};
