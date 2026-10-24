import { useState, useEffect } from "react";
import "./staff-orders.css";
import Table from "../../../components/Table";
import { supabase } from "../../../supabase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import {
  Eye,
  Pencil,
  Trash2,
  X,
  CheckCircle,
  XCircle,
  Download
} from "lucide-react";

// ==========================================
// STATUS HELPERS
// DELIVERY order: ang status ay galing sa delivery_schedule (delivery status).
//   "—" = Delivery order pero wala pang rider
// PICKUP order: walang delivery, kaya orders.status ang status at
//   ito ang ine-edit ng admin (Pending -> Ready for Pickup -> Picked Up).
// ==========================================
// Walang Cancelled dito: ang customer lang ang nagka-cancel (Order History)
const PICKUP_STATUSES = ["Pending", "Ready for Pickup", "Picked Up"];

// Payment status options (Pickup orders: ine-edit ng admin kapag nagbayad na)
const getPaymentStatusOptions = (method, current) => {
  const base =
    String(method || "").toLowerCase() === "gcash"
      ? ["Pending", "Paid", "Rejected"]
      : ["Unpaid", "Paid"];

  return current && !base.includes(current) ? [current, ...base] : base;
};

// Container status: "Returned" sa database, "Cleared" ang ipinapakita
const containerLabel = (status) => (status === "Returned" ? "Cleared" : status);

const statusClass = (status) =>
  String(status || "").toLowerCase().replace(/\s+/g, "-");

const StatusBadge = ({ status }) => {
  if (!status || status === "—" || status === "N/A") {
    return <span style={{ color: "#94a3b8" }}>{status || "—"}</span>;
  }
  return <span className={`StfOrd-status ${statusClass(status)}`}>{status}</span>;
};

// Payment status badge (Pending / Paid / Rejected). Ang lumang "Verified" ay ituturing na Paid.
const PaymentBadge = ({ status }) => {
  const value = status || "Pending";
  const key = value.toLowerCase();

  const colors =
    key === "paid" || key === "verified"
      ? { bg: "#dcfce7", fg: "#15803d" }
      : key === "rejected"
      ? { bg: "#fee2e2", fg: "#b91c1c" }
      : { bg: "#fef9c3", fg: "#a16207" };

  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 12px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: 600,
        background: colors.bg,
        color: colors.fg,
      }}
    >
      {key === "verified" ? "Paid" : value}
    </span>
  );
};

// Payment method rules (admin Add/Edit): Cash = pwede sa lahat (walk-in),
// COD = Delivery lang, GCash = pareho
const getPaymentMethodOptions = (orderType) =>
  orderType === "Pickup"
    ? [{ value: "Cash", label: "Cash" }, { value: "GCash", label: "GCash" }]
    : [
        { value: "Cash", label: "Cash" },
        { value: "COD", label: "Cash on Delivery" },
        { value: "GCash", label: "GCash" },
      ];

// Kapag naging Pickup ang order, hindi na valid ang COD -> gawing Cash
const fixPaymentMethod = (orderType, method) => {
  const m = String(method || "").toLowerCase();
  if (!m) return "";
  if (m === "gcash") return "GCash";
  if (m === "cash") return "Cash";
  return orderType === "Pickup" ? "Cash" : "COD";
};

// Editable ng admin: Pickup (Cash) at Delivery na Cash (walk-in).
// COD = kusa sa delivery status, GCash = Paid/Rejected sa View.
const isPaymentStatusEditable = (orderType, method) => {
  const m = String(method || "").toLowerCase();
  if (m === "gcash") return false;
  if (orderType === "Delivery" && m === "cod") return false;
  return true;
};

const defaultPaymentStatus = (method) =>
  String(method || "").toLowerCase() === "gcash" ? "Pending" : "Unpaid";

// Pending / walang rider (nasa taas) -> Out for Delivery / Ready for Pickup
// -> Delivered / Picked Up -> Cancelled (nasa ilalim)
const statusRank = (status) => {
  if (status === "Pending" || status === "—") return 0;
  if (status === "Out for Delivery" || status === "Ready for Pickup") return 1;
  if (status === "Delivered" || status === "Picked Up") return 2;
  if (status === "Cancelled") return 3;
  return 4;
};

// AUTOMATIC SORTING: sundin ang statusRank sa taas; pinakabagong order muna sa bawat grupo.
const sortOrders = (list) =>
  [...list].sort((a, b) => {
    const rank = statusRank(a.status) - statusRank(b.status);
    if (rank !== 0) return rank;

    const timeA = new Date(a.order_date || 0).getTime();
    const timeB = new Date(b.order_date || 0).getTime();
    if (timeB !== timeA) return timeB - timeA;

    return Number(b.id || 0) - Number(a.id || 0);
  });

