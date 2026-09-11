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
// RIDER ICON 🛺
// ===============================
const riderIcon = L.divIcon({
  className: "custom-rider-marker",
  html: `
    <div style="
      width: 42px;
      height: 42px;
      background: #2563eb;
      border: 3px solid white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 3px 10px rgba(0,0,0,0.3);
      font-size: 22px;
    ">
      🛺
    </div>
  `,
  iconSize: [42, 42],
  iconAnchor: [21, 21],
});

// ===============================
// DESTINATION ICON 📍
// ===============================
const destinationIcon = L.divIcon({
  className: "custom-destination-marker",
  html: `
    <div style="
      width: 38px;
      height: 38px;
      background: #ef4444;
      border: 3px solid white;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 3px 10px rgba(0,0,0,0.3);
    ">
      <div style="
        transform: rotate(45deg);
        color: white;
        font-size: 19px;
      ">
        📍
      </div>
    </div>
  `,
  iconSize: [38, 38],
  iconAnchor: [19, 38],
});

// ===============================
// AUTO FIT MAP
// ===============================
function MapUpdater({
  center,
  riderPosition,
  destinationPosition,
}) {
  const map = useMap();

  useEffect(() => {
    if (riderPosition && destinationPosition) {
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

    if (riderPosition) {
      map.setView(riderPosition, 15);
      return;
    }

    if (destinationPosition) {
      map.setView(destinationPosition, 15);
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
}) {
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [routeLoading, setRouteLoading] = useState(false);

  // ===============================
  // GET ROAD ROUTE FROM OSRM
  // ===============================
  useEffect(() => {
    if (!riderPosition || !destinationPosition) {
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
  }, [riderPosition, destinationPosition]);

  // ===============================
  // DEFAULT CENTER
  // ===============================
  const defaultCenter =
    center || [14.8311, 120.7358];

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
        {/* OPENSTREETMAP */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* AUTO ZOOM */}
        <MapUpdater
          center={center}
          riderPosition={riderPosition}
          destinationPosition={destinationPosition}
        />

        {/* ================= RIDER ================= */}
        {riderPosition && (
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

        {/* ================= DESTINATION ================= */}
        {destinationPosition && (
          <Marker
            position={destinationPosition}
            icon={destinationIcon}
          >
            <Popup>
              <strong>📍 Customer</strong>
              <br />
              Delivery destination
            </Popup>
          </Marker>
        )}

        {/* ================= ROUTE ================= */}
        {routeCoordinates.length > 0 && (
          <>
            {/* White outline */}
            <Polyline
              positions={routeCoordinates}
              pathOptions={{
                color: "#ffffff",
                weight: 8,
                opacity: 0.9,
              }}
            />

            {/* Blue route */}
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

      {/* ROUTE LOADING */}
      {routeLoading && (
        <div
          style={{
            position: "absolute",
            top: "15px",
            right: "15px",
            background: "white",
            padding: "8px 12px",
            borderRadius: "8px",
            boxShadow:
              "0 2px 8px rgba(0,0,0,0.15)",
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