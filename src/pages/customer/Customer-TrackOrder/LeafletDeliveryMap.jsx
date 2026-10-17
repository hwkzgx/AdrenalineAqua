import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Mga status na ibig sabihin ay "inaccept na ni rider at on the way na"
const OUT_FOR_DELIVERY_STATUSES = [
  "out_for_delivery",
  "on_delivery",
  "on_the_way",
  "in_transit",
  "delivering",
];

const normalizeStatus = (value) =>
  (value || "").toString().toLowerCase().trim().replace(/[\s-]+/g, "_");

// ===============================
// RIDER ICON (KOLONG-KOLONG SVG - CSS BASED)
// ===============================
const riderIcon = L.divIcon({
  className: "custom-rider-marker",
  html: `
    <div class="custom-rider-container">
      <div class="custom-rider-pulse"></div>
      <div class="custom-rider-icon-box">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="5" cy="19" r="2"></circle>
          <circle cx="16" cy="19" r="2"></circle>
          <circle cx="19" cy="13" r="1.5"></circle>
          <path d="M3 17V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v9"></path>
          <path d="M15 9h3l2 4v4"></path>
          <path d="M3 13h12"></path>
          <path d="M5 6V4h6v2"></path>
        </svg>
      </div>
    </div>
  `,
  iconSize: [52, 52],
  iconAnchor: [26, 26],
});

// ===============================
// DESTINATION ICON 📍
// ===============================
const destinationIcon = L.divIcon({
  className: "custom-destination-marker",
  html: `
    <div class="custom-dest-icon-box">
      <div class="custom-dest-inner">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
      </div>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});

// ===============================
// DELIVERED ICON (green + checkmark)
// ===============================
const deliveredIcon = L.divIcon({
  className: "custom-destination-marker",
  html: `
    <svg width="40" height="40" viewBox="0 0 40 40" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.35));">
      <path d="M20 0C11.7 0 5 6.7 5 15c0 11 15 25 15 25s15-14 15-25C35 6.7 28.3 0 20 0z" fill="#16a34a"/>
      <circle cx="20" cy="15" r="9" fill="#fff"/>
      <path d="M14.5 15.5l4 4 7-8" fill="none" stroke="#16a34a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});

// ===============================
// MAP UPDATER
// ===============================
function MapUpdater({
  center,
  riderPosition,
  destinationPosition,
  isTracking,
  isDelivered,
}) {
  const map = useMap();

  useEffect(() => {
    // Delivered: ipakita ang destination
    if (isDelivered && destinationPosition) {
      map.setView(destinationPosition, 18);
      return;
    }

    // Out for delivery: ipakita pareho (rider + customer)
    if (isTracking && riderPosition && destinationPosition) {
      const bounds = L.latLngBounds([riderPosition, destinationPosition]);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      return;
    }

    // Processing/Preparing: location ni rider ang ipakita
    if (riderPosition) {
      map.setView(riderPosition, 17);
      return;
    }

    // Fallback kung wala pang rider location
    if (destinationPosition) {
      map.setView(destinationPosition, 18);
      return;
    }

    if (center) {
      map.setView(center, 13);
    }
  }, [map, center, riderPosition, destinationPosition, isTracking, isDelivered]);

  return null;
}

