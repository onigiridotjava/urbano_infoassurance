import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { getCategoryIconKey, getMapMarkerSvgHtml } from './CategoryIcons';
import {
  ESSENTIAL_FACILITIES,
  ROAD_CLOSURES,
  type EssentialFacility,
  type IncidentReport,
  type ReportStatus,
} from '../types/report';

interface IncidentMapProps {
  reports: IncidentReport[];
  mode: 'picker' | 'explorer';
  selectedLat?: number;
  selectedLng?: number;
  onSelectLocation?: (lat: number, lng: number) => void;
  highlightedReportId?: string | null;
  onSelectReport?: (report: IncidentReport) => void;
  showIncidents?: boolean;
  showClosures?: boolean;
  showFacilities?: boolean;
  className?: string;
}

const STATUS_PIN_COLORS: Record<
  ReportStatus,
  { fill: string; border: string; badgeBg: string; badgeText: string; label: string }
> = {
  submitted: {
    fill: '#4679C0',
    border: '#154792',
    badgeBg: '#F3F7FD',
    badgeText: '#154792',
    label: 'Submitted',
  },
  triaged: {
    fill: '#145EC1',
    border: '#154792',
    badgeBg: '#FBE95C',
    badgeText: '#154792',
    label: 'Acknowledged',
  },
  assigned: {
    fill: '#154792',
    border: '#1177F0',
    badgeBg: '#FBE95C',
    badgeText: '#154792',
    label: 'Dispatched',
  },
  in_progress: {
    fill: '#154792',
    border: '#FBE95C',
    badgeBg: '#FBE95C',
    badgeText: '#154792',
    label: 'In Progress',
  },
  resolved: {
    fill: '#1177F0',
    border: '#154792',
    badgeBg: '#1177F0',
    badgeText: '#FEFFFE',
    label: 'Resolved',
  },
};

