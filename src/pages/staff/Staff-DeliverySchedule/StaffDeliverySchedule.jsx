import { useState, useEffect, useRef } from "react";
import "./staff-deliveryschedule.css";
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

function StaffDeliverySchedule() {
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
      .select("name")
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
          assigned_rider
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
  const handleAssignRider = async (row, newRider) => {
    const newStatus = "Pending"; 

    const { error } = await supabase
      .from("delivery_schedule")
      .update({
        assigned_rider: newRider || null,
        delivery_status: newStatus,
      })
      .eq("order_id", row.scheduleOrderId);

    if (error) {
      console.log(error.message);
      showToast("Failed to assign rider", "error");
    } else {
      showToast(`Rider assigned! Status is Pending`, "success");
      fetchDeliveries();
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
        <span className={`staffdeliveryschedule-status ${row.status?.toLowerCase().replace(/\s+/g, '-')}`}>
          {row.status}
        </span>
      ),
    },
    {
      key: "rider",
      label: "Assigned Rider",
      render: (row) => (
        <select
          className="table-rider-dropdown"
          value={row.rider}
          onChange={(e) => handleAssignRider(row, e.target.value)}
        >
          <option value="">Not Assigned</option>
          {riders.map((r, index) => (
            <option key={index} value={r.name}>
              {r.name}
            </option>
          ))}
        </select>
      )
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="staffdeliveryschedule-actions">
          <button
            className="staffdelete"
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
    <div className="staffdeliveryschedule-page">
      
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
      <div className="staffdeliveryschedule-header">
        <h1>Delivery</h1>
        <p>Manage delivery tracking and status</p>
      </div>

      {/* CONTROLS */}
      <div className="staffdeliveryschedule-controls">
        <input
          type="text"
          className="staffdeliveryschedule-search"
          placeholder="Search delivery / order / customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="staffdeliveryschedule-filter"
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
      <div ref={reportRef} className="staffdeliveryschedule-table-container">
        <Table
          columns={columns}
          data={loading ? [] : filtered}
          emptyMessage="No deliveries recorded yet."
        />
      </div>

      {/* DELETE MODAL */}
      {showDelete && (
        <div className="staffdelivery-modal-overlay">
          <div className="staffdelivery-delete-modal">
            <button
              className="staffdeliverydelete-close-btn"
              onClick={() => setShowDelete(false)}
            >
              <X size={20} />
            </button>

            <h2>Delete Delivery</h2>
            <h6>Are you sure you want to delete this delivery? This action cannot be undone.</h6>

            <div className="staffdelivery-delete-details">
              <div>
                <label>Delivery ID</label>
                <p>{selectedOrder?.deliveryId || "—"}</p>
              </div>
              <div>
                <label>Order ID</label>
                <p>{selectedOrder?.orderId}</p>
              </div>
              <div>
                <label>Customer</label>
                <p>{selectedOrder?.customer}</p>
              </div>
              <div>
                <label>Delivery Date</label>
                <p>{selectedOrder?.date}</p>
              </div>
              <div>
                <label>Address</label>
                <p>{selectedOrder?.address}</p>
              </div>
              <div>
                <label>Status</label>
                <span className={`staffdeliveryschedule-status ${selectedOrder?.status?.toLowerCase().replace(/\s+/g, '-')}`}>
                  {selectedOrder?.status}
                </span>
              </div>
              <div>
                <label>Assigned Rider</label>
                <p>{selectedOrder?.rider || "Not Assigned"}</p>
              </div>
            </div>

            <div className="staffdelivery-modal-actions">
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

export default StaffDeliverySchedule;