// ===============================
// MAIN MAP
// ===============================
// Tumatanggap ng `status` O `deliveryStatus` (pareho gagana).
// Kung hindi ipinasa ang `isTracking`, kusa itong huhulaan mula sa status.
export default function RiderLeafletMap({
  center,
  riderPosition,
  destinationPosition,
  isTracking,
  status,
  deliveryStatus,
}) {
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [routeLoading, setRouteLoading] = useState(false);

  const normalizedStatus = normalizeStatus(status ?? deliveryStatus);
  const isDelivered = normalizedStatus === "delivered";

  // Kung may ipinasang isTracking, gamitin yun. Kung wala, base sa status.
  const tracking =
    typeof isTracking === "boolean"
      ? isTracking
      : OUT_FOR_DELIVERY_STATUSES.includes(normalizedStatus);

  // Status chip sa mapa (kapareho ng sa customer)
  const statusChip = !normalizedStatus
    ? null
    : isDelivered
    ? { text: "Delivered", bg: "#dcfce7", color: "#166534" }
    : tracking
    ? { text: "On the way!", bg: "#dbeafe", color: "#1e40af" }
    : { text: "Preparing", bg: "#ffedd5", color: "#9a3412" };

  const riderLat = riderPosition ? Number(riderPosition[0]) : null;
  const riderLng = riderPosition ? Number(riderPosition[1]) : null;
  const destLat = destinationPosition ? Number(destinationPosition[0]) : null;
  const destLng = destinationPosition ? Number(destinationPosition[1]) : null;

  useEffect(() => {
    // Route: tracking lang (Out for Delivery), mawawala kapag Delivered
    if (
      !tracking ||
      isDelivered ||
      riderLat === null ||
      riderLng === null ||
      destLat === null ||
      destLng === null
    ) {
      setRouteCoordinates([]);
      return;
    }

    let cancelled = false;

    const getRoute = async () => {
      try {
        setRouteLoading(true);

        // BACKTICKS ito (template literal) para gumana ang ${...}
        const url = `https://router.project-osrm.org/route/v1/driving/${riderLng},${riderLat};${destLng},${destLat}?overview=full&geometries=geojson`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error("Failed to fetch route");
        }

        const data = await response.json();

        if (cancelled) return;

        if (
          data.routes &&
          data.routes.length > 0 &&
          data.routes[0].geometry
        ) {
          const coordinates = data.routes[0].geometry.coordinates.map(
            ([lng, lat]) => [lat, lng]
          );

          setRouteCoordinates(coordinates);
        } else {
          // Fallback: tuwid na linya kung walang nakuhang route
          setRouteCoordinates([
            [riderLat, riderLng],
            [destLat, destLng],
          ]);
        }
      } catch (error) {
        console.error("OSRM route error:", error);
        if (!cancelled) {
          // Fallback: tuwid na linya para may makita pa rin
          setRouteCoordinates([
            [riderLat, riderLng],
            [destLat, destLng],
          ]);
        }
      } finally {
        if (!cancelled) setRouteLoading(false);
      }
    };

    getRoute();

    return () => {
      cancelled = true;
    };
  }, [riderLat, riderLng, destLat, destLng, tracking, isDelivered]);

  const defaultCenter = center || [14.8311, 120.7358];

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        minHeight: "350px",
        borderRadius: "12px",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <MapContainer
        center={defaultCenter}
        zoom={13}
        scrollWheelZoom={true}
        style={{
          width: "100%",
          height: "100%",
          minHeight: "350px",
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapUpdater
          center={center}
          riderPosition={riderPosition}
          destinationPosition={destinationPosition}
          isTracking={tracking}
          isDelivered={isDelivered}
        />

        {/* RIDER (kita na kahit Preparing/Processing, nawawala lang kapag Delivered) */}
        {riderPosition && !isDelivered && (
          <Marker position={riderPosition} icon={riderIcon}>
            <Popup>
              <strong>🛺 Rider</strong>
              <br />
              Current rider location
            </Popup>
          </Marker>
        )}

        {/* DESTINATION */}
        {destinationPosition && (
          <Marker
            position={destinationPosition}
            icon={isDelivered ? deliveredIcon : destinationIcon}
          >
            <Popup>
              {isDelivered ? (
                <>
                  <strong>✅ Delivered</strong>
                  <br />
                  Successfully delivered na ang order.
                </>
              ) : (
                <>
                  <strong>📍 Customer</strong>
                  <br />
                  Delivery destination
                </>
              )}
            </Popup>
          </Marker>
        )}

        {/* ROUTE */}
        {routeCoordinates.length > 0 && (
          <>
            <Polyline
              positions={routeCoordinates}
              pathOptions={{
                color: "#ffffff",
                weight: 8,
                opacity: 0.9,
              }}
            />
            <Polyline
              positions={routeCoordinates}
              pathOptions={{
                color: "#2563eb",
                weight: 5,
                opacity: 1,
              }}
            />
          </>
        )}
      </MapContainer>

      {statusChip && (
        <div
          style={{
            position: "absolute",
            top: "15px",
            left: "65px",
            background: statusChip.bg,
            color: statusChip.color,
            padding: "6px 12px",
            borderRadius: "999px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            fontSize: "12px",
            fontWeight: "700",
            zIndex: 1000,
          }}
        >
          {statusChip.text}
        </div>
      )}

      {routeLoading && (
        <div
          style={{
            position: "absolute",
            top: "15px",
            right: "15px",
            background: "white",
            padding: "8px 12px",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            fontSize: "12px",
            fontWeight: "600",
            color: "#475569",
            zIndex: 1000,
          }}
        >
          Calculating route...
        </div>
      )}
    </div>
  );
}