function createReportDivIcon(report: IncidentReport, isHighlighted: boolean) {
  const palette = STATUS_PIN_COLORS[report.status];
  const iconKey = getCategoryIconKey(report.category);
  const svgIcon = getMapMarkerSvgHtml(iconKey);
  const size = isHighlighted ? 40 : 34;
  const ringBorder = isHighlighted ? '#FBE95C' : palette.border;
  const outerShadow = isHighlighted
    ? '0 0 0 4px rgba(17, 119, 240, 0.35), 0 6px 14px rgba(21, 71, 146, 0.38)'
    : '0 3px 10px rgba(21, 71, 146, 0.3)';

  return L.divIcon({
    className: 'esm-pin-wrapper',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
    html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${palette.fill};border:3px solid ${ringBorder};box-shadow:${outerShadow};display:flex;align-items:center;justify-content:center;">
      ${svgIcon}
    </div>`,
  });
}

function createClosureDivIcon() {
  return L.divIcon({
    className: 'esm-pin-wrapper',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -17],
    html: `<div style="width:34px;height:34px;border-radius:9999px;background:#FBE95C;border:3px solid #154792;box-shadow:0 3px 10px rgba(21,71,146,0.3);display:flex;align-items:center;justify-content:center;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#154792" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="6" rx="1"/><path d="M7 12v7"/><path d="M17 12v7"/></svg>
    </div>`,
  });
}

function createFacilityDivIcon(type: EssentialFacility['type']) {
  const badgeText =
    type === 'Barangay Hall'
      ? 'BH'
      : type === 'Health Clinic'
        ? 'HC'
        : type === 'Fire Station'
          ? 'FS'
          : 'PS';
  return L.divIcon({
    className: 'esm-pin-wrapper',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
    html: `<div style="width:32px;height:32px;border-radius:10px;background:#FEFFFE;border:2.5px solid #154792;box-shadow:0 3px 8px rgba(21,71,146,0.24);display:flex;align-items:center;justify-content:center;font-family:monospace;font-size:11px;font-weight:800;color:#154792;">
      ${badgeText}
    </div>`,
  });
}

function createPickerDivIcon() {
  return L.divIcon({
    className: 'esm-pin-wrapper',
    iconSize: [40, 48],
    iconAnchor: [20, 46],
    html: `<svg width="40" height="48" viewBox="0 0 38 46" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M19 2C9.611 2 2 9.611 2 19C2 30.8 19 44 19 44C19 44 36 30.8 36 19C36 9.611 28.389 2 19 2Z" fill="#1177F0" stroke="#FEFFFE" stroke-width="3"/>
      <circle cx="19" cy="19" r="6" fill="#FBE95C"/>
    </svg>`,
  });
}

export const IncidentMap: React.FC<IncidentMapProps> = ({
  reports,
  mode,
  selectedLat = 14.6967,
  selectedLng = 121.1219,
  onSelectLocation,
  highlightedReportId,
  onSelectReport,
  showIncidents = true,
  showClosures = false,
  showFacilities = false,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const reportLayerRef = useRef<L.LayerGroup | null>(null);
  const closureLayerRef = useRef<L.LayerGroup | null>(null);
  const facilityLayerRef = useRef<L.LayerGroup | null>(null);
  const pickerMarkerRef = useRef<L.Marker | null>(null);
  const onSelectLocationRef = useRef(onSelectLocation);
  const onSelectReportRef = useRef(onSelectReport);

  onSelectLocationRef.current = onSelectLocation;
  onSelectReportRef.current = onSelectReport;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [selectedLat, selectedLng],
      zoom: 15,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    reportLayerRef.current = L.layerGroup().addTo(map);
    closureLayerRef.current = L.layerGroup().addTo(map);
    facilityLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    if (mode === 'picker') {
      const marker = L.marker([selectedLat, selectedLng], {
        icon: createPickerDivIcon(),
        draggable: true,
      }).addTo(map);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onSelectLocationRef.current?.(pos.lat, pos.lng);
      });

      map.on('click', (e: L.LeafletMouseEvent) => {
        marker.setLatLng(e.latlng);
        onSelectLocationRef.current?.(e.latlng.lat, e.latlng.lng);
      });

      pickerMarkerRef.current = marker;
    }

    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      reportLayerRef.current = null;
      closureLayerRef.current = null;
      facilityLayerRef.current = null;
      pickerMarkerRef.current = null;
    };
  }, [mode]);

  useEffect(() => {
    if (mode !== 'picker' || !mapRef.current || !pickerMarkerRef.current) return;
    const current = pickerMarkerRef.current.getLatLng();
    const dist = Math.hypot(current.lat - selectedLat, current.lng - selectedLng);
    if (dist > 0.00005) {
      pickerMarkerRef.current.setLatLng([selectedLat, selectedLng]);
      mapRef.current.panTo([selectedLat, selectedLng], { animate: true });
    }
  }, [mode, selectedLat, selectedLng]);

  useEffect(() => {
    if (mode !== 'explorer' || !highlightedReportId || !mapRef.current) return;
    const target = reports.find((r) => r.id === highlightedReportId);
    if (target) {
      mapRef.current.setView([target.lat, target.lng], 16, { animate: true });
    }
  }, [mode, highlightedReportId, reports]);

  useEffect(() => {
    const layer = reportLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (!showIncidents) return;

    for (const report of reports) {
      const isHighlighted = report.id === highlightedReportId;
      const marker = L.marker([report.lat, report.lng], {
        icon: createReportDivIcon(report, isHighlighted),
      });

      const statusInfo = STATUS_PIN_COLORS[report.status];
      const safeTitle = report.title.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const safeCategory = report.category.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const safeAddress = report.addressLabel.replace(/</g, '&lt;').replace(/>/g, '&gt;');

      const popupEl = document.createElement('div');
      popupEl.className = 'p-3 space-y-2 bg-[#FEFFFE]';
      popupEl.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
          <span style="font-family:monospace;font-size:11px;font-weight:700;color:#154792;">${report.id}</span>
          <span style="font-size:10px;font-weight:800;padding:2px 8px;border-radius:9999px;background:${statusInfo.badgeBg};color:${statusInfo.badgeText};">${statusInfo.label.toUpperCase()}</span>
        </div>
        <div style="font-size:13px;font-weight:700;color:#154792;line-height:1.3;">${safeTitle}</div>
        <div style="font-size:11px;color:#1177F0;font-weight:700;">${safeCategory}</div>
        <div style="font-size:11px;color:#4679C0;">${safeAddress}</div>
        ${
          report.mediaType === 'image'
            ? `<img src="${report.mediaUrl}" alt="${safeTitle}" style="width:100%;height:105px;object-fit:cover;border-radius:10px;border:1px solid #d7e4f6;" />`
            : `<div style="padding:8px 10px;background:#F3F7FD;border-radius:8px;font-size:11px;color:#154792;font-weight:600;">Video evidence attached</div>`
        }
      `;

      if (onSelectReportRef.current) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = 'Track Live Resolution';
        btn.style.cssText =
          'width:100%;margin-top:4px;padding:8px 10px;background:#1177F0;color:#FEFFFE;font-size:12px;font-weight:700;border-radius:10px;border:none;cursor:pointer;';
        btn.onclick = () => {
          onSelectReportRef.current?.(report);
        };
        popupEl.appendChild(btn);
      }

      marker.bindPopup(popupEl, { maxWidth: 280 });
      marker.addTo(layer);
    }
  }, [reports, highlightedReportId, showIncidents]);

  useEffect(() => {
    const layer = closureLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (!showClosures) return;

    for (const closure of ROAD_CLOSURES) {
      const marker = L.marker([closure.lat, closure.lng], {
        icon: createClosureDivIcon(),
      });
      const popupEl = document.createElement('div');
      popupEl.className = 'p-3 space-y-1.5 bg-[#FEFFFE]';
      popupEl.innerHTML = `
        <div style="font-size:10px;font-weight:800;color:#154792;background:#FBE95C;display:inline-block;padding:2px 8px;border-radius:9999px;text-transform:uppercase;">Road Closure · ${closure.id}</div>
        <div style="font-size:13px;font-weight:700;color:#154792;">${closure.title}</div>
        <div style="font-size:11px;color:#4679C0;font-weight:600;">${closure.street}</div>
        <div style="font-size:11px;font-weight:700;color:#1177F0;">${closure.schedule}</div>
        <div style="font-size:11px;color:#334155;">${closure.reason}</div>
      `;
      marker.bindPopup(popupEl, { maxWidth: 260 });
      marker.addTo(layer);
    }
  }, [showClosures]);

  useEffect(() => {
    const layer = facilityLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (!showFacilities) return;

    for (const fac of ESSENTIAL_FACILITIES) {
      const marker = L.marker([fac.lat, fac.lng], {
        icon: createFacilityDivIcon(fac.type),
      });
      const popupEl = document.createElement('div');
      popupEl.className = 'p-3 space-y-1.5 bg-[#FEFFFE]';
      popupEl.innerHTML = `
        <div style="font-size:10px;font-weight:800;color:#1177F0;text-transform:uppercase;">${fac.type}</div>
        <div style="font-size:13px;font-weight:700;color:#154792;">${fac.name}</div>
        <div style="font-size:11px;color:#4679C0;">${fac.address}</div>
        <div style="font-size:11px;font-family:monospace;font-weight:700;color:#154792;">${fac.phone}</div>
      `;
      marker.bindPopup(popupEl, { maxWidth: 250 });
      marker.addTo(layer);
    }
  }, [showFacilities]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full min-h-[360px] rounded-2xl overflow-hidden border border-[#d6e4f7] ${className}`}
      aria-label={
        mode === 'picker'
          ? 'Interactive San Mateo map for pinning incident GPS location'
          : 'Interactive San Mateo community incident map'
      }
    />
  );
};
