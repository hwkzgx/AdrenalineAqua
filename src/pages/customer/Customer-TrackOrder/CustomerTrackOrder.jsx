import "./customer-trackorder.css";
import CustomerTopbar from "../../../components/NavBar/CustomerTopbar";
import { Truck, MapPin, User, MessageCircle, Clock3, Search, PackageCheck, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import LeafletDeliveryMap from "./LeafletDeliveryMap";
import { supabase } from "../../../supabase";
import Chat from "../../../components/Chat";

function calculateETA(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = R * c;

  const speedKmH = 20; 
  const timeHours = distanceKm / speedKmH;
  const timeMinutes = Math.round(timeHours * 60);

  return Math.max(1, timeMinutes);
}

export default function CustomerTrackOrder() {
  const hagonoyDefaultCenter = "Hagonoy, Bulacan, Philippines";

  const [order, setOrder] = useState(null);
  const [searchOrder, setSearchOrder] = useState("");
  const [riderName, setRiderName] = useState("No driver assigned yet");
  const [deliveryStatus, setDeliveryStatus] = useState("");
  const [etaMinutes, setEtaMinutes] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [mapQuery, setMapQuery] = useState(hagonoyDefaultCenter);
  const [mapCoordinates, setMapCoordinates] = useState([14.8311, 120.7358]);
  const [isRiderMoving, setIsRiderMoving] = useState(false);

  const [riderId, setRiderId] = useState(null);
  const [showChat, setShowChat] = useState(false);

  const [riderPosition, setRiderPosition] = useState(null);
  const [destinationPosition, setDestinationPosition] = useState(null);

  const fetchOrderDetails = async (orderData) => {
    const currentOrderId = orderData.order_id || orderData.id;

    const { data: schedData, error } = await supabase
      .from("delivery_schedule")
      .select(`
        assigned_rider,
        assigned_rider_id,
        delivery_status,
        rider_lat,
        rider_lng
      `)
      .eq("order_id", currentOrderId)
      .maybeSingle();

    if (error) {
      console.log("Error fetching delivery schedule:", error.message);
    }

    if (schedData && schedData.assigned_rider && schedData.assigned_rider !== "Not Assigned" && schedData.assigned_rider.trim() !== "") {
      setRiderName(schedData.assigned_rider);
    } else {
      setRiderName("No driver assigned yet");
    }
    setRiderId(schedData?.assigned_rider_id || null);

    setDeliveryStatus(schedData?.delivery_status || orderData.status);
    
    if (schedData?.rider_lat && schedData?.rider_lng) {
      setRiderPosition([
        Number(schedData.rider_lat),
        Number(schedData.rider_lng),
      ]);
    } else {
      setRiderPosition(null);
    }
  };

  const handleSearchOrder = async () => {
    if (!searchOrder.trim()) return;

    setErrorMessage("");
    const currentUser = JSON.parse(localStorage.getItem("user"));

    if (!currentUser) {
      setErrorMessage("Please log in to track your orders.");
      return;
    }

    const userId = currentUser.users_id || currentUser.id;

    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("order_code", searchOrder.trim())
      .eq("user_id", userId)
      .maybeSingle();

    if (orderError || !orderData) {
      setErrorMessage("Please search only your own valid Order ID.");
      setOrder(null);
      setRiderName("No driver assigned yet");
      setDeliveryStatus("");
      setEtaMinutes(null);
      setMapQuery(hagonoyDefaultCenter);
      setIsRiderMoving(false);
      setDestinationPosition(null);
      setRiderPosition(null);
      return;
    }

    setOrder(orderData);
    await fetchOrderDetails(orderData);

    if (orderData.destination_lat && orderData.destination_lng) {
      const destination = [
        Number(orderData.destination_lat),
        Number(orderData.destination_lng),
      ];

      setDestinationPosition(destination);
      setMapCoordinates(destination);
    } else if (orderData.delivery_address) {
      setMapQuery(orderData.delivery_address);
    } else {
      setMapQuery(hagonoyDefaultCenter);
    }
  };

  // Geocode address para makuha ang destination coordinates kung wala sa orders table
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
        console.error("Error finding map location:", error);
      }
    };

    geocodeAddress();
  }, [mapQuery]);

  // Kalkulahin ang ETA tuwing magbabago ang riderPosition o destinationPosition
  useEffect(() => {
    if (riderPosition && destinationPosition) {
      const minutes = calculateETA(
        riderPosition[0],
        riderPosition[1],
        destinationPosition[0],
        destinationPosition[1]
      );
      setEtaMinutes(minutes);
      setIsRiderMoving(true);
    } else {
      setEtaMinutes(null);
      setIsRiderMoving(false);
    }
  }, [riderPosition, destinationPosition]);

  // Real-time listener para sa live updates ng rider location at status
  useEffect(() => {
    if (!order?.order_id && !order?.id) return;

    const currentOrderId = order.order_id || order.id;

    const channel = supabase
      .channel(`track-order-${currentOrderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "delivery_schedule",
          filter: `order_id=eq.${currentOrderId}`,
        },
        (payload) => {
          const updatedSchedule = payload.new;

          if (
            updatedSchedule.rider_lat &&
            updatedSchedule.rider_lng
          ) {
            setRiderPosition([
              Number(updatedSchedule.rider_lat),
              Number(updatedSchedule.rider_lng),
            ]);
          }

          if (
            updatedSchedule.assigned_rider &&
            updatedSchedule.assigned_rider !== "Not Assigned"
          ) {
            setRiderName(updatedSchedule.assigned_rider);
          }

          if (updatedSchedule.delivery_status) {
            setDeliveryStatus(updatedSchedule.delivery_status);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order?.order_id, order?.id]);

  const isDelivered =
    deliveryStatus?.toLowerCase() === "delivered" ||
    order?.status?.toLowerCase() === "delivered";

  const activeDriver =
    riderName !== "No driver assigned yet" &&
    riderName !== "Not Assigned" &&
    riderName.trim() !== "";

  return (
    <>
      <CustomerTopbar />

      <div className="track-order-page">
        <div className="track-order-container">
          
          {/* LEFT SIDE */}
          <div className="track-order-left">
            <div className="track-header">
              <div className="track-icon"><Truck size={28} /></div>
              <div>
                <h2>Track Your Order</h2>
                <p>Real-time updates on your delivery</p>
              </div>
            </div>

            <div className="order-top">
              <div className="order-id-section">
                <span>Order ID</span>
                <h3>{order ? order.order_code : "— — — —"}</h3>
              </div>

              <div className="track-search">
                <Search size={18} style={{ cursor: "pointer" }} onClick={handleSearchOrder} />
                <input
                  type="text"
                  placeholder="Search by Order ID..."
                  value={searchOrder}
                  onChange={(e) => setSearchOrder(e.target.value.toUpperCase())}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSearchOrder(); }}
                />
              </div>
            </div>

            {order?.order_type === "Pickup" ? (
              <div className="pickup-card">
                <h3>Pickup Order</h3>
                <p>This order is for pickup. No delivery tracking available.</p>
              </div>
            ) : (
              <>
                <div style={{ margin: "20px 0", padding: "0 10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "12px", fontWeight: "600", color: "#64748b" }}>Delivery Progress</span>
                    <span style={{ fontSize: "12px", fontWeight: "700", color: "#2563eb" }}>
                      {isDelivered ? "Delivered (100%)" : order ? "Out for Delivery (75%)" : "Pending (0%)"}
                    </span>
                  </div>
                  <div style={{ width: "100%", height: "8px", backgroundColor: "#e2e8f0", borderRadius: "999px", overflow: "hidden" }}>
                    <div style={{
                      width: isDelivered ? "100%" : order ? "75%" : "0%",
                      height: "100%",
                      backgroundColor: "#2563eb",
                      borderRadius: "999px",
                      transition: "width 0.6s ease"
                    }}></div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", fontSize: "11px", color: "#94a3b8", fontWeight: "500" }}>
                    <span>Received</span>
                    <span>Processing</span>
                    <span>On Delivery</span>
                    <span>Delivered</span>
                  </div>
                </div>

                <div className="eta-card">
                  <div className="eta-icon"><Clock3 size={32} /></div>
                  <div>
                    <h4>Estimated Arrival</h4>
                    <h2>
                      {isDelivered 
                        ? "Order Completed" 
                        : etaMinutes 
                        ? `${etaMinutes} mins away` 
                        : order 
                        ? "Calculating ETA..." 
                        : "Waiting for order ID"}
                    </h2>
                    <p>
                      {isDelivered 
                        ? "Your order has been successfully delivered." 
                        : order 
                        ? "Our rider is on the way to you." 
                        : "-"}
                    </p>
                  </div>
                </div>

                <div className="driver-card">
                  <div className="driver-left">
                    <div className="driver-avatar"><User size={42} /></div>
                    <div>
                      <h3>{riderName}</h3>
                      <p>Delivery Driver</p>

                      <button
                        className="message-btn"
                        disabled={!activeDriver || !riderId}
                        onClick={() => setShowChat(true)}
                        style={{
                          opacity: activeDriver && riderId ? 1 : 0.6,
                          cursor: activeDriver && riderId ? "pointer" : "not-allowed"
                        }}
                      >
                        <MessageCircle size={16} /> Message
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* RIGHT SIDE */}
          <div className="track-order-right">
            {errorMessage ? (
              <div className="map-card-placeholder" style={{ height: "100%", minHeight: "350px", display: "flex", alignItems: "center", justifyContent: "center", background: "#fef2f2", border: "2px solid #fecaca", borderRadius: "12px", color: "#991b1b", textAlign: "center", padding: "30px" }}>
                <div>
                  <AlertCircle size={50} style={{ color: "#ef4444", marginBottom: "12px" }} />
                  <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "6px" }}>Order Not Found</h3>
                  <p style={{ fontSize: "13px", color: "#b91c1c" }}>{errorMessage}</p>
                </div>
              </div>
            ) : !order ? (
              <div className="map-card-placeholder" style={{
                height: "100%",
                minHeight: "420px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                border: "2px dashed #cbd5e1",
                borderRadius: "16px",
                backgroundColor: "#f8fafc",
                textAlign: "center",
                padding: "30px",
                color: "#64748b"
              }}>
                <div style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  backgroundColor: "#f1f5f9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "12px",
                  color: "#94a3b8"
                }}>
                  <MapPin size={24} />
                </div>
                <p style={{ fontSize: "14px", fontWeight: "500", margin: 0, color: "#64748b" }}>
                  Map and delivery details will appear here once you search an Order ID.
                </p>
              </div>
            ) : order && order?.order_type?.toLowerCase() !== "pickup" ? (
              isDelivered ? (
                <div className="map-card-placeholder" style={{ height: "100%", minHeight: "350px", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0fdf4", border: "2px solid #bbf7d0", borderRadius: "12px", color: "#166534", textAlign: "center", padding: "30px" }}>
                  <div>
                    <PackageCheck size={50} style={{ color: "#22c55e", marginBottom: "12px" }} />
                    <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "6px" }}>Your order is delivered already!</h3>
                    <p style={{ fontSize: "13px", color: "#15803d" }}>Thank you for ordering with us. Hope you enjoy your items!</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="map-card" style={{ position: "relative", height: "450px", width: "100%", borderRadius: "16px", overflow: "hidden" }}>
                    <LeafletDeliveryMap
                      center={mapCoordinates}
                      riderPosition={riderPosition}
                      destinationPosition={destinationPosition}
                    />

                    {/* TRICYCLE INDICATOR BADGE */}
                    <div style={{
                      position: "absolute",
                      bottom: "20px",
                      left: "20px",
                      background: "white",
                      padding: "8px 14px",
                      borderRadius: "30px",
                      boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      zIndex: 1000,
                      border: "1px solid #e2e8f0"
                    }}>
                      <div style={{
                        background: "#2563eb",
                        color: "white",
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "18px"
                      }}>
                        🛺
                      </div>
                      <div>
                        <p style={{ fontSize: "11px", fontWeight: "700", color: "#2563eb", margin: 0 }}>LIVE RIDER TRACKER</p>
                        <p style={{ fontSize: "12px", fontWeight: "600", color: "#1e293b", margin: 0 }}>
                          {isRiderMoving ? "Tricycle is moving..." : "Driver is preparing"}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )
            ) : null}
          </div>

        </div>
      </div>
      {showChat && order && riderId && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999
          }}
        >
          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "16px",
              width: "500px",
              maxWidth: "90%",
              position: "relative"
            }}
          >
            <Chat
              orderId={order.order_id}
              currentUserId={
                JSON.parse(localStorage.getItem("user"))?.users_id ||
                JSON.parse(localStorage.getItem("user"))?.id
              }
              otherUserId={riderId}
              otherUserName={riderName}
              otherUserRole="Delivery Rider"
              onClose={() => setShowChat(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}