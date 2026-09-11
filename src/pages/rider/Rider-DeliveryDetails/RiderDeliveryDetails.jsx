import { useState, useEffect } from "react";
import "./rider-deliverydetails.css";
import { useParams, useNavigate } from "react-router-dom";
import RiderLeafletMap from "./RiderLeafletMap";
import { supabase } from "../../../supabase";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Send,
  Briefcase
} from "lucide-react";

export default function RiderDeliveryDetails() {
  const { id } = useParams();
  const [delivery, setDelivery] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Estados para sa Modal at Map
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [hasConfirmedMap, setHasConfirmedMap] = useState(false);
  const [mapQuery, setMapQuery] = useState("Hagonoy, Bulacan, Philippines");
  const [isRiderMoving, setIsRiderMoving] = useState(false);

  const [riderPosition, setRiderPosition] = useState(null);
  const [destinationPosition, setDestinationPosition] = useState(null);
  const [mapCoordinates, setMapCoordinates] = useState([14.8311, 120.7358]);

  // Estados para sa Container Tracking Modal (Idinagdag)
  const [showContainerModal, setShowContainerModal] = useState(false);
  const [containersDelivered, setContainersDelivered] = useState(0);
  const [containersReturned, setContainersReturned] = useState(0);

  // I-check kung nag-Yes na dati ang rider sa localStorage
  useEffect(() => {
    if (localStorage.getItem("riderMapConfirmed") === "true") {
      setHasConfirmedMap(true);
    }
  }, []);

  useEffect(() => {
    fetchDeliveryDetails();
  }, [id]);

  // Real-time GPS tracking habang "Out for Delivery"
  useEffect(() => {
    let watchId = null;

    if (
      delivery?.delivery_status === "Out for Delivery" &&
      delivery?.scheduleOrderId
    ) {
      if ("geolocation" in navigator) {
        watchId = navigator.geolocation.watchPosition(
          async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            setIsRiderMoving(true);
            setRiderPosition([lat, lng]);

            const { error } = await supabase
              .from("delivery_schedule")
              .update({
                rider_lat: lat,
                rider_lng: lng,
              })
              .eq("order_id", delivery.scheduleOrderId);

            // Update rider location in ORDERS
            const { error: orderError } = await supabase
              .from("orders")
              .update({
                rider_lat: lat,
                rider_lng: lng,
              })
              .eq("order_id", delivery.scheduleOrderId);

            if (orderError) {
              console.log(
                "Error updating rider location in orders:",
                orderError.message
              );
            }

            // Update rider location in DELIVERY_SCHEDULE
            const { error: scheduleError } = await supabase
              .from("delivery_schedule")
              .update({
                rider_lat: lat,
                rider_lng: lng,
              })
              .eq("order_id", delivery.scheduleOrderId);

            if (scheduleError) {
              console.log(
                "Error updating rider location in delivery_schedule:",
                scheduleError.message
              );
            }
          },
          (error) => {
            console.log("Geolocation error:", error.message);
          },
          {
            enableHighAccuracy: true,
            maximumAge: 10000,
            timeout: 5000,
          }
        );
      }
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [delivery?.delivery_status, delivery?.scheduleOrderId]);

  useEffect(() => {
    if (!mapQuery) return;

    const geocodeAddress = async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            mapQuery
          )}&limit=1`
        );

        const data = await response.json();

        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);

          setDestinationPosition([lat, lng]);
          setMapCoordinates([lat, lng]);
        }
      } catch (error) {
        console.error("Error finding destination:", error);
      }
    };

    geocodeAddress();
  }, [mapQuery]);

  const fetchDeliveryDetails = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        order_id,
        order_code,
        full_name,
        delivery_address,
        delivery_date,
        delivery_schedule (
          order_id,
          delivery_code,
          delivery_status,
          assigned_rider,
          rider_lat,
          rider_lng
        ),
        order_items (
          item_name,
          quantity
        )
      `)
      .eq("order_id", id)
      .single();

    if (error) {
      console.log("Supabase error:", error.message);
      setLoading(false);
      return;
    }

    let scheduleId = data.delivery_schedule?.[0]?.order_id;
    let deliveryStatus = data.delivery_schedule?.[0]?.delivery_status;
    let deliveryCode = data.delivery_schedule?.[0]?.delivery_code;

    const riderLat = data.delivery_schedule?.[0]?.rider_lat;
    const riderLng = data.delivery_schedule?.[0]?.rider_lng;

    if (riderLat && riderLng) {
      setRiderPosition([
        Number(riderLat),
        Number(riderLng),
      ]);
    }

    if (data.delivery_address) {
      setMapQuery(data.delivery_address);
    }

    if (!scheduleId) {
      const { data: newSched, error: insertError } = await supabase
        .from("delivery_schedule")
        .insert([
          { 
            order_id: data.order_id, 
            delivery_status: "Pending",
            assigned_rider: localStorage.getItem("userName") || "Mark",
            delivery_code: `DEL-${data.order_id}`
          }
        ])
        .select()
        .single();

      if (!insertError && newSched) {
        scheduleId = newSched.order_id;
        deliveryStatus = newSched.delivery_status;
        deliveryCode = newSched.delivery_code;
      }
    }

    setDelivery({
      orderId: data.order_id,
      scheduleOrderId: scheduleId,
      deliveryId: deliveryCode || "N/A",
      full_name: data.full_name,
      delivery_address: data.delivery_address,
      delivery_date: data.delivery_date,
      delivery_status: deliveryStatus || "Pending",
    });

    setItems(data.order_items || []);
    setLoading(false);
  };

  const updateDeliveryStatus = async (newStatus) => {
    if (!delivery?.scheduleOrderId) {
      alert("Hindi ma-update: Walang nakitang schedule reference sa database.");
      return;
    }

    const { error } = await supabase
      .from("delivery_schedule")
      .update({ delivery_status: newStatus })
      .eq("order_id", delivery.scheduleOrderId);

    if (error) {
      console.log("Error updating status:", error.message);
      alert("Failed to update status.");
    } else {
      setDelivery((prev) => ({ ...prev, delivery_status: newStatus }));
      alert(`Status updated to: ${newStatus}`);
    }
  };

  // Function para i-save ang container transactions sa Supabase (Idinagdag)
  const handleSaveContainerAndDelivery = async () => {
    const delivered = Number(containersDelivered);
    const returned = Number(containersReturned);
    const outstanding = delivered - returned;
    const status = outstanding > 0 ? "Pending" : "Cleared";

    const { error: containerError } = await supabase
      .from("container_transactions")
      .insert([
        {
          order_id: delivery.orderId,
          delivered_quantity: delivered,
          returned_quantity: returned,
          outstanding_quantity: outstanding,
          container_status: status
        }
      ]);

    if (containerError) {
      alert("Error sa pag-save ng container: " + containerError.message);
      return;
    }

    await updateDeliveryStatus("Delivered");
    setShowContainerModal(false);
  };

  // Logic kung bubuksan ba ang modal o direkta sa map
  const handleOpenMapClick = () => {
    if (hasConfirmedMap) {
      setShowMapModal(true);
    } else {
      setShowConfirmModal(true);
    }
  };

  if (loading) {
    return <p style={{ padding: "20px" }}>Loading...</p>;
  }

  if (!delivery) {
    return <p style={{ padding: "20px" }}>Delivery not found.</p>;
  }

  const currentStatus = delivery.delivery_status || "Pending";

  return (
    <div className="details-container">
      <div className="header">
        <div className="header-left">
          <button onClick={() => navigate(-1)} className="back-btn">
            <ArrowLeft size={20} />
          </button>
          <h2>Delivery Details</h2>
        </div>
      </div>

      <div className="top-card">
        <div className="detailstop-row">
          <div>
            <p className="detailslabel">Delivery ID</p>
            <h1>{delivery.deliveryId}</h1>
          </div>
          <span className={`deliverydetstatus ${currentStatus.toLowerCase().replace(/\s+/g, '-')}`}>
            {currentStatus}
          </span>
        </div>

        <div className="customer-row">
          <h3 className="customer-name">{delivery.full_name}</h3>
          <button className="message-btn">Message</button>
        </div>

        <div className="schedule">
          <div>
            <p className="label">Scheduled Time</p>
            <h4>{delivery.delivery_date}</h4>
          </div>
          <Calendar size={20} />
        </div>
      </div>

      <div className="section">
        <div className="section-title">
          <MapPin size={25} />
          <h3>Delivery Address</h3>
        </div>
        <p className="address">{delivery.delivery_address}</p>
        
        {/* VIEW MAP BUTTON */}
        <button className="open-map" onClick={handleOpenMapClick}>
          <Send size={18} /> View Map
        </button>
      </div>

      <div className="section">
        <div className="section-title">
          <Briefcase size={25} />
          <h3>Order Items</h3>
        </div>
        {items.length === 0 ? (
          <p>No items found.</p>
        ) : (
          items.map((item, index) => (
            <div className="item-row" key={index}>
              <span>💧 {item.item_name}</span>
              <span>{item.quantity ? `x${item.quantity}` : ""}</span>
            </div>
          ))
        )}
      </div>

      <button 
        className="accept-btn" 
        onClick={() => updateDeliveryStatus("Out for Delivery")}
        disabled={currentStatus !== "Pending"}
        style={{ opacity: currentStatus !== "Pending" ? 0.5 : 1, cursor: currentStatus !== "Pending" ? "not-allowed" : "pointer" }}
      >
        Accept Delivery
      </button>

      {/* Binago ang onClick para magbukas muna ng container modal bago i-mark as delivered */}
      <button 
        className="delivered-btn" 
        onClick={() => setShowContainerModal(true)}
        disabled={currentStatus !== "Out for Delivery"}
        style={{ opacity: currentStatus !== "Out for Delivery" ? 0.5 : 1, cursor: currentStatus !== "Out for Delivery" ? "not-allowed" : "pointer" }}
      >
        Mark as Delivered
      </button>

      {currentStatus === "Delivered" && (
        <p style={{ textAlign: "center", fontWeight: "600", color: "#047857", marginTop: "15px" }}>
          ✓ This delivery has been completed.
        </p>
      )}

      {/* CONTAINER TRACKING MODAL (Idinagdag) */}
      {showContainerModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          backgroundColor: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center",
          alignItems: "center", zIndex: 1200, padding: "20px"
        }}>
          <div style={{
            background: "#fff", padding: "24px", borderRadius: "16px", width: "100%", maxWidth: "360px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.2)"
          }}>
            <h3 style={{ marginBottom: "6px", fontSize: "18px", color: "#1e293b" }}>Container Summary</h3>
            <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "20px" }}>How many containers were dropped off and returned by the customer?</p>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "5px", color: "#334155" }}>
                Containers Delivered:
              </label>
              <input 
                type="number" 
                min="0"
                value={containersDelivered}
                onChange={(e) => setContainersDelivered(parseInt(e.target.value) || 0)}
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "15px" }}
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "5px", color: "#334155" }}>
                Containers Returned:
              </label>
              <input 
                type="number" 
                min="0"
                value={containersReturned}
                onChange={(e) => setContainersReturned(parseInt(e.target.value) || 0)}
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "15px" }}
              />
            </div>

            <div style={{ backgroundColor: "#f8fafc", padding: "10px 14px", borderRadius: "8px", marginBottom: "20px", border: "1px solid #e2e8f0" }}>
              <span style={{ fontSize: "13px", color: "#475569" }}>Outstanding Balance: </span>
              <strong style={{ fontSize: "14px", color: "#2563eb" }}>
                {containersDelivered - containersReturned} container(s)
              </strong>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button 
                onClick={() => setShowContainerModal(false)}
                style={{ flex: 1, padding: "10px", background: "#e2e8f0", border: "none", borderRadius: "8px", fontWeight: "600", cursor: "pointer", color: "#475569" }}
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveContainerAndDelivery}
                style={{ flex: 1, padding: "10px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "600", cursor: "pointer" }}
              >
                Save & Complete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. QUESTION MODAL (Lalabas lang sa unang beses) */}
      {showConfirmModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center",
          alignItems: "center", zIndex: 1000, padding: "20px"
        }}>
          <div style={{
            background: "#fff", padding: "24px", borderRadius: "12px", width: "100%", maxWidth: "320px",
            textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.15)"
          }}>
            <h3 style={{ marginBottom: "10px", fontSize: "18px", color: "#1e293b" }}>Open Map?</h3>
            <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "20px" }}>Do you want to open the live map for this delivery address?</p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button 
                onClick={() => setShowConfirmModal(false)}
                style={{ padding: "8px 16px", background: "#e2e8f0", border: "none", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}
              >
                No
              </button>
              <button 
                onClick={() => {
                  localStorage.setItem("riderMapConfirmed", "true");
                  setHasConfirmedMap(true);
                  setShowConfirmModal(false);
                  setShowMapModal(true);
                }}
                style={{ padding: "8px 16px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. MAP MODAL (Google Maps Embed na may Tricycle Indicator) */}
      {showMapModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          backgroundColor: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center",
          alignItems: "center", zIndex: 1100, padding: "20px"
        }}>
          <div style={{
            background: "#fff", borderRadius: "16px", width: "100%", maxWidth: "500px",
            overflow: "hidden", boxShadow: "0 10px 25px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column"
          }}>
            <div style={{ padding: "15px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#1e293b" }}>Delivery Map Route</h3>
            </div>

            <div style={{ padding: "15px", backgroundColor: "#f8fafc" }}>
              <p style={{ fontSize: "13px", color: "#475569", marginBottom: "10px" }}>
                <strong>Destination:</strong> {delivery.delivery_address}
              </p>
              
              <div style={{ height: "350px", width: "100%", borderRadius: "10px", overflow: "hidden", position: "relative" }}>
                <RiderLeafletMap
                  center={mapCoordinates}
                  riderPosition={riderPosition}
                  destinationPosition={destinationPosition}
                />

                {/* TRICYCLE INDICATOR BADGE */}
                <div style={{
                  position: "absolute",
                  bottom: "15px",
                  left: "15px",
                  background: "white",
                  padding: "8px 14px",
                  borderRadius: "30px",
                  boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  zIndex: 10,
                  border: "1px solid #e2e8f0"
                }}>
                  <div style={{
                    background: "#2563eb",
                    color: "white",
                    width: "34px",
                    height: "34px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "16px"
                  }}>
                    🛺
                  </div>
                  <div>
                    <p style={{ fontSize: "10px", fontWeight: "700", color: "#2563eb", margin: 0 }}>ACTIVE ROUTE</p>
                    <p style={{ fontSize: "11px", fontWeight: "600", color: "#1e293b", margin: 0 }}>
                      {isRiderMoving ? "Tricycle is moving..." : "Heading to destination"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: "12px 20px", textAlign: "right", borderTop: "1px solid #e2e8f0" }}>
              <button 
                onClick={() => setShowMapModal(false)}
                style={{ padding: "8px 16px", background: "#64748b", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}
              >
                Close Map
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}