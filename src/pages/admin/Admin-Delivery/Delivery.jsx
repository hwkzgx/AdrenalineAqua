import { useState, useEffect, useRef } from "react";
import "./delivery.css";
import Table from "../../../components/Table";
import { supabase } from "../../../supabase";
import { exportToPDF } from "../../../pdfExporter";
import {
  Eye,
  Trash2,
  X,
  CheckCircle, 
  XCircle,
  Download
} from "lucide-react";

// ==========================================
// PAYMENT (Paid / Unpaid) + PROOF OF DELIVERY (View modal)
// COD = Unpaid hangga't hindi pa Delivered; GCash/Cash = galing sa orders.payment_status
// ==========================================
const getPaymentStatus = (method, rawStatus, deliveryStatus) => {
  const m = String(method || "").toLowerCase();
  if (m === "cod") return deliveryStatus === "Delivered" ? "Paid" : "Unpaid";

  const r = String(rawStatus || "").toLowerCase();
  if (r === "paid" || r === "verified") return "Paid";
  if (r === "rejected") return "Rejected";
  return m === "gcash" ? "Pending" : "Unpaid";
};

const PaymentTag = ({ status }) => {
  const colors =
    status === "Paid"
      ? { bg: "#dcfce7", fg: "#15803d" }
      : status === "Pending"
      ? { bg: "#fef9c3", fg: "#a16207" }
      : { bg: "#fee2e2", fg: "#b91c1c" };

  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: 700,
        background: colors.bg,
        color: colors.fg,
      }}
    >
      {status}
    </span>
  );
};

const downloadImage = async (url, name) => {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const ext = (blob.type.split("/")[1] || "jpg").split("+")[0];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${name}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  } catch (err) {
    window.open(url, "_blank", "noopener,noreferrer");
  }
};

// ==========================================
// AUTOMATIC SORTING
// Pending / walang rider ("—") -> Out for Delivery -> Delivered -> Cancelled
// Sa loob ng bawat grupo, pinakabago ang nasa itaas.
// ==========================================
const statusRank = (status) => {
  if (status === "Pending" || status === "—") return 0;
  if (status === "Out for Delivery") return 1;
  if (status === "Delivered") return 2;
  if (status === "Cancelled") return 3;
  return 4;
};

const sortDeliveries = (list) =>
  [...list].sort((a, b) => {
    const rank = statusRank(a.status) - statusRank(b.status);
    if (rank !== 0) return rank;

    const timeA = new Date(a.orderDate || 0).getTime();
    const timeB = new Date(b.orderDate || 0).getTime();
    if (timeB !== timeA) return timeB - timeA;

    return Number(b.id || 0) - Number(a.id || 0);
  });

