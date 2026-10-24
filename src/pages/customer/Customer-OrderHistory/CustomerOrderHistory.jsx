import "./customer-orderhistory.css";

import CustomerTopbar from "../../../components/NavBar/CustomerTopbar";

import {
  ClipboardList,
  Search,
  Filter,
  MapPin,
  Wallet,
  XCircle,
  Plus,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../../../supabase";

// ID ng order (order_id sa orders table; fallback sa id)
const getOrderId = (order) => order?.order_id ?? order?.id;

// STATUS NA IPAPAKITA: delivery status (delivery_schedule) ang kinukuha.
// Kung Pickup (walang delivery schedule), orders.status ang gagamitin.
const getStatusKey = (order) =>
  String(order?.delivery_status || order?.status || "").toLowerCase();

const getDisplayStatus = (order) =>
  order?.delivery_status || order?.status || "Pending";

// Puwede pang baguhin ang order (add item / cancel) hangga't hindi pa
// Out for Delivery, Delivered o Cancelled (delivery status ang sinusunod)
const isOpenForChanges = (order) =>
  ![
    "out for delivery",
    "delivered",
    "ready for pickup",
    "picked up",
    "cancelled",
  ].includes(getStatusKey(order));

// Cancel: pareho ng Add Item, hangga't hindi pa Out for Delivery
const canCancelOrder = (order) => isOpenForChanges(order);

// Product + total qty (lahat ng items sa order, hindi lang ang una)
const getProductLabel = (order) => {
  const names = [...new Set((order?.order_items || []).map((i) => i.item_name))];
  return names.length > 0 ? names.join(", ") : "No Item";
};

const getTotalQty = (order) =>
  (order?.order_items || []).reduce((t, i) => t + Number(i.quantity || 0), 0);

// AUTOMATIC SORTING: Pending muna sa taas, tapos pinakabago -> pinakaluma
const sortOrders = (list) =>
  [...list].sort((a, b) => {
    const aPending = getDisplayStatus(a).toLowerCase() === "pending";
    const bPending = getDisplayStatus(b).toLowerCase() === "pending";

    if (aPending !== bPending) return aPending ? -1 : 1;

    const aTime = new Date(a.order_date).getTime() || 0;
    const bTime = new Date(b.order_date).getTime() || 0;

    if (aTime !== bTime) return bTime - aTime;

    return String(b.order_code || "").localeCompare(String(a.order_code || ""));
  });

export default function CustomerOrderHistory() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // CANCEL ORDER MODAL
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null); // order na ica-cancel

  // ADD ITEM TO ORDER MODAL
  const [inventoryItems, setInventoryItems] = useState([]);
  const [addTarget, setAddTarget] = useState(null); // order na dadagdagan
  const [addSize, setAddSize] = useState("");
  const [addQty, setAddQty] = useState(1);
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    const currentUser = JSON.parse(localStorage.getItem("user"));

    if (!currentUser) {
      console.log("User not logged in");
      return;
    }

    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (
          item_name,
          quantity
        )
      `)
      .eq("user_id", currentUser.users_id)
      .order("order_date", {
        ascending: false,
      });

    if (error) {
      console.log("ERROR:", error.message);
      return;
    }

    // DELIVERY STATUS (galing sa delivery_schedule, hindi sa orders.status)
    const orderIds = (data || []).map((o) => getOrderId(o)).filter(Boolean);
    const deliveryMap = {};

    if (orderIds.length > 0) {
      const { data: deliveries, error: deliveryError } = await supabase
        .from("delivery_schedule")
        .select("order_id, delivery_status")
        .in("order_id", orderIds);

      if (deliveryError) {
        console.log("Delivery status error:", deliveryError.message);
      } else {
        (deliveries || []).forEach((d) => {
          deliveryMap[d.order_id] = d.delivery_status;
        });
      }
    }

    const withDelivery = (data || []).map((o) => ({
      ...o,
      delivery_status: deliveryMap[getOrderId(o)] || null,
    }));

    const sorted = sortOrders(withDelivery);

    setOrders(sorted);

    // Panatilihin ang napiling order kapag nag-refresh; kung wala, kunin ang nasa taas
    setSelectedOrder(
      (prev) =>
        sorted.find((o) => getOrderId(o) === getOrderId(prev)) ||
        sorted[0] ||
        null
    );
  };

  // ===============================
  // CANCEL ORDER
  // ===============================
  const openCancelModal = (order) => {
    setCancelTarget(order);
    setCancelReason("");
    setCancelError("");
    setShowCancelModal(true);
  };

  const closeCancelModal = () => {
    if (cancelling) return;
    setShowCancelModal(false);
    setCancelReason("");
    setCancelError("");
  };

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;

    const reason = cancelReason.trim();

    if (reason.length < 3) {
      setCancelError("Please tell us why you are cancelling this order.");
      return;
    }

    setCancelling(true);
    setCancelError("");

    const orderId = getOrderId(cancelTarget);

    // 0. Tingnan muna ang pinakabagong delivery status (baka Out for Delivery na)
    const { data: latestDelivery } = await supabase
      .from("delivery_schedule")
      .select("delivery_status")
      .eq("order_id", orderId);

    if (
      !isOpenForChanges({
        status: cancelTarget.status,
        delivery_status: latestDelivery?.[0]?.delivery_status || null,
      })
    ) {
      setCancelError(
        "This order can no longer be cancelled because it is already out for delivery."
      );
      setCancelling(false);
      fetchOrders();
      return;
    }

    // 1. Delivery status muna ang i-Cancelled (ito ang sinusunod ng status)
    if (latestDelivery && latestDelivery.length > 0) {
      const { data: cancelledDelivery, error: deliveryError } = await supabase
        .from("delivery_schedule")
        .update({ delivery_status: "Cancelled" })
        .eq("order_id", orderId)
        .select("order_id");

      if (deliveryError || !cancelledDelivery || cancelledDelivery.length === 0) {
        console.log("Cancel delivery error:", deliveryError?.message);
        setCancelError(
          deliveryError?.message ||
            "Could not update the delivery status. Please try again."
        );
        setCancelling(false);
        return;
      }
    }

    // 2. Ilagay ang remarks sa order (status = Cancelled para sa records)
    const { data: updated, error: orderError } = await supabase
      .from("orders")
      .update({ status: "Cancelled", remarks: reason })
      .eq("order_id", orderId)
      .select("order_id");

    if (orderError) {
      console.log("Cancel order error:", orderError.message);
      setCancelError(orderError.message);
      setCancelling(false);
      return;
    }

    if (!updated || updated.length === 0) {
      setCancelError("Could not cancel this order. Please try again.");
      setCancelling(false);
      fetchOrders();
      return;
    }

    // 3. Ibalik ang stock sa inventory
    for (const item of cancelTarget.order_items || []) {
      const { data: inv, error: invFetchError } = await supabase
        .from("inventory")
        .select("inventory_id, quantity_available")
        .eq("item_name", item.item_name)
        .maybeSingle();

      if (invFetchError || !inv) {
        console.log("Restore stock lookup error:", invFetchError?.message);
        continue;
      }

      const { error: invUpdateError } = await supabase
        .from("inventory")
        .update({
          quantity_available:
            Number(inv.quantity_available || 0) + Number(item.quantity || 0),
        })
        .eq("inventory_id", inv.inventory_id);

      if (invUpdateError) {
        console.log("Restore stock error:", invUpdateError.message);
      }
    }

    setCancelling(false);
    setShowCancelModal(false);
    setCancelReason("");
    fetchOrders();
  };

  // ===============================
  // ADD ITEM TO EXISTING ORDER
  // (puwede hangga't hindi pa Out for Delivery)
  // ===============================
  useEffect(() => {
    const fetchInventory = async () => {
      const { data, error } = await supabase
        .from("inventory")
        .select("item_name, price, quantity_available");

      if (error) {
        console.log("Error fetching inventory:", error.message);
        return;
      }

      setInventoryItems(data || []);
    };

    fetchInventory();
  }, []);

  const openAddModal = (order) => {
    setAddTarget(order);
    setAddSize("");
    setAddQty(1);
    setAddError("");
  };

  const closeAddModal = () => {
    if (adding) return;
    setAddTarget(null);
    setAddSize("");
    setAddQty(1);
    setAddError("");
  };

  const handleConfirmAdd = async () => {
    if (!addTarget) return;

    if (!addSize) {
      setAddError("Please select a size/variant.");
      return;
    }

    const qty = Number(addQty);

    if (!qty || qty <= 0) {
      setAddError("Quantity must be at least 1.");
      return;
    }

    // Minimum na 12 para sa 500ml (kung wala pa nito sa order)
    const alreadyInOrder = (addTarget.order_items || []).some(
      (i) => i.item_name === addSize
    );

    if (addSize === "500ml" && !alreadyInOrder && qty < 12) {
      setAddError("Minimum order for 500ml is 12.");
      return;
    }

    setAdding(true);
    setAddError("");

    const orderId = getOrderId(addTarget);

    // 1. Tingnan ang pinakabagong status ng order at delivery
    const { data: latestOrder, error: latestError } = await supabase
      .from("orders")
      .select("status, total_amount")
      .eq("order_id", orderId)
      .maybeSingle();

    const { data: deliveryRows } = await supabase
      .from("delivery_schedule")
      .select("delivery_status")
      .eq("order_id", orderId);

    if (latestError || !latestOrder) {
      setAddError("Could not load this order. Please try again.");
      setAdding(false);
      return;
    }

    if (
      !isOpenForChanges({
        status: latestOrder.status,
        delivery_status: deliveryRows?.[0]?.delivery_status || null,
      })
    ) {
      setAddError(
        "You can no longer add items because this order is already out for delivery."
      );
      setAdding(false);
      fetchOrders();
      return;
    }

    // 2. Presyo at stock (fresh sa database)
    const { data: inv, error: invError } = await supabase
      .from("inventory")
      .select("inventory_id, price, quantity_available")
      .eq("item_name", addSize)
      .maybeSingle();

    if (invError || !inv) {
      setAddError("Item not found.");
      setAdding(false);
      return;
    }

    if (qty > Number(inv.quantity_available || 0)) {
      setAddError("Not enough stock for this quantity.");
      setAdding(false);
      return;
    }

    const unitPrice = Number(inv.price || 0);

    // 3. Idagdag ang item sa order
    const { error: itemError } = await supabase.from("order_items").insert([
      {
        order_id: orderId,
        item_name: addSize,
        water_type: "Purified",
        size_variant: addSize,
        quantity: qty,
        unit_price: unitPrice,
        customized_logo: null,
      },
    ]);

    if (itemError) {
      console.log("Add item error:", itemError.message);
      setAddError(itemError.message);
      setAdding(false);
      return;
    }

    // 4. I-update ang total ng order
    const { error: totalError } = await supabase
      .from("orders")
      .update({
        total_amount: Number(latestOrder.total_amount || 0) + unitPrice * qty,
      })
      .eq("order_id", orderId);

    if (totalError) {
      console.log("Update total error:", totalError.message);
    }

    // 5. Bawasan ang stock
    const { error: stockError } = await supabase
      .from("inventory")
      .update({
        quantity_available: Number(inv.quantity_available || 0) - qty,
      })
      .eq("inventory_id", inv.inventory_id);

    if (stockError) {
      console.log("Deduct stock error:", stockError.message);
    }

    setAdding(false);
    setAddTarget(null);
    setAddSize("");
    setAddQty(1);
    fetchOrders();
  };

  // ===============================
  // ORDER AGAIN (dadalhin ang items ng napiling order sa Make Order page)
  // ===============================
  const handleOrderAgain = () => {
    if (!selectedOrder) return;

    navigate("/customer/make-order", {
      state: {
        reorderItems: (selectedOrder.order_items || []).map((i) => ({
          item_name: i.item_name,
          quantity: Number(i.quantity || 0),
        })),
        reorderFrom: selectedOrder.order_code,
        // Mga detalye ng dating order (hindi kasama ang delivery date)
        orderType: selectedOrder.order_type || "",
        name: selectedOrder.full_name || "",
        contact: selectedOrder.contact_number || "",
        address: selectedOrder.delivery_address || "",
        payment: selectedOrder.payment_method || "",
      },
    });
  };

  // ✅ FILTER LOGIC (SEARCH + STATUS)
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.order_code
        ?.toLowerCase()
        .includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "All" ||
      getDisplayStatus(order).toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  return (
    <>
      <CustomerTopbar />

      <div className="order-history-page">
        <div className="order-history-container">

          {/* LEFT SIDE */}
          <div className="order-history-left">

            {/* HEADER */}
            <div className="history-header">
              <div className="history-icon">
                <ClipboardList size={28} />
              </div>

              <div>
                <h2>Order History</h2>
                <p>View and Manage your past orders.</p>
              </div>
            </div>

            {/* SEARCH + FILTER */}
            <div className="history-actions">

              {/* SEARCH */}
              <div className="search-box">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Search by Order ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* FILTER */}
              <select
                className="OrHis-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Processing">Processing</option>
                <option value="Out for Delivery">Out for Delivery</option>
                <option value="Delivered">Delivered</option>
                <option value="Ready for Pickup">Ready for Pickup</option>
                <option value="Picked Up">Picked Up</option>
                <option value="Cancelled">Cancelled</option>
              </select>

            </div>

            {/* TABLE */}
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Date</th>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Order Status</th>
                    <th>Total</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="empty-table">
                        No orders found.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => (
                      <tr
                        key={getOrderId(order)}
                        onClick={() => setSelectedOrder(order)}
                        style={{
                          cursor: "pointer",
                          backgroundColor:
                            getOrderId(selectedOrder) === getOrderId(order)
                              ? "#f3f3f3"
                              : "transparent",
                        }}
                      >
                        <td>{order.order_code}</td>
                        <td>{order.order_date}</td>

                        <td>{getProductLabel(order)}</td>

                        <td>{getTotalQty(order)}</td>

                        <td>{getDisplayStatus(order)}</td>
                        <td>₱{order.total_amount}</td>

                        <td>
                          {isOpenForChanges(order) ? (
                            <div className="row-actions">
                              <button
                                type="button"
                                className="table-add-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openAddModal(order);
                                }}
                              >
                                <Plus size={14} />
                                Add Item
                              </button>

                              {canCancelOrder(order) && (
                                <button
                                  type="button"
                                  className="table-cancel-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openCancelModal(order);
                                  }}
                                >
                                  <XCircle size={14} />
                                  Cancel
                                </button>
                              )}
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>

          {/* RIGHT SIDE */}
          <div className="order-history-right">

            <div className="details-card">
              <h3>Order Details</h3>

              <div className="detail-item">
                <strong>Order ID:</strong> {selectedOrder?.order_code || "N/A"}
              </div>

              <div className="detail-item">
                <strong>Date:</strong> {selectedOrder?.order_date || "N/A"}
              </div>

              <div className="detail-item">
                <strong>Product:</strong>{" "}
                {selectedOrder?.order_items
                  ?.map(i => i.item_name)
                  .join(", ") || "N/A"}
              </div>

              <div className="detail-item">
                <strong>Quantity:</strong>{" "}
                {selectedOrder?.order_items?.reduce(
                  (t, i) => t + i.quantity,
                  0
                ) || 0}
              </div>

              <div className="detail-item">
                <strong>Order Status:</strong>{" "}
                {selectedOrder ? getDisplayStatus(selectedOrder) : "N/A"}
              </div>

              <div className="detail-item">
                <strong>Remarks:</strong> {selectedOrder?.remarks || "—"}
              </div>

              <div className="detail-item">
                <strong>Total:</strong> ₱{selectedOrder?.total_amount || 0}
              </div>
            </div>

            <div className="address-card">
              <div className="address-header">
                <MapPin size={22} />
                <h4>Delivery Address</h4>
              </div>

              <p>
                {selectedOrder?.delivery_address?.toUpperCase() ||
                  "No address found."}
              </p>
            </div>

            <div className="payment-card">
              <div className="payment-header">
                <Wallet size={22} />
                <h4>Payment Method</h4>
              </div>

              <p>
                {selectedOrder?.payment_method?.toUpperCase() ||
                  "No payment method"}
              </p>
            </div>

            <button
              className="reorder-btn"
              disabled={!selectedOrder}
              onClick={handleOrderAgain}
            >
              Order Again
            </button>

          </div>

        </div>
      </div>

      {/* CANCEL ORDER MODAL */}
      {showCancelModal && (
        <div className="cancel-modal-overlay" onClick={closeCancelModal}>
          <div
            className="cancel-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cancel-modal-icon">
              <XCircle size={24} />
            </div>

            <h3>Cancel this order?</h3>
            <p>
              Order <strong>{cancelTarget?.order_code}</strong> will be
              cancelled. This cannot be undone.
            </p>

            <label className="cancel-modal-label" htmlFor="cancelReason">
              Reason for cancellation <span>*</span>
            </label>

            <textarea
              id="cancelReason"
              className="cancel-modal-textarea"
              rows={3}
              maxLength={200}
              placeholder="e.g. Wrong quantity, changed my mind..."
              value={cancelReason}
              onChange={(e) => {
                setCancelReason(e.target.value);
                setCancelError("");
              }}
            />

            {cancelError && (
              <div className="cancel-modal-error">{cancelError}</div>
            )}

            <div className="cancel-modal-buttons">
              <button
                type="button"
                className="cancel-modal-keep"
                disabled={cancelling}
                onClick={closeCancelModal}
              >
                Keep Order
              </button>

              <button
                type="button"
                className="cancel-modal-confirm"
                disabled={cancelling}
                onClick={handleConfirmCancel}
              >
                {cancelling ? "Cancelling..." : "Cancel Order"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD ITEM TO ORDER MODAL */}
      {addTarget && (
        <div className="cancel-modal-overlay" onClick={closeAddModal}>
          <div
            className="cancel-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cancel-modal-icon add">
              <Plus size={24} />
            </div>

            <h3>Add to your order</h3>
            <p>
              Add more items to order <strong>{addTarget.order_code}</strong>.
              You can do this until it is out for delivery.
            </p>

            <label className="cancel-modal-label" htmlFor="addSize">
              Size / Variant
            </label>

            <select
              id="addSize"
              className="add-modal-select"
              value={addSize}
              onChange={(e) => {
                setAddSize(e.target.value);
                setAddError("");
              }}
            >
              <option value="" disabled hidden>
                Select size/variant
              </option>
              {inventoryItems
                .filter((item) => Number(item.quantity_available) > 0)
                .map((item) => (
                  <option key={item.item_name} value={item.item_name}>
                    {item.item_name}
                  </option>
                ))}
            </select>

            <label className="cancel-modal-label">Quantity</label>

            <div className="add-modal-qty">
              <button
                type="button"
                onClick={() => setAddQty((q) => Math.max(1, Number(q) - 1))}
              >
                -
              </button>
              <span>{addQty}</span>
              <button
                type="button"
                onClick={() => setAddQty((q) => Number(q) + 1)}
              >
                +
              </button>
            </div>

            {addSize === "500ml" &&
              !(addTarget.order_items || []).some(
                (i) => i.item_name === "500ml"
              ) &&
              Number(addQty) < 12 && (
                <div className="add-modal-note">
                  ⚠️ Minimum order for 500ml is 12.
                </div>
              )}

            {addError && <div className="cancel-modal-error">{addError}</div>}

            <div className="cancel-modal-buttons">
              <button
                type="button"
                className="cancel-modal-keep"
                disabled={adding}
                onClick={closeAddModal}
              >
                Close
              </button>

              <button
                type="button"
                className="add-modal-confirm"
                disabled={adding}
                onClick={handleConfirmAdd}
              >
                {adding ? "Adding..." : "Add to Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
