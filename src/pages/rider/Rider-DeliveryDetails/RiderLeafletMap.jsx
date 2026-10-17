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
}) {
  const map = useMap();

  useEffect(() => {
    if (
      isTracking &&
      riderPosition &&
      destinationPosition
    ) {
      const bounds = L.latLngBounds([
        riderPosition,
        destinationPosition,
      ]);

      map.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 16,
      });

      return;
    }

    if (destinationPosition) {
      map.setView(destinationPosition, 18);
      return;
    }

    if (center) {
      map.setView(center, 13);
    }
  }, [
    map,
    center,
    riderPosition,
    destinationPosition,
    isTracking,
  ]);

  return null;
}

// ===============================
// MAIN RIDER MAP
// ===============================
export default function RiderLeafletMap({
  center,
  riderPosition,
  destinationPosition,
  isTracking,
  status,
}) {
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [routeLoading, setRouteLoading] = useState(false);

  const isDelivered =
    (status || "").toLowerCase().replace(/[\s-]+/g, "_") === "delivered";

  // Status chip sa mapa (kapareho ng sa customer)
  const statusChip = !status
    ? null
    : isDelivered
    ? { text: "Delivered", bg: "#dcfce7", color: "#166534" }
    : isTracking
    ? { text: "On the way!", bg: "#dbeafe", color: "#1e40af" }
    : { text: "Preparing", bg: "#ffedd5", color: "#9a3412" };

  useEffect(() => {
    // Route: tracking lang (Out for Delivery), mawawala kapag Delivered
    if (!isTracking || isDelivered || !riderPosition || !destinationPosition) {
      setRouteCoordinates([]);
      return;
    }

    const getRoute = async () => {
      try {
        setRouteLoading(true);

        const riderLat = Number(riderPosition[0]);
        const riderLng = Number(riderPosition[1]);

        const destinationLat = Number(destinationPosition[0]);
        const destinationLng = Number(destinationPosition[1]);

        const url =
          `https://router.project-osrm.org/route/v1/driving/` +
          `${riderLng},${riderLat};` +
          `${destinationLng},${destinationLat}` +
          `?overview=full&geometries=geojson`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error("Failed to fetch route");
        }

        const data = await response.json();

        if (
          data.routes &&
          data.routes.length > 0 &&
          data.routes[0].geometry
        ) {
          const coordinates =
            data.routes[0].geometry.coordinates.map(
              ([lng, lat]) => [lat, lng]
            );

          setRouteCoordinates(coordinates);
        } else {
          setRouteCoordinates([]);
        }
      } catch (error) {
        console.error("OSRM route error:", error);
        setRouteCoordinates([]);
      } finally {
        setRouteLoading(false);
      }
    };

    getRoute();
  }, [riderPosition, destinationPosition, isTracking, isDelivered]);

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
          isTracking={isTracking}
        />

        {/* RIDER */}
        {riderPosition && isTracking && !isDelivered && (
          <Marker
            position={riderPosition}
            icon={riderIcon}
          >
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