function Delivery() {
  const reportRef = useRef();

  const [deliveries, setDeliveries] = useState([]);
  const [riders, setRiders] = useState([]); 
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // MODALS
  const [showDelete, setShowDelete] = useState(false);
  const [showView, setShowView] = useState(false);

  // SELECTED
  const [selectedOrder, setSelectedOrder] = useState(null);

  // FETCH DELIVERIES AT RIDERS
  useEffect(() => {
    fetchDeliveries();
    fetchRiders();
  }, []);

  
const fetchRiders = async () => {
  const { data, error } = await supabase
    .from("users")
    .select("users_id, name, is_archived")
    .eq("role", "rider");

  if (error) {
    console.log("Error fetching riders:", error.message);
  } else {
    setRiders((data || []).filter((r) => !r.is_archived));
  }
};


  const fetchDeliveries = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        order_id,
        order_code,
        order_date,
        payment_method,
        payment_status,
        total_amount,
        full_name,
        delivery_address,
        delivery_date,
        delivery_schedule (
          order_id,
          delivery_code,
          delivery_status,
          assigned_rider,
          assigned_rider_id,
          proof_of_delivery
        ),
        order_items (
          item_name,
          quantity,
          unit_price
        )
      `)
      .eq("order_type", "Delivery");

    if (error) {
      console.log(error.message);
      setLoading(false);
      return;
    }

    const formatted = data.map((item) => ({
      id: item.order_id,
      orderDate: item.order_date,
      deliveryId: item.delivery_schedule?.[0]?.delivery_code,
      scheduleOrderId: item.delivery_schedule?.[0]?.order_id,
      orderId: item.order_code,
      customer: item.full_name,
      address: item.delivery_address,
      date: item.delivery_date,
      status:
        item.delivery_schedule?.[0]?.delivery_status === "Cancelled"
          ? "Cancelled"
          : !item.delivery_schedule?.[0]?.assigned_rider
          ? "—"
          : item.delivery_schedule?.[0]?.delivery_status || "Pending",
      rider: item.delivery_schedule?.[0]?.assigned_rider || "",
      assignedRiderId: item.delivery_schedule?.[0]?.assigned_rider_id || "",
      orderItems: item.order_items || [],
      paymentMethod: item.payment_method,
      paymentStatus: item.payment_status,
      totalAmount: item.total_amount,
      proofUrl: item.delivery_schedule?.[0]?.proof_of_delivery || "",
    }));

    setDeliveries(formatted);
    setLoading(false);
  };

  // SYNC: refresh the table whenever anyone (staff, rider, another admin)
  // changes a delivery_schedule row, so every account sees the same data
  // without a manual refresh. Requires Realtime enabled on delivery_schedule.
  useEffect(() => {
    const channel = supabase
      .channel("admin-delivery-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "delivery_schedule" },
        () => fetchDeliveries()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const [toast, setToast] = useState({
    message: "",
    type: "",
    show: false,
  });

  const showToast = (message, type = "success") => {
    setToast({ message, type, show: true });

    setTimeout(() => {
      setToast({ message: "", type: "", show: false });
    }, 2500);
  };

  // ASSIGN RIDER
  // delivery_schedule.order_id is the same value as orders.order_id, so we use
  // row.id. (row.scheduleOrderId is undefined when the order has no
  // delivery_schedule row yet, and the update then silently matches 0 rows
  // while the toast still says "assigned".)
  // Both assigned_rider (name) and assigned_rider_id are saved: the id is what
  // the admin dropdown, the rider page and the customer chat rely on.
  const handleAssignRider = async (row, newRiderId) => {
    const selectedRider = riders.find(
      (r) => String(r.users_id) === String(newRiderId)
    );

    // Never push an order that is already on the way / completed back to Pending
    const isLocked =
      ["Out for Delivery", "Delivered", "Cancelled"].includes(row.status);

    const payload = {
      assigned_rider: selectedRider?.name || null,
      assigned_rider_id: selectedRider?.users_id || null,
      delivery_status: isLocked
        ? row.status
        : selectedRider
        ? "Pending"
        : null,
    };

    // 1. Update the existing schedule row
    const { data: updated, error: updateError } = await supabase
      .from("delivery_schedule")
      .update(payload)
      .eq("order_id", row.id)
      .select();

    let saveError = updateError;

    // 2. No schedule row yet for this order: create it (only when assigning)
    if (
      !saveError &&
      selectedRider &&
      (!updated || updated.length === 0)
    ) {
      const { error: insertError } = await supabase
        .from("delivery_schedule")
        .insert([
          {
            order_id: row.id,
            delivery_code:
              row.orderId?.replace(/^ORD/, "DEL") || `DEL-${row.id}`,
            ...payload,
          },
        ]);

      saveError = insertError;
    }

    if (saveError) {
      console.error("Error assigning rider:", saveError.message);
      showToast("Failed to assign rider: " + saveError.message, "error");
    } else {
      showToast(
        selectedRider
          ? `Rider ${selectedRider.name} assigned successfully!`
          : "Rider unassigned successfully!",
        "success"
      );

      await fetchDeliveries();
    }
  };

  // DELETE
  const confirmDelete = async () => {
    const { error } = await supabase
      .from("orders")
      .delete()
      .eq("order_id", selectedOrder.id);

    if (error) {
      console.log(error.message);
    } else {
      setShowDelete(false);
      fetchDeliveries();
      showToast("Delivery deleted successfully!", "success");
    }
  };

  // FILTER + AUTOMATIC SORTING
  const filtered = sortDeliveries(
    deliveries.filter((d) => {
      const matchSearch =
        d.deliveryId?.toLowerCase().includes(search.toLowerCase()) ||
        d.orderId?.toLowerCase().includes(search.toLowerCase()) ||
        d.customer?.toLowerCase().includes(search.toLowerCase());

      // "Pending" ay kasama rin ang mga wala pang rider ("—")
      const matchStatus =
        statusFilter === "All" ||
        d.status === statusFilter ||
        (statusFilter === "Pending" && d.status === "—");

      return matchSearch && matchStatus;
    })
  );

  // TABLE COLUMNS
  const columns = [
    {
      key: "deliveryId",
      label: "Delivery ID"
    },
    {
      key: "orderId",
      label: "Order ID"
    },
    {
      key: "customer",
      label: "Customer Name"
    },
    {
      key: "address",
      label: "Delivery Address"
    },
    {
      key: "date",
      label: "Delivery Date"
    },
    {
      key: "orderItems",
      label: "Order Items",
      render: (row) => (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {row.orderItems && row.orderItems.length > 0 ? (
            row.orderItems.map((prod, index) => (
              <div key={index} style={{ fontSize: "13px" }}>
                <b>{prod.item_name}</b> (Qty: {prod.quantity}) — ₱{prod.unit_price}
              </div>
            ))
          ) : (
            <span style={{ color: "#888" }}>No items</span>
          )}
        </div>
      ),
    },
    {
      key: "delivery_status",
      label: "Status",
      render: (row) => (
        <span className={`delivery-status ${row.status?.toLowerCase().replace(/\s+/g, '-')}`}>
          {row.status}
        </span>
      ),
    },
    {
  key: "rider",
  label: "Assigned Rider",
  render: (row) => {
    // Fallback for older rows that only saved the rider name (no id),
    // e.g. assigned from the staff page before it saved assigned_rider_id.
    const assignedRiderId =
      row.assignedRiderId ||
      riders.find((r) => r.name === row.rider)?.users_id ||
      "";

    return (
      <select
        className="table-rider-dropdown"
        value={assignedRiderId}
        // Rider can no longer be changed once the delivery is on the way or done
        disabled={
          ["Out for Delivery", "Delivered", "Cancelled"].includes(row.status)
        }
        onChange={(e) => handleAssignRider(row, e.target.value)}
      >
        <option value="">Not Assigned</option>
        {riders.map((r) => (
          <option key={r.users_id} value={r.users_id}>
            {r.name}
          </option>
        ))}
      </select>
    );
  },
},


    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div
          className="delivery-actions"
          style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}
        >
          <button
            className="view"
            title="View details / proof of delivery"
            onClick={() => {
              setSelectedOrder(row);
              setShowView(true);
            }}
          >
            <Eye size={18} />
            <label>View</label>
          </button>

          <button
            className="delete"
            onClick={() => {
              setSelectedOrder(row);
              setShowDelete(true);
            }}
          >
            <Trash2 size={18} />
            <label>Delete</label>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="delivery-page">
      
      {toast.show && (
        <div className={`toast ${toast.type} show`}>
          <div className="toast-icon">
            {toast.type === "success" ? (
              <CheckCircle size={18} />
            ) : (
              <XCircle size={18} />
            )}
          </div>
          <div className="toast-text">
            {toast.message}
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="delivery-header">
        <div>
          <h1>Delivery</h1>
          <p>Manage delivery tracking and status</p>
        </div>
      </div>

      {/* CONTROLS */}
      <div className="delivery-controls">
        <input
          type="text"
          className="delivery-search"
          placeholder="Search delivery / order / customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="delivery-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="All">All Status</option>
          <option value="Pending">Pending</option>
          <option value="Out for Delivery">Out for Delivery</option>
          <option value="Delivered">Delivered</option>
          <option value="Cancelled">Cancelled</option>
        </select>

        <button 
          onClick={() => {
            // Kunin ang user data mula sa localStorage (palitan ang mga key kung iba ang ginamit niyo sa pag-login)
            const savedUser = JSON.parse(localStorage.getItem("user")) || {};
            
            const userPosition = savedUser.position || savedUser.role || "Admin";
            const userName = savedUser.name || savedUser.fullName || "System User";
            
            const generatedByFull = `${userPosition} - ${userName}`;

            exportToPDF(filtered, "delivery-report.pdf", generatedByFull);
          }}
          className="export-pdf-btn"
        >
          <Download size={18} /> Export PDF
        </button>
      </div>

      {/* TABLE */}
      <div ref={reportRef} className="delivery-table-container">
        <Table
          columns={columns}
          data={loading ? [] : filtered}
          emptyMessage="No deliveries recorded yet."
        />
      </div>

      {/* VIEW MODAL (kasama ang proof of delivery) */}
      {showView && selectedOrder && (
        <div
          onClick={() => setShowView(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2000,
            background: "rgba(15, 23, 42, 0.55)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "540px",
              maxHeight: "92vh",
              overflowY: "auto",
              background: "#fff",
              borderRadius: "22px",
              padding: "28px 26px 22px",
              boxShadow: "0 25px 60px rgba(15, 23, 42, 0.3)",
            }}
          >
            <button
              onClick={() => setShowView(false)}
              aria-label="Close"
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                border: "none",
                background: "#eef2f7",
                color: "#475569",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={18} />
            </button>

            <h2 style={{ margin: 0, textAlign: "center", fontSize: "26px", fontWeight: 800, color: "#0f172a" }}>
              Delivery Details
            </h2>
            <p style={{ margin: "6px 0 18px", textAlign: "center", fontSize: "14px", color: "#64748b" }}>
              Review this delivery, its payment and proof of delivery.
            </p>

            {/* DETAILS BOX */}
            <div
              style={{
                border: "1px solid #dbe3ee",
                borderRadius: "14px",
                background: "#f8fafc",
                padding: "4px 18px",
              }}
            >
              {[
                ["Delivery ID", selectedOrder.deliveryId || "—"],
                ["Order ID", selectedOrder.orderId],
                ["Customer", selectedOrder.customer],
                ["Delivery Date", selectedOrder.date || "—"],
                ["Address", selectedOrder.address || "—"],
                [
                  "Status",
                  <span
                    key="status"
                    style={{
                      padding: "3px 12px",
                      borderRadius: "999px",
                      fontSize: "13px",
                      fontWeight: 600,
                      background:
                        selectedOrder.status === "Delivered"
                          ? "#dcfce7"
                          : selectedOrder.status === "Out for Delivery"
                          ? "#dbeafe"
                          : selectedOrder.status === "Cancelled"
                          ? "#fee2e2"
                          : "#fff3e0",
                      color:
                        selectedOrder.status === "Delivered"
                          ? "#15803d"
                          : selectedOrder.status === "Out for Delivery"
                          ? "#1d4ed8"
                          : selectedOrder.status === "Cancelled"
                          ? "#b91c1c"
                          : "#c2410c",
                    }}
                  >
                    {selectedOrder.status}
                  </span>,
                ],
                ["Assigned Rider", selectedOrder.rider || "Not Assigned"],
                [
                  "Payment",
                  <span key="pay" style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 500 }}>
                      {String(selectedOrder.paymentMethod || "").toLowerCase() === "cod"
                        ? "Cash on Delivery"
                        : selectedOrder.paymentMethod || "—"}
                    </span>
                    <PaymentTag
                      status={getPaymentStatus(
                        selectedOrder.paymentMethod,
                        selectedOrder.paymentStatus,
                        selectedOrder.status
                      )}
                    />
                  </span>,
                ],
                ["Total", `₱${Number(selectedOrder.totalAmount || 0).toLocaleString()}`],
              ].map(([label, value], i, arr) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "16px",
                    padding: "13px 0",
                    borderBottom: i === arr.length - 1 ? "none" : "1px solid #e6ebf2",
                  }}
                >
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      color: "#64748b",
                      flexShrink: 0,
                    }}
                  >
                    {label}
                  </span>
                  <span style={{ fontSize: "15px", fontWeight: 600, color: "#0f172a", textAlign: "right" }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {/* PROOF OF DELIVERY */}
            <div style={{ marginTop: "18px" }}>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: "#64748b",
                  marginBottom: "8px",
                }}
              >
                Proof of Delivery
              </div>

              {selectedOrder.proofUrl ? (
                <>
                  <a href={selectedOrder.proofUrl} target="_blank" rel="noopener noreferrer">
                    <img
                      src={selectedOrder.proofUrl}
                      alt="Proof of delivery"
                      style={{
                        width: "100%",
                        maxHeight: "300px",
                        objectFit: "contain",
                        borderRadius: "14px",
                        border: "1px solid #dbe3ee",
                        background: "#f1f5f9",
                        display: "block",
                      }}
                    />
                  </a>
                  <button
                    onClick={() =>
                      downloadImage(
                        selectedOrder.proofUrl,
                        `${selectedOrder.orderId || "delivery"}-proof`
                      )
                    }
                    style={{
                      marginTop: "10px",
                      width: "100%",
                      padding: "11px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      background: "#fff",
                      color: "#334155",
                      fontWeight: 600,
                      cursor: "pointer",
                      fontSize: "14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    <Download size={16} /> Save photo
                  </button>
                </>
              ) : (
                <div
                  style={{
                    border: "1.5px dashed #cbd5e1",
                    borderRadius: "14px",
                    padding: "22px 16px",
                    textAlign: "center",
                    color: "#94a3b8",
                    fontSize: "14px",
                    background: "#fafbfd",
                  }}
                >
                  {selectedOrder.status === "Delivered"
                    ? "No proof of delivery was uploaded."
                    : "Not delivered yet."}
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
              <button
                onClick={() => setShowView(false)}
                style={{
                  padding: "11px 26px",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  background: "#f1f5f9",
                  color: "#475569",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: "15px",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {showDelete && (
        <div className="delivery-modal-overlay">
          <div className="delivery-delete-modal">
            <button
              className="deliverydelete-close-btn"
              onClick={() => setShowDelete(false)}
            >
              <X size={20} />
            </button>

            <h2>Delete Delivery</h2>
            <h6>Are you sure you want to delete this delivery?</h6>

            <div className="Ord-warning-box">
              <h3>⚠ Warning:</h3>
              <p>This will permanently delete the delivery record and all related data. This action cannot be undone.</p>
              <hr />
              <div className="Ord-delete-info">
                <p><b>Delivery ID:</b> {selectedOrder?.deliveryId}</p>
                <p><b>Order ID:</b> {selectedOrder?.orderId}</p>
                <p><b>Customer Name:</b> {selectedOrder?.customer}</p>
                <p><b>Delivery Date:</b> {selectedOrder?.date}</p>
                <p><b>Delivery Address:</b> {selectedOrder?.address}</p>
                <p><b>Status:</b> {selectedOrder?.status}</p>
                <p><b>Assigned Rider:</b> {selectedOrder?.rider || "Not Assigned"}</p>
              </div>
            </div>

            <div className="delivery-modal-actions">
              <button
                className="cancel"
                onClick={() => setShowDelete(false)}
              >
                Cancel
              </button>
              <button
                className="delete"
                onClick={confirmDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Delivery;
