import { useState, useEffect, useRef } from "react";
import "./delivery.css";
import Table from "../../../components/Table";
import { supabase } from "../../../supabase";
import { exportToPDF } from "../../../pdfExporter";
import {
  Trash2,
  X,
  CheckCircle, 
  XCircle,
  Download
} from "lucide-react";

function Delivery() {
  const reportRef = useRef();

  const [deliveries, setDeliveries] = useState([]);
  const [riders, setRiders] = useState([]); 
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // MODALS
  const [showDelete, setShowDelete] = useState(false);

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
    .select("users_id, name")
    .eq("role", "rider");

  if (error) {
    console.log("Error fetching riders:", error.message);
  } else {
    setRiders(data || []);
  }
};


  const fetchDeliveries = async () => {
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
          assigned_rider_id
        ),
        order_items (
          item_name,
          quantity,
          unit_price
        )
      `)
      .eq("order_type", "Delivery")
      .order("delivery_date", { ascending: true });

    if (error) {
      console.log(error.message);
      setLoading(false);
      return;
    }

    const formatted = data.map((item) => ({
      id: item.order_id,
      deliveryId: item.delivery_schedule?.[0]?.delivery_code,
      scheduleOrderId: item.delivery_schedule?.[0]?.order_id,
      orderId: item.order_code,
      customer: item.full_name,
      address: item.delivery_address,
      date: item.delivery_date,
      status: !item.delivery_schedule?.[0]?.assigned_rider ? "—" : (item.delivery_schedule?.[0]?.delivery_status || "Pending"),
      rider: item.delivery_schedule?.[0]?.assigned_rider || "",
      assignedRiderId: item.delivery_schedule?.[0]?.assigned_rider_id || "",
      orderItems: item.order_items || [],
    }));

    setDeliveries(formatted);
    setLoading(false);
  };

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

  // DIRECT UPDATE NG RIDER
 
const handleAssignRider = async (row, newRiderId) => {
  const selectedRider = riders.find(
    (r) => String(r.users_id) === String(newRiderId)
  );

  const { error } = await supabase
    .from("delivery_schedule")
    .update({
      assigned_rider: selectedRider?.name || null,
      assigned_rider_id: selectedRider?.users_id || null,
      delivery_status: selectedRider ? "Pending" : null,
    })
    .eq("order_id", row.scheduleOrderId);

  if (error) {
    console.error("Error assigning rider:", error.message);
    showToast("Failed to assign rider", "error");
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

  // FILTER
  const filtered = deliveries.filter((d) => {
    const matchSearch =
      d.deliveryId?.toLowerCase().includes(search.toLowerCase()) ||
      d.orderId?.toLowerCase().includes(search.toLowerCase()) ||
      d.customer?.toLowerCase().includes(search.toLowerCase());

    const matchStatus =
      statusFilter === "All" ||
      d.status === statusFilter;

    return matchSearch && matchStatus;
  });

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
    const assignedRiderId = row.assignedRiderId || "";

    return (
      <select
        className="table-rider-dropdown"
        value={assignedRiderId}
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
        <div className="delivery-actions">
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