import "./customer-orderhistory.css";

import CustomerTopbar from "../../../components/NavBar/CustomerTopbar";

import {
  ClipboardList,
  Search,
  Filter,
  MapPin,
  Wallet,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../../../supabase";

export default function CustomerOrderHistory() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
  const currentUser = JSON.parse(
    localStorage.getItem("user")
  );

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

  setOrders(data || []);
  setSelectedOrder(data?.[0] || null);
};

  // ✅ FILTER LOGIC (SEARCH + STATUS)
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.order_code
        ?.toLowerCase()
        .includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "All" ||
      order.status?.toLowerCase() === statusFilter.toLowerCase();

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
                <option value="Delivered">Delivered</option>
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
                    <th>Status</th>
                    <th>Total</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="empty-table">
                        No orders found.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => (
                      <tr
                        key={order.id}
                        onClick={() => setSelectedOrder(order)}
                        style={{
                          cursor: "pointer",
                          backgroundColor:
                            selectedOrder?.id === order.id
                              ? "#f3f3f3"
                              : "transparent",
                        }}
                      >
                        <td>{order.order_code}</td>
                        <td>{order.order_date}</td>

                        <td>
                          {order.order_items?.length > 0
                            ? order.order_items[0].item_name
                            : "No Item"}
                        </td>

                        <td>
                          {order.order_items?.length > 0
                            ? order.order_items[0].quantity
                            : 0}
                        </td>

                        <td>{order.status}</td>
                        <td>₱{order.total_amount}</td>
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
              onClick={() => navigate("/customer/make-order")}
            >
              Order Again
            </button>

          </div>

        </div>
      </div>
    </>
  );
}