// ==========================================
// EXPORT PDF FUNCTION (Modern Style - Delivery Template)
// ==========================================
export const exportOrdersToPDF = (ordersData, filename = "orders-report.pdf", generatedBy = "System Admin") => {
  const doc = new jsPDF();

  const primaryColor = [30, 41, 59];
  const accentColor = [79, 70, 229];
  const lightBg = [248, 250, 252];

  doc.setFillColor(...accentColor);
  doc.rect(14, 15, 3, 14, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...primaryColor);
  doc.text("ADRENALINE AQUA WATER REFILLING STATION", 21, 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text("Orders & Container Status Report", 21, 28);

  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 196, 22, { align: "right" });

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(14, 34, 196, 34);

  const total = ordersData.length;
  const pending = ordersData.filter(o => o.status === 'Pending' || o.status === '—').length;
  const outForDelivery = ordersData.filter(o => o.status === 'Out for Delivery').length;
  const completed = ordersData.filter(o => o.status === 'Delivered' || o.status === 'Picked Up').length;

  doc.setFillColor(...lightBg);
  doc.roundedRect(14, 40, 182, 14, 1.5, 1.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...primaryColor);
  doc.text(`Total: ${total}`, 18, 49);
  doc.text(`Pending: ${pending}`, 60, 49);
  doc.text(`Out for Delivery: ${outForDelivery}`, 105, 49);
  doc.text(`Completed: ${completed}`, 160, 49);

  const tableColumn = [
    "Order ID",
    "Item Name",
    "Customer",
    "Qty",
    "Containers",
    "Payment",
    "Order Status"
  ];

  const tableRows = ordersData.map((order) => [
    order.order_code || "—",
    order.item_name || "—",
    order.full_name || "—",
    order.quantity || 0,
    order.borrowed_containers || 0,
    order.payment_method || "—",
    order.status || "—",
  ]);

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 60,
    theme: "striped",
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      cellPadding: 6,
    },
    bodyStyles: {
      textColor: [51, 65, 85],
      fontSize: 8,
      cellPadding: 6,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);

      doc.text(`Generated by: ${generatedBy}`, data.settings.margin.left, pageHeight - 10);

      doc.text(
        `Page ${doc.internal.getNumberOfPages()}`,
        doc.internal.pageSize.width - data.settings.margin.right,
        pageHeight - 10,
        { align: "right" }
      );
    },
  });

  doc.save(filename);
};

