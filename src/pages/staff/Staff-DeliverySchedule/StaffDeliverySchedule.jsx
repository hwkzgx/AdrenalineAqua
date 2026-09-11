import { useState, useEffect } from "react";
import "./staff-deliveryschedule.css";
import Table from "../../../components/Table";
import { supabase } from "../../../supabase";

import {
  Pencil,
  Trash2,
  X,
  CheckCircle,
  XCircle
} from "lucide-react";

function StaffDeliverySchedule() {

  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");


 // MODALS
  const [showView, setShowView] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  // SELECTED
  const [selectedOrder, setSelectedOrder] = useState(null);

  // EDIT DATA
  const [editData, setEditData] =
    useState({
      status: "",
      rider: "",
    });

    const [toast, setToast] = useState({
  message: "",
  type: "",
  show: false,
});

const showToast = (message, type = "success") => {
  setToast({
    message,
    type,
    show: true,
  });

  setTimeout(() => {
    setToast({
      message: "",
      type: "",
      show: false,
    });
  }, 2500);
};

  // FETCH
  useEffect(() => {

    fetchDeliveries();

  }, []);

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
      )
    `)
    .eq("order_type", "Delivery")
    .order("delivery_date", { ascending: true });

    if (error) {

      console.log(error.message);

      return;
    }

    const formatted = data.map((item) => ({
      id: item.id,

      deliveryId: item.delivery_schedule?.[0]?.delivery_code,
      scheduleOrderId: item.delivery_schedule?.[0]?.order_id,

      orderId: item.order_code,

      customer: item.full_name,

      address: item.delivery_address,

      date: item.delivery_date,

      status: item.delivery_schedule?.[0]?.delivery_status,
      rider: item.delivery_schedule?.[0]?.assigned_rider || "Not Assigned",
    }));

    setDeliveries(formatted);

    setLoading(false);
  };

  // HANDLE EDIT
  const handleEdit = (row) => {

    setSelectedOrder(row);

    setEditData({
    status: row.status || "Pending",
    rider: row.rider || "Not Assigned",
  });

    setShowEdit(true);
  };

  // SAVE CHANGES
  const handleSaveChanges = async () => {

    const { error } = await supabase
    .from("delivery_schedule")
    .update({
      delivery_status: editData.status,
      assigned_rider: editData.rider,
    })
    .eq("order_id", selectedOrder.scheduleOrderId); // IMPORTANT: usually id ng orders

   if (error) {
  console.log(error.message);
  showToast("Failed to update delivery.", "error");
} else {
  showToast("Delivery updated successfully!", "success");
  setShowEdit(false);
  fetchDeliveries();
}
  };

  // DELETE
  const confirmDelete = async () => {

    const { error } = await supabase
      .from("orders")
      .delete()
      .eq("id", selectedOrder.id);

    if (error) {
  console.log(error.message);
  showToast("Failed to delete delivery.", "error");
} else {
  showToast("Delivery deleted successfully!", "success");
  setShowDelete(false);
  fetchDeliveries();
}
  };

  // FILTER
  const filtered = deliveries.filter((d) => {

    const matchSearch =
      d.deliveryId
        ?.toLowerCase()
        .includes(search.toLowerCase()) ||

      d.orderId
        ?.toLowerCase()
        .includes(search.toLowerCase()) ||

      d.customer
        ?.toLowerCase()
        .includes(search.toLowerCase());

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
      label: " Delivery Address"
    },

    {
      key: "date",
      label: " Delivery Date"
    },

    {
      key: "delivery_status",

      label: "Status",

      render: (row) => (
        <span
          className={`delivery-status ${row.status?.toLowerCase()}`}
        >
          {row.status}
        </span>
      ),
    },

    {
      key: "rider",
      label: "Assigned Rider"
    },

    {
      key: "actions",

      label: "Actions",

      render: (row) => (

        <div className="staffdeliveryschedule-actions">

          <button
            className="staffedit"
            onClick={() =>
              handleEdit(row)
            }
          >
            <Pencil size={18} />
            <label>Edit</label>
          </button>

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
          onChange={(e) => {
            setSearch(e.target.value);
          }}
        />

        <select
          className="staffdeliveryschedule-filter"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
          }}
        >
          <option value="All">All Status</option>
          <option value="Pending">Pending</option>
          <option value="Out for Delivery">Out for Delivery</option>
          <option value="Delivered">Delivered</option>
        </select>

      </div>

      {/* TABLE */}
      <div className="staffdeliveryschedule-table-container">

        <Table
          columns={columns}
          data={loading ? [] : filtered}
          emptyMessage="No deliveries recorded yet."
        />
       </div>

         {/* EDIT MODAL */}
      {showEdit && (

        <div className="staffdelivery-modal-overlay">

          <div className="staffdelivery-edit-modal">

            <button
              className="staffdelivery-close-btn"
              onClick={() =>
                setShowEdit(false)
              }
            >
              <X size={20} />
            </button>

            <h2>Edit Delivery</h2>

            <div className="staffdelivery-form-group">

              <label>Assigned Rider</label>

              <select
                value={editData.rider}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    rider:
                      e.target.value,
                  })
                }
              >
                <option value="Select a rider">
                  Select a rider
                </option>

                <option value="Pedro">
                  Pedro
                </option>

                <option value="Juan">
                  Juan
                </option>

                <option value="Jose">
                  Jose
                </option>

              </select>
            </div>

              <div className="staffdelivery-form-group">
              <label>Status</label>

              <select
                value={editData.status}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    status:
                      e.target.value,
                  })
                }
              >
                <option value="Pending">
                  Pending
                </option>

                <option value="Out for Delivery">
                  Out for Delivery
                </option>

                <option value="Delivered">
                  Delivered
                </option>

              </select>
              

            </div>

            <div className="staffdelivery-modal-actions">

              <button
                className="cancel"
                onClick={() =>
                  setShowEdit(false)
                }
              >
                Cancel
              </button>

              <button
                className="save"
                onClick={handleSaveChanges}
              >
                Save
              </button>

            </div>

          </div>

        </div>
      )}

      {/* DELETE MODAL */}
      {showDelete && (

        <div className="staffdelivery-modal-overlay">

          <div className="staffdelivery-delete-modal">

            <button
              className="staffdeliverydelete-close-btn"
              onClick={() =>
                setShowDelete(false)
              }
            >
              <X size={20} />
            </button>

            <h2>Delete Delivery</h2>

            <h6>
              Are you sure you want to delete this delivery?
            </h6>

            <div className="staffdelivery-warning-box">

              <h3>⚠ Warning:</h3>

              <h6>
                This will permanently delete the delivery record
                and all related data. This action cannot
                be undone.
              </h6>

              <hr />

              <div className="staffdelivery-delete-info">

                <p>
                <b>Delivery ID:</b>{" "}
                  {selectedOrder?.deliveryId}
                </p>

                <p>
                  <b>Order ID:</b>{" "}
                  {selectedOrder?.orderId}
                </p>

                <p>
                  <b>Customer Name:</b>{" "}
                  {selectedOrder?.customer}
                </p>

                <p>
                  <b>Delivery Date:</b>{" "}
                  {selectedOrder?.date}
                </p>

                <p>
                  <b>Delivery Address:</b>{" "}
                  {selectedOrder?.address}
                </p>

                <p>
                  <b>Status:</b>{" "}
                  {selectedOrder?.status}
                </p>
 
                <p>             
                  <b>Assigned Rider:</b>{" "}
                    {selectedOrder?.rider}
                </p>
              </div>

            </div>

            <div className="staffdelivery-modal-actions">

              <button
                className="cancel"
                onClick={() =>
                  setShowDelete(false)
                }
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