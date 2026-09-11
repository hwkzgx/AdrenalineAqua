import { useState, useEffect } from "react";
import "./orders.css";
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

function Orders() {

  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [typeFilter, setTypeFilter] = useState("All");

  const [inventoryStock, setInventoryStock] = useState([]);

  // MODALS
  const [showView, setShowView] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  // ADD DATA
  const [addData, setAddData] = useState({
    water_type: "Purified",
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
    setToast({ message, type, show: true });

    setTimeout(() => {
      setToast({ message: "", type: "", show: false });
    }, 2500);
  };

  const selectedItemObj = inventoryStock.find(
    (inv) => inv.item_name === addData.size_variant
  );

  const unitPrice = selectedItemObj ? Number(selectedItemObj.price || 0) : 0;
  const totalAmount = unitPrice * Number(addData.quantity || 0);

  // Validation para sa 500ml minimum order pag Delivery
  const is500mlDeliveryInvalid =
    addData.order_type === "Delivery" &&
    addData.size_variant.toLowerCase().includes("500ml") &&
    Number(addData.quantity) < 12;

  const generateSalesCode = async () => {
    const year = new Date().getFullYear();
    const { data } = await supabase
      .from("sales")
      .select("sales_code")
      .like("sales_code", `SAL${year}%`)
      .order("sales_code", { ascending: false })
      .limit(1);

    let nextNumber = 1;
    if (data?.length > 0 && data[0].sales_code) {
      const lastCode = data[0].sales_code;
      const numberPart = lastCode.replace(`SAL${year}`, "");
      nextNumber = Number(numberPart) + 1;
    }
    return `SAL${year}${String(nextNumber).padStart(3, "0")}`;
  };

  const generateOrderCode = async () => {
    const year = new Date().getFullYear();
    const { data } = await supabase
      .from("orders")
      .select("order_code")
      .like("order_code", `ORD${year}%`)
      .order("order_code", { ascending: false })
      .limit(1);

    let next = 1;
    if (data?.length > 0) {
      const last = data[0].order_code;
      next = Number(last.replace(`ORD${year}`, "")) + 1;
    }
    return `ORD${year}${String(next).padStart(3, "0")}`;
  };

  const generateDeliveryCode = async () => {
    const year = new Date().getFullYear();
    const { data } = await supabase
      .from("delivery_schedule")
      .select("delivery_code")
      .like("delivery_code", `DEL${year}%`)
      .order("delivery_code", { ascending: false })
      .limit(1);

    let nextNumber = 1;
    if (data?.length > 0 && data[0].delivery_code) {
      const lastCode = data[0].delivery_code;
      const numberPart = lastCode.replace(`DEL${year}`, "");
      nextNumber = Number(numberPart) + 1;
    }
    return `DEL${year}${String(nextNumber).padStart(3, "0")}`;
  };

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
    fetchInventoryStocks();
  }, []);

  const fetchInventoryStocks = async () => {
    const { data, error } = await supabase.from("inventory").select("*");
    if (!error) {
      setInventoryStock(data || []);
    }
  };

  const getItemStock = (itemName) => {
    const item = inventoryStock.find((inv) => inv.item_name === itemName);
    return item ? Number(item.quantity_available) : 0;
  };

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        order_items!order_items_order_id_fkey(
          item_name,
          quantity
        ),
        container_transactions(
          delivered_quantity,
          returned_quantity,
          outstanding_quantity,
          container_status
        )
      `)
      .order("delivery_date");

    if (error) {
      console.log(error.message);
      return;
    }

    const merged = (data || []).map((order) => {
      const container = order.container_transactions?.[0] || {};
      return {
        id: order.order_id || order.id,
        order_code: order.order_code,
        delivery_code: order.delivery_code || "-",
        order_type: order.order_type || "-",
        full_name: order.full_name,
        delivery_date: order.delivery_date,
        payment_method: order.payment_method,
        status: order.status,
        total_amount: order.total_amount,

        quantity: order.order_items
          ? order.order_items.reduce((sum, i) => sum + Number(i.quantity || 0), 0)
          : 0,

        item_name: order.order_items
          ? order.order_items.map(i => i.item_name).join(", ")
          : "No items",

        borrowed_containers: container.delivered_quantity || 0,
        container_status: container.container_status || "Unreturned",
        returned_quantity: container.returned_quantity || 0,
        outstanding_quantity: container.outstanding_quantity || 0,
      };
    });

    setOrders(merged);
  };

  const handleAddOrder = async () => {
    if (
      !addData.size_variant ||
      !addData.order_type ||
      !addData.full_name ||
      !addData.contact_number ||
      !addData.payment_method
    ) {
      showToast("Complete all fields.", "error");
      return;
    }

    if (addData.order_type === "Delivery") {
      if (!addData.delivery_date || !addData.delivery_address) {
        showToast("Please complete delivery details.", "error");
        return;
      }
    }

    if (is500mlDeliveryInvalid) {
      showToast("Minimum order for 500ml delivery is 12 pcs.", "error");
      return;
    }

    const targetItemName = addData.size_variant;
    const currentStock = getItemStock(targetItemName);

    if (currentStock < Number(addData.quantity)) {
      showToast(`Kulang ang stock! Available lang ay ${currentStock}.`, "error");
      return;
    }

    const orderCode = await generateOrderCode();
    let deliveryCode = null;
    if (addData.order_type === "Delivery") {
      deliveryCode = await generateDeliveryCode();
    }

    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .insert([
        {
          order_code: orderCode,
          order_date: new Date(),
          full_name: addData.full_name,
          contact_number: addData.contact_number,
          order_type: addData.order_type,
          delivery_date: addData.order_type === "Delivery" ? addData.delivery_date : null,
          delivery_address: addData.order_type === "Delivery" ? addData.delivery_address : null,
          payment_method: addData.payment_method,
          status: "Pending",
          total_amount: totalAmount,
        },
      ])
      .select("order_id")
      .single();

    if (orderError) {
      console.log(orderError.message);
      showToast(orderError.message, "error");
      return;
    }

    const { error: itemError } = await supabase
      .from("order_items")
      .insert([
        {
          order_id: orderData.order_id,
          item_name: targetItemName,
          water_type: addData.water_type,
          size_variant: addData.size_variant,
          quantity: addData.quantity,
          unit_price: unitPrice,
        },
      ]);

    if (itemError) {
      console.log("Item Insert Error:", itemError.message);
    }

    if (addData.order_type === "Delivery" && orderData?.order_id) {
      const { error: deliveryError } = await supabase
        .from("delivery_schedule")
        .insert([
          {
            order_id: orderData.order_id,     
            delivery_code: deliveryCode,          
            delivery_date: addData.delivery_date,
            assigned_rider: addData.assigned_rider || null,
            delivery_status: "Pending"                 
          }
        ]);

      if (deliveryError) {
        console.log("Delivery Schedule Error:", deliveryError.message);
      }
    }

    // Auto-deduct stock galing sa inventory
    const { error: rpcError } = await supabase.rpc("deduct_inventory_stock", {
      p_item_name: targetItemName,
      p_qty: Number(addData.quantity)
    });

    if (rpcError) {
      console.log("RPC Deduction Error:", rpcError.message);
    }

    showToast("Order added successfully!", "success");
    setShowAdd(false);
    fetchOrders();
    fetchInventoryStocks();
  };

  const handleView = (row) => {
    setSelectedOrder(row);
    setShowView(true);
  };

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

  const handleSaveChanges = async () => {
    try {
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          order_type: editData.order_type,
          full_name: editData.full_name,
          delivery_date: editData.delivery_date,
          status: editData.status,
          payment_method: editData.payment_method,
        })
        .eq("order_code", selectedOrder.order_code);

      if (updateError) {
        showToast("Failed to update order: " + updateError.message, "error");
        return;
      }

      if (editData.status === "Delivered") {
        const { data: existingSales } = await supabase
          .from("sales")
          .select("sales_code")
          .eq("order_id", selectedOrder.id)
          .maybeSingle();

        if (!existingSales) {
          const salesCode = await generateSalesCode();
          const totalSalesAmount = selectedOrder.total_amount || 0;

          await supabase.from("sales").insert([
            {
              sales_code: salesCode,
              order_id: selectedOrder.id,
              total_products: Number(selectedOrder.quantity || 0),
              total_sales: totalSalesAmount,
              payment_method: editData.payment_method,
              date: new Date(),
            },
          ]);
        }
      }
      showToast("Order updated successfully!", "success");
      setShowEdit(false);
      fetchOrders();
    } catch (err) {
      console.error("System Error during save:", err);
    }
  };

  const handleDelete = (row) => {
    setSelectedOrder(row);
    setShowDelete(true);
  };

  const confirmDelete = async () => {
    const { error } = await supabase
      .from("orders")
      .delete()
      .eq("order_code", selectedOrder.order_code);

    if (error) {
      showToast("Failed to delete order", "error");
    } else {
      setShowDelete(false);
      fetchOrders();
      showToast("Order deleted successfully!", "success");
    }
  };
  
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

  const columns = [
    { key: "order_code", label: "Order ID" },
    {
      key: "item_name",
      label: "Item Name",
      render: (row) => <span>{row.item_name}</span>,
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
        <span className={`Ord-status ${row.status?.toLowerCase()}`}>
          {row.status}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="Ord-actions">
          <button className="Ord-iconBtn view" onClick={() => handleView(row)}><Eye size={18} /></button>
          <button className="Ord-iconBtn edit" onClick={() => handleEdit(row)}><Pencil size={18} /></button>
          <button className="Ord-iconBtn delete" onClick={() => handleDelete(row)}><Trash2 size={18} /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="Ord-page">

      {toast.show && (
        <div className={`toast ${toast.type} show`}>
          <div className="toast-icon">
            {toast.type === "success" ? <CheckCircle size={18} /> : <XCircle size={18} />}
          </div>
          <div className="toast-text">{toast.message}</div>
        </div>
      )}

      <div className="Ord-header">
        <div>
          <h1>Orders</h1>
          <p>Manage and track customer transactions</p>
        </div>
      </div>

      <div className="Ord-controls">
        <input
          className="Ord-search"
          placeholder="Search orders..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="Ord-filter" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="All">All Orders</option>
          <option value="Delivery">Delivery</option>
          <option value="Pickup">Pickup</option>
        </select>
        <select className="Ord-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="All">All Status</option>
          <option value="Pending">Pending</option>
          <option value="Processing">Processing</option>
          <option value="Delivered">Delivered</option>
        </select>
        <button className="Ord-addBtn" onClick={() => setShowAdd(true)}>+ Add Order</button>
      </div>

      <div className="table-container">
        <Table columns={columns} data={filteredOrders} emptyMessage="No orders recorded yet." />
      </div>

      {/* VIEW MODAL */}
      {showView && (
        <div className="Ord-modal-overlay">
          <div className="Ord-view-modal">
            <button className="Ord-close-btn" onClick={() => setShowView(false)}><X size={20} /></button>
            <h2>Order Summary</h2>
            <div className="Ord-view-info">
              <div><label>Order ID</label><p>{selectedOrder?.order_code}</p></div>
              <div><label>Customer</label><p>{selectedOrder?.full_name}</p></div>
              <div><label>Delivery Date</label><p>{selectedOrder?.delivery_date}</p></div>
              <div><label>Quantity</label><p>{selectedOrder?.quantity}</p></div>
              <div><label>Payment Method</label><p>{selectedOrder?.payment_method}</p></div>
              <div><label>Order Type</label><p>{selectedOrder?.order_type}</p></div>
              <div><label>Status</label><span className={`Ord-status ${selectedOrder?.status?.toLowerCase()}`}>{selectedOrder?.status}</span></div>
            </div>
            <div className="Ord-modal-actions">
              <button className="Ord-closeAction" onClick={() => setShowView(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEdit && (
        <div className="Ord-modal-overlay">
          <div className="Ord-edit-modal">
            <button className="Ord-close-btn" onClick={() => setShowEdit(false)}><X size={20} /></button>
            <h2>Edit Order</h2>
            <div className="Ord-form-group"><label>Order ID</label><input value={editData.order_code} disabled /></div>
            <div className="Ord-form-group"><label>Customer</label><input value={editData.full_name} onChange={(e) => setEditData({...editData, full_name: e.target.value})} /></div>
            <div className="Ord-form-group">
              <label>Order Type</label>
              <select value={editData.order_type} onChange={(e) => setEditData({...editData, order_type: e.target.value})}>
                <option value="Delivery">Delivery</option>
                <option value="Pickup">Pickup</option>
              </select>
            </div>
            {editData.order_type === "Delivery" && (
              <div className="Ord-form-group"><label>Date</label><input type="date" value={editData.delivery_date} onChange={(e) => setEditData({...editData, delivery_date: e.target.value})} /></div>
            )}
            <div className="Ord-form-group"><label>Quantity</label><input value={editData.quantity} disabled /></div>
            <div className="Ord-form-group">
              <label>Payment Method</label>
              <select value={editData.payment_method} onChange={(e) => setEditData({...editData, payment_method: e.target.value})}>
                <option value="COD">COD</option>
                <option value="GCash">GCash</option>
                <option value="Card">Card</option>
              </select>
            </div>
            <div className="Ord-form-group">
              <label>Status</label>
              <select value={editData.status} onChange={(e) => setEditData({...editData, status: e.target.value})}>
                <option value="Pending">Pending</option>
                <option value="Processing">Processing</option>
                <option value="Delivered">Delivered</option>
              </select>
            </div>
            <div className="Ord-modal-actions">
              <button className="Ord-closeAction" onClick={() => setShowEdit(false)}>Cancel</button>
              <button className="Ord-save-btn" onClick={handleSaveChanges}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {showDelete && (
        <div className="Ord-modal-overlay">
          <div className="Ord-delete-modal">
            <button className="Orddelete-close-btn" onClick={() => setShowDelete(false)}><X size={20} /></button>
            <h1>Delete Order</h1>
            <h6>Are you sure you want to delete this order?</h6>
            <div className="Ord-delete-actions">
              <button className="Ord-cancel-btn" onClick={() => setShowDelete(false)}>No, Cancel</button>
              <button className="Ord-confirm-delete" onClick={confirmDelete}>Delete Order</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD MODAL */}
      {showAdd && (
        <div className="Ord-modal-overlay">
          <div className="Ord-add-modal">
            <button className="OrdAdd-close-btn" onClick={() => setShowAdd(false)}><X size={20} /></button>
            <h2>Add Order</h2>

            <div className="Ord-form-group">
              <label>Water Type</label>
              <input value="Purified" disabled style={{ backgroundColor: "#f3f4f6", cursor: "not-allowed" }} />
            </div>

            <div className="Ord-form-group">
              <label>Size / Variant</label>
              <select
                value={addData.size_variant}
                onChange={(e) => setAddData({ ...addData, size_variant: e.target.value })}
              >
                <option value="">Select Size</option>
                {inventoryStock.map((item) => {
                  const stock = Number(item.quantity_available || item.quantity || 0);
                  const isOut = stock <= 0;
                  const variantName = item.item_name;

                  return (
                    <option key={item.id || item.item_name} value={variantName} disabled={isOut}>
                      {variantName} {isOut ? "(Out of Stock)" : `(Stock: ${stock})`}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="Ord-form-group">
              <label>Quantity</label>
              <input
                type="number"
                min="1"
                value={addData.quantity}
                onChange={(e) => setAddData({ ...addData, quantity: e.target.value })}
                style={{
                  borderColor: is500mlDeliveryInvalid ? "#ef4444" : undefined
                }}
              />
              {is500mlDeliveryInvalid && (
                <span style={{ 
                  color: "#ef4444", 
                  fontSize: "11px", 
                  marginTop: "3px", 
                  display: "block",
                  lineHeight: "1.2"
                }}>
                  Minimum order for 500ml delivery is 12 pcs.
                </span>
              )}
            </div>

            <div className="Ord-form-group">
              <label>Order Type</label>
              <select
                value={addData.order_type}
                onChange={(e) => setAddData({ ...addData, order_type: e.target.value })}
              >
                <option value="Delivery">Delivery</option>
                <option value="Pickup">Pickup</option>
              </select>
            </div>

            <div className="Ord-form-group">
              <label>Customer Name</label>
              <input
                value={addData.full_name}
                onChange={(e) => setAddData({ ...addData, full_name: e.target.value })}
              />
            </div>

            <div className="Ord-form-group">
              <label>Contact Number</label>
              <input
                value={addData.contact_number}
                onChange={(e) => setAddData({ ...addData, contact_number: e.target.value })}
              />
            </div>

            {addData.order_type === "Delivery" && (
              <>
                <div className="Ord-form-group">
                  <label>Delivery Date</label>
                  <input
                    type="date"
                    value={addData.delivery_date}
                    onChange={(e) => setAddData({ ...addData, delivery_date: e.target.value })}
                  />
                </div>
                <div className="Ord-form-group">
                  <label>Delivery Address</label>
                  <input
                    value={addData.delivery_address}
                    onChange={(e) => setAddData({ ...addData, delivery_address: e.target.value })}
                  />
                </div>
              </>
            )}

            <div className="Ord-form-group">
              <label>Payment Method</label>
              <select
                value={addData.payment_method}
                onChange={(e) => setAddData({ ...addData, payment_method: e.target.value })}
              >
                <option value="">Select payment method</option>
                <option value="COD">Cash on Delivery</option>
                <option value="GCash">GCash</option>
                <option value="Card">Card</option>
              </select>
            </div>

            <div className="Ord-form-group">
              <label>Total Amount</label>
              <input value={`₱${totalAmount}`} disabled />
            </div>

            <div className="Ord-modal-actions">
              <button className="Ord-closeAction" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="Ord-save-btn" onClick={handleAddOrder}>Add Order</button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default Orders;