function StaffOrders() {

  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [typeFilter, setTypeFilter] = useState("All");

  const [inventoryStock, setInventoryStock] = useState([]);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [distance, setDistance] = useState(0);

  // MODALS
  const [showView, setShowView] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  // CUSTOMER LOGO (lightbox para malakihan at ma-save)
  const [logoView, setLogoView] = useState("");

  // GCASH REJECT (kailangan ng reason)
  const [payRejectMode, setPayRejectMode] = useState(false);
  const [payRejectReason, setPayRejectReason] = useState("");
  const [payRejectError, setPayRejectError] = useState("");

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
    borrowed_containers: 0,
    container_status: "Unreturned",
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
  const computedDeliveryFee = addData.order_type === "Delivery" ? Number(deliveryFee || 0) : 0;
  const totalAmount = (unitPrice * Number(addData.quantity || 0)) + computedDeliveryFee;

  const is500mlDeliveryInvalid =
    addData.order_type === "Delivery" &&
    addData.size_variant.toLowerCase().includes("500ml") &&
    Number(addData.quantity) < 12;

  useEffect(() => {
    let timeout;

    const compute = async () => {
      if (addData.order_type !== "Delivery") {
        setDistance(0);
        setDeliveryFee(0);
        return;
      }

      if (!addData.delivery_address || addData.delivery_address.trim().length < 5) {
        setDistance(0);
        setDeliveryFee(0);
        return;
      }

      const coords = await geocodeAddress(addData.delivery_address);

      if (!coords) {
        setDistance(0);
        setDeliveryFee(5);
        return;
      }

      const km = getDistanceKm(
        coords.lat,
        coords.lng,
        14.8294,
        120.7354
      );

      setDistance(km);

      const isHagonoy = addData.delivery_address.toLowerCase().includes("hagonoy");

      let fee = 0;
      const itemSize = addData.size_variant || "";

      if ((itemSize.includes("350ml") || itemSize.includes("500ml")) && isHagonoy) {
        fee = 0;
      } else if (!km || km <= 4) {
        fee = 5;
      } else {
        fee = 10;
      }

      setDeliveryFee(fee);
    };

    timeout = setTimeout(compute, 800);

    return () => clearTimeout(timeout);
  }, [addData.delivery_address, addData.order_type, addData.size_variant]);

  const geocodeAddress = async (address) => {
    if (!address) return null;

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
      );

      const data = await res.json();

      if (!data || data.length === 0) return null;

      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
    } catch (err) {
      console.log("Geocode error:", err);
      return null;
    }
  };

  const getDistanceKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;

    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
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
    borrowed_containers: 0,
    container_status: "Unreturned",
    status: "Pending",
    payment_status: "",
  });

  useEffect(() => {
    fetchOrders();
    fetchInventoryStocks();
  }, []);

  // SYNC: i-refresh ang table kapag may nagbago sa delivery (rider, staff, ibang admin)
  // Kailangang naka-enable ang Realtime sa delivery_schedule.
  useEffect(() => {
    const channel = supabase
      .channel("admin-orders-delivery-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "delivery_schedule" },
        () => fetchOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
          quantity,
          customized_logo
        ),
        container_transactions(
          delivered_quantity,
          returned_quantity,
          outstanding_quantity,
          container_status
        ),
        delivery_schedule(
          delivery_status,
          assigned_rider
        )
      `);

    if (error) {
      console.log(error.message);
      return;
    }

    const merged = (data || []).map((order) => {
      const container = order.container_transactions?.[0] || {};

      // one-to-one ay object, one-to-many ay array
      const schedule = Array.isArray(order.delivery_schedule)
        ? order.delivery_schedule[0]
        : order.delivery_schedule;

      const isDelivery = String(order.order_type || "").toLowerCase() === "delivery";

      // DELIVERY: delivery status (parehong logic sa Delivery page)
      // PICKUP: walang delivery, kaya orders.status ang gamit
      const orderStatus = !isDelivery
        ? order.status || "Pending"
        : schedule?.delivery_status === "Cancelled" || order.status === "Cancelled"
        ? "Cancelled"
        : !schedule?.assigned_rider
        ? "—"
        : schedule?.delivery_status || "Pending";

      // COD (Delivery): sa delivery status nakabase ang payment status.
      // Delivered = Paid, hindi pa Delivered = Unpaid.
      const isCodDelivery =
        isDelivery && String(order.payment_method || "").toLowerCase() === "cod";

      const paymentStatus = isCodDelivery
        ? schedule?.delivery_status === "Delivered"
          ? "Paid"
          : "Unpaid"
        : order.payment_status;

      return {
        id: order.order_id || order.id,
        order_code: order.order_code,
        order_date: order.order_date,
        delivery_code: order.delivery_code || "-",
        order_type: order.order_type || "-",
        full_name: order.full_name,
        delivery_date: order.delivery_date,
        payment_method: order.payment_method,
        payment_status: paymentStatus,
        receipt_url: order.receipt_url,
        status: orderStatus,
        remarks: order.remarks,
        payment_remarks: order.payment_remarks,
        total_amount: order.total_amount,

        quantity: order.order_items
          ? order.order_items.reduce((sum, i) => sum + Number(i.quantity || 0), 0)
          : 0,

        logos: (order.order_items || [])
          .map((i) => i.customized_logo)
          .filter(Boolean),

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
          payment_status: defaultPaymentStatus(addData.payment_method),
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

    if (orderData?.order_id && addData.order_type === "Delivery") {
      const borrowedQty = Number(addData.borrowed_containers || 0);
      const { error: containerError } = await supabase
        .from("container_transactions")
        .insert([
          {
            order_id: orderData.order_id,
            customer_name: addData.full_name,
            contact_number: addData.contact_number,
            delivered_quantity: borrowedQty,
            returned_quantity: 0,
            outstanding_quantity: borrowedQty,
            container_status: addData.container_status,
          }
        ]);

      if (containerError) {
        console.log("Container Transaction Error:", containerError.message);
      }
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

  // I-save ang logo (blob download; kapag hindi pwede, buksan sa bagong tab)
  const downloadLogo = async (url) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const ext = (blob.type.split("/")[1] || "png").split("+")[0];
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${selectedOrder?.order_code || "order"}-logo.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      console.log("Logo download error:", err);
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const handleView = (row) => {
    setPayRejectMode(false);
    setPayRejectReason("");
    setPayRejectError("");
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
      payment_method: fixPaymentMethod(row.order_type || "Delivery", row.payment_method),
      borrowed_containers: row.borrowed_containers || 0,
      container_status: row.container_status || "Unreturned",
      status: row.order_type === "Pickup" ? row.status || "Pending" : "Pending",
      payment_status:
        row.payment_status ||
        (String(row.payment_method || "").toLowerCase() === "gcash"
          ? "Pending"
          : "Unpaid"),
    });
    setShowEdit(true);
  };

  // Ibalik ang stock sa inventory (kapag na-Cancel ang Pickup order)
  const restoreStock = async (orderId) => {
    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select("item_name, quantity")
      .eq("order_id", orderId);

    if (itemsError) {
      console.log("Restore stock (items) error:", itemsError.message);
      return;
    }

    for (const item of items || []) {
      const { data: inv, error: invError } = await supabase
        .from("inventory")
        .select("inventory_id, quantity_available")
        .eq("item_name", item.item_name)
        .maybeSingle();

      if (invError || !inv) {
        console.log("Restore stock lookup error:", invError?.message);
        continue;
      }

      const { error: updateError } = await supabase
        .from("inventory")
        .update({
          quantity_available:
            Number(inv.quantity_available || 0) + Number(item.quantity || 0),
        })
        .eq("inventory_id", inv.inventory_id);

      if (updateError) {
        console.log("Restore stock error:", updateError.message);
      }
    }

    fetchInventoryStocks();
  };

  // DELIVERY order: delivery status ang batayan (hindi ine-edit dito).
  // PICKUP order: dito ine-edit ang orders.status. Kapag "Picked Up",
  // ang Sales page na ang gagawa ng sales record.
  const handleSaveChanges = async () => {
    try {
      const isPickupOrder =
        selectedOrder.order_type === "Pickup" && editData.order_type === "Pickup";

      // Kapag Picked Up o Cancelled na, naka-lock na ang status
      const statusLocked = ["Picked Up", "Cancelled"].includes(selectedOrder.status);

      const orderUpdate = {
        order_type: editData.order_type,
        full_name: editData.full_name,
        // Pickup walang delivery date; blank ay dapat null (hindi "") sa date column
        delivery_date:
          editData.order_type === "Delivery" ? editData.delivery_date || null : null,
        payment_method: fixPaymentMethod(editData.order_type, editData.payment_method),
      };

      if (isPickupOrder && !statusLocked) {
        orderUpdate.status = editData.status;
      }

      // Payment status: ine-edit ng admin para sa cash na Pickup lang.
      // COD (Delivery) = kusang Paid kapag Delivered; GCash = sa View modal.
      if (isPaymentStatusEditable(editData.order_type, editData.payment_method)) {
        orderUpdate.payment_status = editData.payment_status || "Unpaid";
      }

      const { error: updateError } = await supabase
        .from("orders")
        .update(orderUpdate)
        .eq("order_code", selectedOrder.order_code);

      if (updateError) {
        showToast("Failed to update order: " + updateError.message, "error");
        return;
      }

      await supabase
        .from("container_transactions")
        .update({
          delivered_quantity: Number(editData.borrowed_containers),
          outstanding_quantity: Number(editData.borrowed_containers) - Number(selectedOrder.returned_quantity || 0),
          container_status: editData.container_status,
        })
        .eq("order_id", selectedOrder.id);

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

  // ===============================
  // UPDATE PAYMENT STATUS (Verify / Reject)
  // ===============================
  const updatePaymentStatus = async (newStatus) => {
    let remarks = null;
    if (newStatus === "Rejected") {
      remarks = payRejectReason.trim();
      if (!remarks) {
        setPayRejectError("Please enter the reason for rejecting this payment.");
        return;
      }
    }

    const { error } = await supabase
      .from("orders")
      .update({ payment_status: newStatus, payment_remarks: remarks })
      .eq("order_code", selectedOrder.order_code);

    if (error) {
      showToast("Failed to update payment status: " + error.message, "error");
      return;
    }

    showToast(`Payment marked as ${newStatus}!`, "success");
    setSelectedOrder({ ...selectedOrder, payment_status: newStatus, payment_remarks: remarks });
    setPayRejectMode(false);
    setPayRejectReason("");
    setPayRejectError("");
    fetchOrders();
  };

  const filteredOrders = sortOrders(
    orders.filter((order) => {
      const matchesSearch =
        order.order_code?.toLowerCase().includes(search.toLowerCase()) ||
        order.full_name?.toLowerCase().includes(search.toLowerCase());

      // "Pending" ay kasama rin ang mga wala pang rider ("—")
      const matchesStatus =
        statusFilter === "All" ||
        order.status === statusFilter ||
        (statusFilter === "Pending" && order.status === "—");

      const matchesType =
        typeFilter === "All" ||
        order.order_type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    })
  );

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
    {
      key: "borrowed_containers",
      label: "Containers Borrowed",
      render: (row) => row.borrowed_containers,
    },
    {
      key: "container_status",
      label: "Container Status",
      render: (row) => (
        <span className={`StfOrd-status ${row.container_status?.toLowerCase()}`}>
          {containerLabel(row.container_status)}
        </span>
      ),
    },
    { key: "payment_method", label: "Payment Method" },
    {
      key: "payment_status",
      label: "Payment Status",
      render: (row) =>
        row.payment_method?.toLowerCase() === "gcash" ? (
          <PaymentBadge status={row.payment_status} />
        ) : (
          <PaymentBadge status={row.payment_status || "Unpaid"} />
        ),
    },
    {
      key: "status",
      label: "Order Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="StfOrd-actions">
          <button className="StfOrd-iconBtn view" onClick={() => handleView(row)}><Eye size={18} /></button>
          <button className="StfOrd-iconBtn edit" onClick={() => handleEdit(row)}><Pencil size={18} /></button>
          <button className="StfOrd-iconBtn delete" onClick={() => handleDelete(row)}><Trash2 size={18} /></button>
        </div>
      ),
    },
  ];

  const editStatusLocked = ["Picked Up", "Cancelled"].includes(selectedOrder?.status);

  return (
    <div className="StfOrd-page">

      {toast.show && (
        <div className={`toast ${toast.type} show`}>
          <div className="toast-icon">
            {toast.type === "success" ? <CheckCircle size={18} /> : <XCircle size={18} />}
          </div>
          <div className="toast-text">{toast.message}</div>
        </div>
      )}

      <div className="StfOrd-header">
        <div>
          <h1>Orders</h1>
          <p>Manage and track customer transactions and containers</p>
        </div>
      </div>

      <div className="StfOrd-controls">
        <input
          className="StfOrd-search"
          placeholder="Search orders..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="StfOrd-filter" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="All">All Orders</option>
          <option value="Delivery">Delivery</option>
          <option value="Pickup">Pickup</option>
        </select>
        <select className="StfOrd-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="All">All Status</option>
          <option value="Pending">Pending</option>
          <option value="Out for Delivery">Out for Delivery</option>
          <option value="Delivered">Delivered</option>
          <option value="Ready for Pickup">Ready for Pickup</option>
          <option value="Picked Up">Picked Up</option>
          <option value="Cancelled">Cancelled</option>
        </select>

        <button className="StfOrd-addBtn" onClick={() => setShowAdd(true)}>+ Add Order</button>

        <button
          onClick={() => {
            const savedUser = JSON.parse(localStorage.getItem("user")) || {};
            const userPosition = savedUser.position || savedUser.role || "Admin";
            const userName = savedUser.name || savedUser.fullName || "System Admin";
            const generatedByFull = `${userPosition} - ${userName}`;

            exportOrdersToPDF(filteredOrders, "orders-report.pdf", generatedByFull);
          }}
          className="export-pdf-btn"
          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 12px", cursor: "pointer" }}
        >
          <Download size={18} /> Export PDF
        </button>
      </div>

      <div className="table-container">
        <Table columns={columns} data={filteredOrders} emptyMessage="No orders recorded yet." />
      </div>

      {/* VIEW MODAL */}
      {showView && (
        <div className="StfOrd-modal-overlay">
          <div className="StfOrd-view-modal">
            <button className="StfOrd-close-btn" onClick={() => setShowView(false)}><X size={20} /></button>
            <h2>Order Summary</h2>
            <div className="StfOrd-view-info">
              <div><label>Order ID</label><p>{selectedOrder?.order_code}</p></div>
              <div><label>Customer</label><p>{selectedOrder?.full_name}</p></div>
              <div><label>Delivery Date</label><p>{selectedOrder?.delivery_date}</p></div>
              <div><label>Quantity</label><p>{selectedOrder?.quantity}</p></div>
              <div><label>Borrowed Containers</label><p>{selectedOrder?.borrowed_containers}</p></div>
              <div><label>Container Status</label><p>{containerLabel(selectedOrder?.container_status)}</p></div>
              <div><label>Payment Method</label><p>{selectedOrder?.payment_method}</p></div>
              <div><label>Order Type</label><p>{selectedOrder?.order_type}</p></div>
              <div><label>Order Status</label><StatusBadge status={selectedOrder?.status} /></div>

              {selectedOrder?.logos?.length > 0 && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <label>Customer Logo</label>
                  <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "6px" }}>
                    {selectedOrder.logos.map((url, idx) => (
                      <div key={idx} style={{ textAlign: "center" }}>
                        <img
                          src={url}
                          alt="Customer logo"
                          title="Click to enlarge"
                          onClick={() => setLogoView(url)}
                          style={{
                            width: "110px",
                            height: "110px",
                            objectFit: "contain",
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            borderRadius: "10px",
                            cursor: "zoom-in",
                            display: "block",
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => downloadLogo(url)}
                          style={{ marginTop: "6px", background: "none", border: "none", color: "#4f46e5", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}
                        >
                          Download
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedOrder?.status === "Cancelled" && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <label>Cancellation Reason</label>
                  <p>{selectedOrder?.remarks || "No reason provided."}</p>
                </div>
              )}

              {selectedOrder?.payment_method?.toLowerCase() !== "gcash" && (
                <div>
                  <label>Payment Status</label>
                  <PaymentBadge status={selectedOrder?.payment_status || "Unpaid"} />
                </div>
              )}

              {selectedOrder?.payment_method?.toLowerCase() === "gcash" && (
                <>
                  <div>
                    <label>Payment Status</label>
                    <PaymentBadge status={selectedOrder?.payment_status} />
                  </div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <label>GCash Receipt</label>
                    {selectedOrder?.receipt_url ? (
                      <a
                        href={selectedOrder.receipt_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <img
                          src={selectedOrder.receipt_url}
                          alt="GCash Receipt"
                          style={{
                            width: "100%",
                            maxWidth: "250px",
                            borderRadius: "10px",
                            border: "1px solid #e2e8f0",
                            marginTop: "6px",
                            display: "block",
                          }}
                        />
                      </a>
                    ) : (
                      <p style={{ color: "#94a3b8", marginTop: "6px" }}>
                        No receipt uploaded.
                      </p>
                    )}
                  </div>

                  {/* Ang pipindutin dito ang ise-save sa database (payment_status) */}
                  <div
                    style={{
                      gridColumn: "1 / -1",
                      display: "flex",
                      gap: "10px",
                      marginTop: "10px",
                    }}
                  >
                    <button
                      onClick={() => updatePaymentStatus("Paid")}
                      disabled={
                        ["paid", "verified"].includes(
                          (selectedOrder?.payment_status || "").toLowerCase()
                        )
                      }
                      style={{
                        flex: 1,
                        padding: "10px",
                        borderRadius: "8px",
                        border: "none",
                        background: "#22c55e",
                        color: "#fff",
                        fontWeight: 600,
                        cursor: "pointer",
                        opacity: ["paid", "verified"].includes(
                          (selectedOrder?.payment_status || "").toLowerCase()
                        )
                          ? 0.5
                          : 1,
                      }}
                    >
                      Paid
                    </button>
                    <button
                      onClick={() => {
                        setPayRejectMode(true);
                        setPayRejectReason("");
                        setPayRejectError("");
                      }}
                      disabled={
                        (selectedOrder?.payment_status || "").toLowerCase() ===
                        "rejected"
                      }
                      style={{
                        flex: 1,
                        padding: "10px",
                        borderRadius: "8px",
                        border: "none",
                        background: "#ef4444",
                        color: "#fff",
                        fontWeight: 600,
                        cursor: "pointer",
                        opacity:
                          (selectedOrder?.payment_status || "").toLowerCase() ===
                          "rejected"
                            ? 0.5
                            : 1,
                      }}
                    >
                      Rejected
                    </button>
                  </div>

                  {/* Reason ng pagka-reject ng payment */}
                  {payRejectMode && (
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label>Reason for rejection *</label>
                      <textarea
                        rows={3}
                        autoFocus
                        value={payRejectReason}
                        onChange={(e) => {
                          setPayRejectReason(e.target.value);
                          setPayRejectError("");
                        }}
                        placeholder="e.g. Wrong amount, blurry receipt, reference number not found..."
                        style={{ width: "100%", padding: "8px", borderRadius: "8px", border: `1px solid ${payRejectError ? "#ef4444" : "#e2e8f0"}`, resize: "vertical", marginTop: "6px" }}
                      />
                      {payRejectError && (
                        <span style={{ color: "#ef4444", fontSize: "12px", display: "block", marginTop: "4px" }}>
                          {payRejectError}
                        </span>
                      )}
                      <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                        <button
                          onClick={() => setPayRejectMode(false)}
                          style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontWeight: 600 }}
                        >
                          Back
                        </button>
                        <button
                          onClick={() => updatePaymentStatus("Rejected")}
                          style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", background: "#ef4444", color: "#fff", cursor: "pointer", fontWeight: 600 }}
                        >
                          Confirm Reject
                        </button>
                      </div>
                    </div>
                  )}

                  {(selectedOrder?.payment_status || "").toLowerCase() === "rejected" && !payRejectMode && (
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label>Payment Rejection Reason</label>
                      <p>{selectedOrder?.payment_remarks || "No reason provided."}</p>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="StfOrd-modal-actions">
              <button className="StfOrd-closeAction" onClick={() => setShowView(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* LOGO LIGHTBOX */}
      {logoView && (
        <div
          className="StfOrd-modal-overlay"
          style={{ zIndex: 3000 }}
          onClick={() => setLogoView("")}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              background: "#fff",
              borderRadius: "12px",
              padding: "14px",
              maxWidth: "92vw",
              maxHeight: "92vh",
              textAlign: "center",
            }}
          >
            <button className="StfOrd-close-btn" onClick={() => setLogoView("")}><X size={20} /></button>
            <img
              src={logoView}
              alt="Customer logo"
              style={{ maxWidth: "85vw", maxHeight: "72vh", display: "block", margin: "0 auto", borderRadius: "8px", background: "#f8fafc" }}
            />
            <button
              onClick={() => downloadLogo(logoView)}
              style={{ marginTop: "12px", padding: "10px 20px", borderRadius: "8px", border: "none", background: "#4f46e5", color: "#fff", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <Download size={16} /> Save Logo
            </button>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEdit && (
        <div className="StfOrd-modal-overlay">
          <div className="StfOrd-edit-modal">
            <button className="StfOrd-close-btn" onClick={() => setShowEdit(false)}><X size={20} /></button>
            <h2>Edit Order</h2>
            <div className="StfOrd-form-group"><label>Order ID</label><input value={editData.order_code} disabled /></div>
            <div className="StfOrd-form-group"><label>Customer</label><input value={editData.full_name} onChange={(e) => setEditData({...editData, full_name: e.target.value})} /></div>
            <div className="StfOrd-form-group">
              <label>Order Type</label>
              <select
                value={editData.order_type}
                onChange={(e) => {
                  const type = e.target.value;
                  const method = fixPaymentMethod(type, editData.payment_method);
                  setEditData({
                    ...editData,
                    order_type: type,
                    payment_method: method,
                    payment_status:
                      method.toLowerCase() === "gcash" ? editData.payment_status : editData.payment_status === "Paid" ? "Paid" : "Unpaid",
                  });
                }}
              >
                <option value="Delivery">Delivery</option>
                <option value="Pickup">Pickup</option>
              </select>
            </div>

            {/* ORDER STATUS: para sa Pickup lang (ang Delivery ay delivery status ang sinusunod) */}
            {selectedOrder?.order_type === "Pickup" && editData.order_type === "Pickup" && (
              <div className="StfOrd-form-group">
                <label>Order Status</label>
                <select
                  value={editData.status}
                  disabled={editStatusLocked}
                  onChange={(e) => setEditData({...editData, status: e.target.value})}
                >
                  {(PICKUP_STATUSES.includes(editData.status)
                    ? PICKUP_STATUSES
                    : [editData.status, ...PICKUP_STATUSES]
                  ).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {editStatusLocked && (
                  <small style={{ color: "#94a3b8", display: "block", marginTop: "4px" }}>
                    Status is locked because this order is already {selectedOrder?.status}.
                  </small>
                )}
              </div>
            )}

            {editData.order_type === "Delivery" && (
              <div className="StfOrd-form-group"><label>Date</label><input type="date" value={editData.delivery_date} onChange={(e) => setEditData({...editData, delivery_date: e.target.value})} /></div>
            )}
            <div className="StfOrd-form-group"><label>Quantity</label><input value={editData.quantity} disabled /></div>
            <div className="StfOrd-form-group">
              <label>Borrowed Containers</label>
              <input
                type="number"
                value={editData.borrowed_containers}
                onChange={(e) => setEditData({...editData, borrowed_containers: e.target.value})}
              />
            </div>
            <div className="StfOrd-form-group">
              <label>Container Status</label>
              <select value={editData.container_status} onChange={(e) => setEditData({...editData, container_status: e.target.value})}>
                <option value="Unreturned">Unreturned</option>
                <option value="Returned">Cleared</option>
              </select>
            </div>
            <div className="StfOrd-form-group">
              <label>Payment Method</label>
              <select
                value={editData.payment_method}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    payment_method: e.target.value,
                    payment_status: defaultPaymentStatus(e.target.value),
                  })
                }
              >
                {getPaymentMethodOptions(editData.order_type).map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* PAYMENT STATUS: para sa cash na Pickup lang.
                COD (Delivery) = kusang Paid kapag Delivered; GCash = Paid / Rejected sa View */}
            {isPaymentStatusEditable(editData.order_type, editData.payment_method) && (
              <div className="StfOrd-form-group">
                <label>Payment Status</label>
                <select
                  value={editData.payment_status}
                  onChange={(e) => setEditData({...editData, payment_status: e.target.value})}
                >
                  {getPaymentStatusOptions(editData.payment_method, editData.payment_status).map((s) => (
                    <option key={s} value={s}>{s === "verified" || s === "Verified" ? "Paid" : s}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="StfOrd-modal-actions">
              <button className="StfOrd-closeAction" onClick={() => setShowEdit(false)}>Cancel</button>
              <button className="StfOrd-save-btn" onClick={handleSaveChanges}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {showDelete && (
        <div className="StfOrd-modal-overlay">
          <div className="StfOrd-delete-modal">
            <button className="StfOrddelete-close-btn" onClick={() => setShowDelete(false)}><X size={20} /></button>
            <h1>Delete Order</h1>
            <h6>Are you sure you want to delete this order? This action cannot be undone.</h6>

            <div className="StfOrd-delete-details">
              <div>
                <label>Order ID</label>
                <p>{selectedOrder?.order_code}</p>
              </div>
              <div>
                <label>Customer</label>
                <p>{selectedOrder?.full_name}</p>
              </div>
              <div>
                <label>Item</label>
                <p>{selectedOrder?.item_name}</p>
              </div>
              <div>
                <label>Total Amount</label>
                <p>₱{selectedOrder?.total_amount}</p>
              </div>
              <div>
                <label>Order Status</label>
                <StatusBadge status={selectedOrder?.status} />
              </div>
            </div>

            <div className="StfOrd-delete-actions">
              <button className="StfOrd-cancel-btn" onClick={() => setShowDelete(false)}>No, Cancel</button>
              <button className="StfOrd-confirm-delete" onClick={confirmDelete}>Delete Order</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD MODAL */}
      {showAdd && (
        <div className="StfOrd-modal-overlay">
          <div className="StfOrd-add-modal">
            <button className="StfOrdAdd-close-btn" onClick={() => setShowAdd(false)}><X size={20} /></button>
            <h2>Add Order</h2>

            <div className="StfOrd-form-container">
              <div className="StfOrd-form-group">
                <label>Water Type</label>
                <input value="Purified" disabled style={{ backgroundColor: "#f3f4f6", cursor: "not-allowed" }} />
              </div>

              <div className="StfOrd-form-group">
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

              <div className="StfOrd-form-group">
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

              <div className="StfOrd-form-group">
                <label>Order Type</label>
                <select
                  value={addData.order_type}
                  onChange={(e) =>
                    setAddData({
                      ...addData,
                      order_type: e.target.value,
                      payment_method: fixPaymentMethod(e.target.value, addData.payment_method),
                    })
                  }
                >
                  <option value="Delivery">Delivery</option>
                  <option value="Pickup">Pickup</option>
                </select>
              </div>

              <div className="StfOrd-form-group">
                <label>Borrowed Containers (Qty)</label>
                <input
                  type="number"
                  min="0"
                  disabled={addData.order_type === "Pickup"}
                  value={addData.order_type === "Pickup" ? 0 : addData.borrowed_containers}
                  onChange={(e) => setAddData({ ...addData, borrowed_containers: e.target.value })}
                  style={{ backgroundColor: addData.order_type === "Pickup" ? "#f3f4f6" : "#fff", cursor: addData.order_type === "Pickup" ? "not-allowed" : "pointer" }}
                />
              </div>

              <div className="StfOrd-form-group">
                <label>Container Status</label>
                <select
                  disabled={addData.order_type === "Pickup"}
                  value={addData.order_type === "Pickup" ? "Unreturned" : addData.container_status}
                  onChange={(e) => setAddData({ ...addData, container_status: e.target.value })}
                  style={{ backgroundColor: addData.order_type === "Pickup" ? "#f3f4f6" : "#fff", cursor: addData.order_type === "Pickup" ? "not-allowed" : "pointer" }}
                >
                  <option value="Unreturned">Unreturned</option>
                  <option value="Returned">Cleared</option>
                </select>
              </div>

              <div className="StfOrd-form-group">
                <label>Customer Name</label>
                <input
                  value={addData.full_name}
                  onChange={(e) => setAddData({ ...addData, full_name: e.target.value })}
                />
              </div>

              <div className="StfOrd-form-group">
                <label>Contact Number</label>
                <input
                  value={addData.contact_number}
                  onChange={(e) => setAddData({ ...addData, contact_number: e.target.value })}
                />
              </div>

              <div className="StfOrd-form-group">
                <label>Delivery Date</label>
                <input
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  disabled={addData.order_type === "Pickup"}
                  value={addData.order_type === "Pickup" ? "" : addData.delivery_date}
                  onChange={(e) => setAddData({ ...addData, delivery_date: e.target.value })}
                  style={{ backgroundColor: addData.order_type === "Pickup" ? "#f3f4f6" : "#fff", cursor: addData.order_type === "Pickup" ? "not-allowed" : "pointer" }}
                />
              </div>

              <div className="StfOrd-form-group">
                <label>Delivery Address</label>
                <input
                  disabled={addData.order_type === "Pickup"}
                  value={addData.order_type === "Pickup" ? "N/A (Pickup Order)" : addData.delivery_address}
                  onChange={(e) => setAddData({ ...addData, delivery_address: e.target.value })}
                  style={{ backgroundColor: addData.order_type === "Pickup" ? "#f3f4f6" : "#fff", cursor: addData.order_type === "Pickup" ? "not-allowed" : "pointer" }}
                />
              </div>

              <div className="StfOrd-form-group">
                <label>Payment Method</label>
                <select
                  value={addData.payment_method}
                  onChange={(e) => setAddData({ ...addData, payment_method: e.target.value })}
                >
                  <option value="">Select payment method</option>
                  {getPaymentMethodOptions(addData.order_type).map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div className="StfOrd-form-group">
                <label>Total Amount {addData.order_type === "Delivery" && deliveryFee > 0 ? `(Inc. ₱${deliveryFee} Delivery Fee)` : ""}</label>
                <input value={`₱${totalAmount}`} disabled />
              </div>

              <div className="StfOrd-modal-actions">
                <button className="StfOrd-closeAction" onClick={() => setShowAdd(false)}>Cancel</button>
                <button className="StfOrd-save-btn" onClick={handleAddOrder}>Add Order</button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default StaffOrders;
