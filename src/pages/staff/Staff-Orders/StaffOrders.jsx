import { useState, useEffect } from "react";
import "./staff-orders.css";
import Table from "../../../components/Table";
import { supabase } from "../../../supabase";

import {
  Eye,
  Pencil,
  Trash2,
  X,
  CheckCircle,
  XCircle
} from "lucide-react";

function StaffOrders() {

  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [typeFilter, setTypeFilter] = useState("All");

  // MODALS
  const [showView, setShowView] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  // ADD DATA
  const [addData, setAddData] = useState({
  water_type: "",
  size_variant: "",
  quantity: 1,
  order_type: "Delivery",
  full_name: "",
  contact_number: "",
  delivery_date: "",
  delivery_address: "",
  payment_method: "",
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

// SAMPLE PRICING
const priceMap = {
  Purified: {
    "Faucet Gallon": 60,
    "Round Gallon": 55,
    "350ml": 15,
  },
};

const unitPrice =
  priceMap?.[addData.water_type]?.[addData.size_variant] || 0;

const totalAmount =
  unitPrice * Number(addData.quantity || 0);

  const generateOrderCode = async () => {

  const year = new Date().getFullYear();

  const { data } = await supabase
    .from("orders")
    .select("order_code")
    .like("order_code", `ORD${year}%`)
    .order("order_code", { ascending: false })
    .limit(1);

  let nextNumber = 1;

  if (data?.length > 0) {

    const lastCode = data[0].order_code;

    const numberPart =
      lastCode.replace(`ORD${year}`, "");

    nextNumber = Number(numberPart) + 1;
  }

  return `ORD${year}${String(nextNumber).padStart(3, "0")}`;
};

  // EDIT DATA
  const [editData, setEditData] = useState({
    order_code: "",
    order_type: "",
    full_name: "",
    delivery_date: "",
    quantity: "",
    payment_method: "",
    status: "",
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {

  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      order_items (
        item_name,
        quantity
      )
    `)
    .order("delivery_date");

  if (error) {
    console.log(error.message);
    return;
  }

  const merged = (data || []).map((order) => ({
    id: order.id,
    order_code: order.order_code,
    order_type: order.order_type,
    full_name: order.full_name,
    delivery_date: order.delivery_date,
    payment_method: order.payment_method,
    status: order.status,

    quantity: order.order_items
      ? order.order_items.reduce((sum, i) => sum + Number(i.quantity || 0), 0)
      : 0,

    item_name: order.order_items
      ? order.order_items.map(i => i.item_name).join(", ")
      : "No items",
  }));

  setOrders(merged);
};

const handleAddOrder = async () => {

  if (
  !addData.water_type ||
  !addData.order_type ||
  !addData.size_variant ||
  !addData.full_name ||
  !addData.contact_number ||
  !addData.delivery_date ||
  !addData.delivery_address
) {
  showToast("Complete all fields.", "error");
  return;
}

if (Number(addData.quantity) <= 0) {
  showToast("Quantity must be greater than 0.", "error");
  return;
}

  const orderCode = await generateOrderCode();

  // INSERT ORDER
  const { data: orderData, error: orderError } =
    await supabase
      .from("orders")
      .insert([
        {
          order_code: orderCode,
          order_date: new Date().toISOString(),
          order_type: addData.order_type,
          full_name: addData.full_name,
          contact_number: addData.contact_number,
          delivery_date: addData.delivery_date,
          delivery_address: addData.delivery_address,
          payment_method: addData.payment_method,
          status: "Pending",
          total_amount: totalAmount,
        },
      ])
      .select()
      .single();

  if (orderError) {
    console.log(orderError.message);
   showToast(itemError.message, "error");
    return;
  }

  // INSERT ORDER ITEMS
  const { error: itemError } = await supabase
    .from("order_items")
    .insert([
      {
        order_id: orderData.order_id,
        item_name:
          `${addData.water_type} ${addData.size_variant}`,
        water_type: addData.water_type,
        size_variant: addData.size_variant,
        quantity: addData.quantity,
        unit_price: unitPrice,
      },
    ]);

  if (itemError) {
    console.log(itemError.message);
    showToast(itemError.message, "error");
    return;
  }

  showToast("Order added successfully!", "success");

  setShowAdd(false);

  fetchOrders();
};

  // VIEW
  const handleView = (row) => {

    setSelectedOrder(row);
    setShowView(true);
  };

  // EDIT
  const handleEdit = (row) => {

    setSelectedOrder(row);

    setEditData({
      order_code: row.order_code || "",
      order_type: row.order_type || "Delivery",
      full_name: row.full_name || "",
      delivery_date: row.delivery_date || "",
      quantity: row.quantity || "",
      payment_method: row.payment_method || "",
      status: row.status || "Pending",
    });

    setShowEdit(true);
  };

  // SAVE EDIT
  const handleSaveChanges = async () => {
    
  const { error } = await supabase
    .from("orders")
    .update({
      order_type: editData.order_type,
      full_name: editData.full_name,
      delivery_date: editData.delivery_date,
      status: editData.status,
      payment_method: editData.payment_method,
    })
    .eq("order_code", selectedOrder.order_code)

 if (error) {
  console.log(error.message);
  showToast("Failed to update order.", "error");
} else {
  showToast("Order updated successfully!", "success");
  setShowEdit(false);
  fetchOrders();
}
};


  // DELETE
  const handleDelete = (row) => {

    setSelectedOrder(row);
    setShowDelete(true);
  };

const confirmDelete = async () => {
  const { error } = await supabase
    .from("orders")
    .delete()
    .eq("order_code", selectedOrder.order_code)

  if (error) {
  console.log(error.message);
  showToast("Failed to delete order.", "error");
} else {
  showToast("Order deleted successfully!", "success");
  setShowDelete(false);
  fetchOrders();
}
};

  // FILTER
  const filteredOrders = orders.filter((order) => {

    const matchesSearch =
      order.order_code?.toLowerCase().includes(search.toLowerCase()) ||
      order.full_name?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "All" ||
      order.status === statusFilter;

    const matchesType =
      typeFilter === "All" ||
      order.order_type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  // TABLE
  const columns = [
    { key: "order_code", label: "Order ID" },

    {
      key: "item_name",
      label: "Item Name",
      render: (row) => (
        <span>{row.item_name}</span>
      ),
    },

    { key: "full_name", label: "Customer" },

    { key: "delivery_date", label: "Delivery Date" },

    {
      key: "quantity",
      label: "Qty",
      render: (row) => row.quantity,
    },

    { key: "payment_method", label: "Payment Method" },

    {
      key: "status",
      label: "Status",

      render: (row) => (
        <span
          className={`StfOrd-status ${row.status?.toLowerCase()}`}
        >
          {row.status}
        </span>
      ),
    },

    {
      key: "actions",
      label: "Actions",

      render: (row) => (

        <div className="StfOrd-actions">

          <button
            className="StfOrd-iconBtn view"
            onClick={() => handleView(row)}
          >
            <Eye size={18} />
          </button>

          <button
            className="StfOrd-iconBtn edit"
            onClick={() => handleEdit(row)}
          >
            <Pencil size={18} />
          </button>

          <button
            className="StfOrd-iconBtn delete"
            onClick={() => handleDelete(row)}
          >
            <Trash2 size={18} />
          </button>

        </div>
      ),
    },
  ];

  return (

    <div className="StfOrd-page">

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

      <div className="StfOrd-header">

        <div>
          <h1>Orders</h1>
          <p>Manage and track customer transactions</p>
        </div>

      </div>

      <div className="StfOrd-controls">

        <input
          className="StfOrd-search"
          placeholder="Search orders..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
          }}
        />

        <select
          className="Ord-filter"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="All">All Orders</option>
          <option value="Delivery">Delivery</option>
          <option value="Pickup">Pickup</option>
        </select>

        <select
          className="StfOrd-filter"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
          }}
        >
          <option value="All">All Status</option>
          <option value="Pending">Pending</option>
          <option value="Processing">Processing</option>
          <option value="Delivered">Delivered</option>
        </select>

            <button
              className="StfOrd-addBtn"
              onClick={() => setShowAdd(true)}
            >
              + Add Order
            </button>

      </div>

      <div className="table-container">

        <Table
          columns={columns}
          data={filteredOrders}
          emptyMessage="No orders recorded yet."
        />

      </div>

      {/* VIEW MODAL */}
      {showView && (

        <div className="StfOrd-modal-overlay">

          <div className="StfOrd-view-modal">

            <button
              className="StfOrd-close-btn"
              onClick={() => setShowView(false)}
            >
              <X size={20} />
            </button>

            <h2>View Order</h2>

            <div className="StfOrd-view-info">

              <div>
                <label>Order ID</label>
                <p>{selectedOrder?.order_code}</p>
              </div>

              <div>
                <label>Customer</label>
                <p>{selectedOrder?.full_name}</p>
              </div>

              <div>
                <label>Date</label>
                <p>{selectedOrder?.delivery_date}</p>
              </div>

              <div>
                <label>Quantity</label>
                <p>{selectedOrder?.quantity}</p>
              </div>

                <div>
                  <label>Payment Method</label>
                  <p>{selectedOrder?.payment_method}</p>
                </div>

              <div className="StfOrd-form-group">
                <label>Status</label>

                <span className={`StfOrd-status ${selectedOrder?.status?.toLowerCase()}`}>
                {selectedOrder?.status}
              </span>

              </div>

            </div>

            <div className="StfOrd-modal-actions">

              <button
                className="StfOrd-closeAction"
                onClick={() => setShowView(false)}
              >
                Close
              </button>

            </div>

          </div>

        </div>
      )}

      {/* EDIT MODAL */}
      {showEdit && (

        <div className="StfOrd-modal-overlay">

          <div className="StfOrd-edit-modal">

            <button
              className="StfOrd-close-btn"
              onClick={() => setShowEdit(false)}
            >
              <X size={20} />
            </button>

            <h2>Edit Order</h2>

            <div className="StfOrd-form-group">

              <label>Order ID</label>

              <input
                value={editData.order_code}
                disabled
              />

            </div>

            <div className="StfOrd-form-group">

              <label>Customer</label>

              <input
                value={editData.full_name}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    full_name: e.target.value,
                  })
                }
              />

            </div>

            <div className="Ord-form-group">
              <label>Order Type</label>

              <select
                value={editData.order_type}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    order_type: e.target.value,
                  })
                }
              >
                <option value="Delivery">Delivery</option>
                <option value="Pickup">Pickup</option>
              </select>
            </div>

            {editData.order_type === "Delivery" && (
              <>
                <div className="Ord-form-group">
                  <label>Date</label>

                  <input
                    type="date"
                    value={editData.delivery_date}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        delivery_date: e.target.value,
                      })
                    }
                  />
                </div>
              </>
            )}

            <div className="StfOrd-form-group">

              <label>Quantity</label>

              <input
                value={editData.quantity}
                disabled
              />

            </div>

              <div className="StfOrd-form-group">
              <label>Payment Method</label>

              <select
                value={editData.payment_method}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    payment_method: e.target.value,
                  })
                }
              >
                <option value="COD">COD</option>
                <option value="GCash">GCash</option>
                <option value="Card">Card</option>
              </select>
            </div>

            <div className="StfOrd-form-group">
              <label>Status</label>

              <select
                value={editData.status}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    status: e.target.value,
                  })
                }
              >
                <option value="Pending">Pending</option>
                <option value="Processing">Processing</option>
                <option value="Delivered">Delivered</option>
              </select>
            </div>

            <div className="StfOrd-modal-actions">

              <button
                className="StfOrd-closeAction"
                onClick={() => setShowEdit(false)}
              >
                Cancel
              </button>

              <button
                className="StfOrd-save-btn"
                onClick={handleSaveChanges}
              >
                Save Changes
              </button>

            </div>

          </div>

        </div>
      )}

      {/* DELETE MODAL */}
      {showDelete && (

        <div className="StfOrd-modal-overlay">

          <div className="StfOrd-delete-modal">

            <button
              className="StfOrddelete-close-btn"
              onClick={() => setShowDelete(false)}
            >
              <X size={20} />
            </button>

            <h1>Delete Order</h1>

            <h6>
              Are you sure you want to delete this order?
            </h6>

            <div className="StfOrd-warning-box">

              <h3>⚠ Warning:</h3>

              <p>
                This will permanently delete the order record
                and all related data. This action cannot
                be undone.
              </p>

              <hr />

              <div className="StfOrd-delete-info">

                <p>
                  <b>Order ID:</b>{" "}
                  {selectedOrder?.order_code}
                </p>

                <p>
                  <b>Customer:</b>{" "}
                  {selectedOrder?.full_name}
                </p>

                <p>
                  <b>Date:</b>{" "}
                  {selectedOrder?.delivery_date}
                </p>

                <p>
                  <b>Quantity:</b>{" "}
                  {selectedOrder?.quantity}
                </p>

                <p>
                  <b>Payment Method:</b>{" "}
                  {selectedOrder?.payment_method}
                </p>

                <p>
                  <b>Status:</b>{" "}
                  {selectedOrder?.status}
                </p>

              </div>

            </div>

            <div className="StfOrd-delete-actions">

              <button
                className="StfOrd-cancel-btn"
                onClick={() => setShowDelete(false)}
              >
                No, Cancel
              </button>

              <button
                className="StfOrd-confirm-delete"
                onClick={confirmDelete}
              >
                Delete Order
              </button>

            </div>

          </div>

        </div>
      )}

                  {showAdd && (

            <div className="StfOrd-modal-overlay">

              <div className="StfOrd-add-modal">

                <button
                  className="StfOrdAdd-close-btn"
                  onClick={() => setShowAdd(false)}
                >
                  <X size={20} />
                </button>

                <h2>Add Order</h2>

                <div className="StfOrd-form-group">
                  <label>Water Type</label>

                  <select
                    value={addData.water_type}
                    onChange={(e) =>
                      setAddData({
                        ...addData,
                        water_type: e.target.value,
                      })
                    }
                  >
                    <option value="">Select</option>
                    <option value="Purified">Purified</option>        
                  </select>
                </div>

                <div className="StfOrd-form-group">
                  <label>Size / Variant</label>

                  <select
                    value={addData.size_variant}
                    onChange={(e) =>
                      setAddData({
                        ...addData,
                        size_variant: e.target.value,
                      })
                    }
                  >
                    <option value="">Select</option>
                    <option value="Faucet Gallon">
                      Faucet Gallon
                    </option>
                    <option value="Round Gallon">
                      Round Gallon
                    </option>
                    <option value="350ml">
                      350ml
                    </option>
                  </select>
                </div>

                <div className="StfOrd-form-group">
                  <label>Quantity</label>

                  <input
                    type="number"
                    value={addData.quantity}
                    onChange={(e) =>
                      setAddData({
                        ...addData,
                        quantity: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="Ord-form-group">
                  <label>Order Type</label>

                  <select
                    value={addData.order_type}
                    onChange={(e) =>
                      setAddData({
                        ...addData,
                        order_type: e.target.value,
                      })
                    }
                  >
                    <option value="Delivery">Delivery</option>
                    <option value="Pickup">Pickup</option>
                  </select>
                </div>

                <div className="StfOrd-form-group">
                  <label>Customer Name</label>

                  <input
                    value={addData.full_name}
                    onChange={(e) =>
                      setAddData({
                        ...addData,
                        full_name: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="StfOrd-form-group">
                  <label>Contact Number</label>

                  <input
                    value={addData.contact_number}
                    onChange={(e) =>
                      setAddData({
                        ...addData,
                        contact_number: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="StfOrd-form-group">
                  <label>Delivery Date</label>

                  <input
                    type="date"
                    value={addData.delivery_date}
                    onChange={(e) =>
                      setAddData({
                        ...addData,
                        delivery_date: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="StfOrd-form-group">
                  <label>Delivery Address</label>

                  <input
                    value={addData.delivery_address}
                    onChange={(e) =>
                      setAddData({
                        ...addData,
                        delivery_address: e.target.value,
                      })
                    }
                  />
                </div>

                    <div className="StfOrd-form-group">
                  <label>Payment Method</label>

                  <select
                    value={addData.payment_method}
                    onChange={(e) =>
                      setAddData({
                        ...addData,
                        payment_method: e.target.value,
                      })
                    }
                  >
                    <option value="">Select payment method</option>
                    <option value="COD">Cash on Delivery</option>
                    <option value="GCash">GCash</option>
                    <option value="Card">Card</option>
                  </select>
                </div>

                <div className="StfOrd-form-group">
                  <label>Total Amount</label>

                  <input
                    value={`₱${totalAmount}`}
                    disabled
                  />
                </div>

                <div className="StfOrd-modal-actions">

                  <button
                    className="StfOrd-closeAction"
                    onClick={() => setShowAdd(false)}
                  >
                    Cancel
                  </button>

                  <button
                    className="StfOrd-save-btn"
                    onClick={handleAddOrder}
                  >
                    Add Order
                  </button>

                </div>

              </div>

            </div>
            )}
    </div>
  );
}

export default StaffOrders;