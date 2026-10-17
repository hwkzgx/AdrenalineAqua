import { useEffect, useState } from "react";
import { supabase } from "../../../supabase"; // <-- ayusin ang path ayon sa folder ng file na ito
import LeafletDeliveryMap from "./LeafletDeliveryMap";

/**
 * Automatic na tracking para sa customer.
 * - Kinukuha ang status, rider location at destination ng order
 * - Nakikinig sa realtime updates ng delivery_schedule, kaya kusang
 *   nagbabago ang status at gumagalaw ang tricycle (walang refresh)
 *
 * Gamit: <CustomerTrackMap orderId={order.order_id} />
 */
export default function CustomerTrackMap({ orderId }) {
  const [status, setStatus] = useState("Pending");
  const [riderPosition, setRiderPosition] = useState(null);
  const [destinationPosition, setDestinationPosition] = useState(null);

  const applySchedule = (row) => {
    if (!row) return;
    if (row.delivery_status) setStatus(row.delivery_status);
    if (row.rider_lat && row.rider_lng) {
      setRiderPosition([Number(row.rider_lat), Number(row.rider_lng)]);
    }
  };

  // Initial load
  useEffect(() => {
    if (!orderId) return;

    const load = async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          delivery_address,
          destination_lat,
          destination_lng,
          delivery_schedule (
            delivery_status,
            rider_lat,
            rider_lng
          )
        `)
        .eq("order_id", orderId)
        .single();

      if (error || !data) {
        console.log("Track map load error:", error?.message);
        return;
      }

      applySchedule(data.delivery_schedule?.[0]);

      if (data.destination_lat && data.destination_lng) {
        setDestinationPosition([
          Number(data.destination_lat),
          Number(data.destination_lng),
        ]);
      } else if (data.delivery_address) {
        // Fallback: i-geocode ang address
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
              data.delivery_address
            )}&limit=1`
          );
          const geo = await res.json();
          if (geo?.length > 0) {
            setDestinationPosition([parseFloat(geo[0].lat), parseFloat(geo[0].lon)]);
          }
        } catch (e) {
          console.error("Geocode error:", e);
        }
      }
    };

    load();
  }, [orderId]);

  // Realtime: status + galaw ng rider
  useEffect(() => {
    if (!orderId) return;

    const channel = supabase
      .channel(`track-order-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "delivery_schedule",
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => applySchedule(payload.new)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  const label =
    status === "Delivered"
      ? "Tapos na"
      : status === "Out for Delivery"
      ? "Biyahe na"
      : "Hindi pa umaalis";

  return (
    <div>
      <p style={{ fontWeight: 600, margin: "0 0 8px" }}>{label}</p>
      <LeafletDeliveryMap
        center={destinationPosition || undefined}
        riderPosition={riderPosition}
        destinationPosition={destinationPosition}
        status={status}
      />
    </div>
  );
}
