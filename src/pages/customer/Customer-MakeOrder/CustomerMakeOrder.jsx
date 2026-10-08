import "./customer-makeorder.css";
import CustomerTopbar from "../../../components/NavBar/CustomerTopbar";
import { useState, useEffect } from "react";
import {
  CheckCircle,
  XCircle,
  ShoppingCart,
  Calendar,
  Phone,
  User,
} from "lucide-react";
import { supabase } from "../../../supabase";

export default function CustomerMakeOrder() {
  const [quantity, setQuantity] = useState(0);
  const [payment, setPayment] = useState("cod");

  // ===============================
  // DB STATES
  // ===============================
  const [waterType, setWaterType] = useState("Purified");
  const [size, setSize] = useState("");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [date, setDate] = useState("");
  const [address, setAddress] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [orderType, setOrderType] = useState("Delivery");

  const [distance, setDistance] = useState(0);
  const [deliveryFee, setDeliveryFee] = useState(0);

  const [destinationCoords, setDestinationCoords] = useState(null);
  const [isCheckingAddress, setIsCheckingAddress] = useState(false);

  // ===============================
  // GCASH MODAL STATES
  // ===============================
  const [showGcashModal, setShowGcashModal] = useState(false);
  const [gcashReceiptFile, setGcashReceiptFile] = useState(null);
  const [gcashReceiptPreview, setGcashReceiptPreview] = useState(null);

  // ===============================
  // INVENTORY
  // ===============================
  const [inventoryItems, setInventoryItems] = useState([]);

  // ===============================
  // TOAST
  // ===============================
  const [toast, setToast] = useState({
    message: "",
    type: "",
    show: false,
  });

  const showToast = (message, type = "success") => {
    setToast({ message, type, show: true });
    setTimeout(() => {
      setToast({ message: "", type: "", show: false });
    }, 3000);
  };

  // ===============================
  // FETCH INVENTORY
  // ===============================
  useEffect(() => {
    const fetchInventory = async () => {
      const { data, error } = await supabase.from("inventory").select("*");

      if (error) {
        console.log("Error fetching inventory:", error.message);
      } else {
        setInventoryItems(data || []);
      }
    };

    fetchInventory();
  }, []);

  // ===============================
  // RESET DELIVERY FIELDS FOR PICKUP
  // ===============================
  useEffect(() => {
    if (orderType === "Pickup") {
      setAddress("");
      setDate("");
      setDistance(0);
      setDeliveryFee(0);
      setDestinationCoords(null);
    }
  }, [orderType]);

  // ===============================
  // GEOCODE ADDRESS
  // ===============================
  const geocodeAddress = async (addressToSearch) => {
    if (!addressToSearch || addressToSearch.trim().length < 3) {
      return null;
    }

    try {
      const searchAddress = addressToSearch.trim();

      const response = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(
          searchAddress
        )}&limit=1`
      );

      if (!response.ok) {
        console.log("Geocode HTTP error:", response.status);
        return null;
      }

      const data = await response.json();

      if (!data.features || data.features.length === 0) {
        console.log("Address not found:", searchAddress);
        return null;
      }

      const [lng, lat] = data.features[0].geometry.coordinates;

      return {
        lat: Number(lat),
        lng: Number(lng),
      };
    } catch (error) {
      console.log("Geocode error:", error);
      return null;
    }
  };

  // ===============================
  // CALCULATE DISTANCE
  // ===============================
  const getDistanceKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;

    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // ===============================
  // CHECK ADDRESS + DELIVERY FEE
  // ===============================
  useEffect(() => {
    let timeout;

    const compute = async () => {
      if (orderType !== "Delivery") {
        setDistance(0);
        setDeliveryFee(0);
        setDestinationCoords(null);
        return;
      }

      if (!address || address.trim().length < 5) {
        setDistance(0);
        setDeliveryFee(0);
        setDestinationCoords(null);
        return;
      }

      setIsCheckingAddress(true);

      try {
        const coords = await geocodeAddress(address);

        if (!coords) {
          setDestinationCoords(null);
          setDistance(0);
          setDeliveryFee(5);
          return;
        }

        setDestinationCoords(coords);

        const km = getDistanceKm(coords.lat, coords.lng, 14.8294, 120.7354);

        setDistance(km);

        const isHagonoy = address.toLowerCase().includes("hagonoy");

        let fee = 0;

        if ((size === "350ml" || size === "500ml") && isHagonoy) {
          fee = 0;
        } else if (!km || km <= 4) {
          fee = 5;
        } else {
          fee = 10;
        }

        setDeliveryFee(fee);
      } finally {
        setIsCheckingAddress(false);
      }
    };

    timeout = setTimeout(compute, 800);

    return () => clearTimeout(timeout);
  }, [address, orderType, size]);

  // ===============================
  // SELECTED INVENTORY ITEM
  // ===============================
  const selectedInventoryItem = inventoryItems.find(
    (item) => item.item_name === size
  );

  const unitPrice = selectedInventoryItem
    ? Number(selectedInventoryItem.price || 0)
    : 0;

  const logoFee = logoFile ? quantity * 2 : 0;

  const totalAmount =
    unitPrice * quantity +
    logoFee +
    (orderType === "Delivery" ? deliveryFee : 0);

  // ===============================
  // GENERATE ORDER CODE
  // ===============================
  const generateOrderCode = async () => {
    const year = new Date().getFullYear();

    const { data, error } = await supabase.from("orders").select("order_code");

    if (error) {
      console.log(error.message);
      return `ORD${year}001`;
    }

    let highest = 0;

    data.forEach((order) => {
      if (order.order_code && order.order_code.startsWith(`ORD${year}`)) {
        const number = parseInt(order.order_code.slice(-3));
        if (number > highest) {
          highest = number;
        }
      }
    });

    const nextNumber = highest + 1;

    return `ORD${year}${String(nextNumber).padStart(3, "0")}`;
  };

  // ===============================
  // UPLOAD FILE TO SUPABASE (Generic - for logo & receipt)
  // ===============================
  const uploadFileToSupabase = async (file, bucket = "logos") => {
    if (!file) return null;

    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;

    const { data: uploadData, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, { contentType: file.type });

    console.log(`upload result (${bucket}):`, uploadData, error);

    if (error) {
      showToast("Upload error: " + error.message, "error");
      return null;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return data.publicUrl;
  };

  // ===============================
  // REMOVE LOGO
  // ===============================
  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);

    const input = document.getElementById("logoUpload");
    if (input) {
      input.value = "";
    }
  };

  // ===============================
  // PLACE ORDER
  // ===============================
  const handlePlaceOrder = async () => {
    const currentUser = JSON.parse(localStorage.getItem("user"));

    if (!currentUser) {
      showToast("Please login first.", "error");
      return;
    }

    // ===========================
    // REQUIRED FIELDS
    // ===========================
    if (
      !waterType ||
      !size ||
      !name ||
      !contact ||
      (orderType === "Delivery" && (!address || !date))
    ) {
      showToast("Please complete all required fields.", "error");
      return;
    }

    // ===========================
    // FINAL ADDRESS CHECK
    // ===========================
    let finalDestinationCoords = destinationCoords;

    if (orderType === "Delivery") {
      setIsCheckingAddress(true);

      const checkedCoords = await geocodeAddress(address);

      setIsCheckingAddress(false);

      if (!checkedCoords) {
        showToast(
          "Delivery address not found. Please enter a more complete address.",
          "error"
        );
        return;
      }

      finalDestinationCoords = checkedCoords;
      setDestinationCoords(checkedCoords);
    }

    // ===========================
    // PRODUCT VALIDATION
    // ===========================
    if (!unitPrice) {
      showToast("Please select valid water type and size.", "error");
      return;
    }

    if (quantity <= 0) {
      showToast("Quantity must be at least 1.", "error");
      return;
    }

    // ===========================
    // MINIMUM ORDER FOR 500ML
    // ===========================
    if (size === "500ml" && quantity < 12) {
      showToast("Minimum order for 500ml is 12.", "error");
      return;
    }

    // ===========================
    // CHECK STOCK
    // ===========================
    const selectedItem = inventoryItems.find((item) => item.item_name === size);

    if (!selectedItem) {
      showToast("Inventory item not found.", "error");
      return;
    }

    const currentStock = Number(selectedItem.quantity_available);
    const orderQuantity = Number(quantity);

    if (orderQuantity > currentStock) {
      showToast(`Not enough stock. Only ${currentStock} available.`, "error");
      return;
    }

    // ===========================
    // GCASH VALIDATION
    // ===========================
    if (payment === "gcash" && !gcashReceiptFile) {
      setShowGcashModal(true);
      showToast("Please upload your GCash payment receipt.", "error");
      return;
    }

    // ===========================
    // UPLOAD FILES (before creating the order)
    // ===========================
    console.log("logoFile:", logoFile);
    console.log("gcashReceiptFile:", gcashReceiptFile);

    // Upload logo (URL #1)
    let logoUrl = null;
    if (logoFile) {
      logoUrl = await uploadFileToSupabase(logoFile, "logos");
      console.log("logoUrl:", logoUrl);

      if (!logoUrl) {
        showToast("Logo upload failed. Order not placed.", "error");
        return;
      }
    }

    // Upload receipt (URL #2)
    let receiptUrl = null;
    if (payment === "gcash" && gcashReceiptFile) {
      receiptUrl = await uploadFileToSupabase(gcashReceiptFile, "logos");
      console.log("receiptUrl:", receiptUrl);

      if (!receiptUrl) {
        showToast("Receipt upload failed. Order not placed.", "error");
        return;
      }
    }

    // ===========================
    // CREATE ORDER
    // ===========================
    const orderCode = await generateOrderCode();

    const paymentMethod = payment === "gcash" ? "GCash" : "COD";
    const paymentStatus = payment === "gcash" ? "Pending" : "Unpaid";

    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .insert([
        {
          user_id: currentUser.users_id,
          order_code: orderCode,
          order_date: new Date(),
          full_name: name,
          contact_number: contact,
          order_type: orderType,
          delivery_date: orderType === "Delivery" ? date : null,
          delivery_address: orderType === "Delivery" ? address : null,
          destination_lat:
            orderType === "Delivery" ? finalDestinationCoords?.lat : null,
          destination_lng:
            orderType === "Delivery" ? finalDestinationCoords?.lng : null,
          payment_method: paymentMethod,
          payment_status: paymentStatus,
          receipt_url: receiptUrl,
          status: "Pending",
          total_amount: totalAmount,
        },
      ])
      .select()
      .single();

    if (orderError) {
      console.log("Order error:", orderError.message);
      showToast(orderError.message, "error");
      return;
    }

    // ===========================
    // DELIVERY SCHEDULE
    // ===========================
    if (orderType === "Delivery") {
      const { data: deliveries } = await supabase
        .from("delivery_schedule")
        .select("delivery_id");

      const nextNumber = (deliveries?.length || 0) + 1;

      const deliveryCode = `DEL${new Date().getFullYear()}${String(
        nextNumber
      ).padStart(3, "0")}`;

      const { error: deliveryError } = await supabase
        .from("delivery_schedule")
        .insert([
          {
            order_id: orderData.order_id,
            delivery_date: date,
            delivery_status: "Pending",
            delivery_code: deliveryCode,
          },
        ]);

      if (deliveryError) {
        console.log("Delivery schedule error:", deliveryError.message);
        showToast("Delivery schedule error occurred.", "error");
        return;
      }
    }

    // ===========================
    // INSERT ORDER ITEM (kasama logoUrl)
    // ===========================
    const { error: itemError } = await supabase.from("order_items").insert([
      {
        order_id: orderData.order_id,
        item_name: size,
        water_type: waterType,
        size_variant: size,
        quantity: quantity,
        unit_price: unitPrice,
        customized_logo: logoUrl,
      },
    ]);

    if (itemError) {
      console.log("Order item error:", itemError.message);
      showToast("ORDER ITEMS ERROR: " + itemError.message, "error");
      return;
    }

    // ===========================
    // DEDUCT INVENTORY
    // ===========================
    const newStock = currentStock - orderQuantity;

    const { error: inventoryError } = await supabase
      .from("inventory")
      .update({ quantity_available: newStock })
      .eq("inventory_id", selectedItem.inventory_id);

    if (inventoryError) {
      console.log("Inventory deduction error:", inventoryError.message);
      showToast("Order placed, but stock deduction failed.", "error");
      return;
    }

    // ===========================
    // UPDATE INVENTORY UI
    // ===========================
    setInventoryItems((previousItems) =>
      previousItems.map((item) =>
        item.inventory_id === selectedItem.inventory_id
          ? { ...item, quantity_available: newStock }
          : item
      )
    );

    // Reset GCash modal state
    setShowGcashModal(false);
    setGcashReceiptFile(null);
    setGcashReceiptPreview(null);

    showToast(`Order placed successfully! ${orderCode}`, "success");
  };

  // ===============================
  // UI
  // ===============================
  return (
    <>
      <CustomerTopbar />

      {toast.show && (
        <div className={`toast ${toast.type} show`}>
          <div className="toast-icon">
            {toast.type === "success" ? (
              <CheckCircle size={18} />
            ) : (
              <XCircle size={18} />
            )}
          </div>
          <div className="toast-text">{toast.message}</div>
        </div>
      )}

      <div className="make-order-page">
        <div className="make-order-container">
          {/* LEFT SIDE */}
          <div className="make-order-left">
            <div className="makeOrd-header">
              <ShoppingCart className="icon" />
              <div>
                <h2>Make Order</h2>
                <p>Fresh. Pure. Delivered to you.</p>
              </div>
            </div>

            {/* PRODUCT */}
            <div className="section">
              <h3>1. Product Selection</h3>

              <div className="row">
                <div className="field">
                  <label>Water Type</label>
                  <input
                    type="text"
                    value="Purified"
                    readOnly
                    style={{ width: "80px" }}
                  />
                </div>

                <div className="field">
                  <label>Size / Variant</label>
                  <select
                    onChange={(e) => setSize(e.target.value)}
                    value={size}
                  >
                    <option value="">Select size/variant</option>
                    {inventoryItems.map((item) => (
                      <option
                        key={item.id || item.item_name}
                        value={item.item_name}
                      >
                        {item.item_name}{" "}
                        {item.quantity_available !== undefined
                          ? `(Stock: ${item.quantity_available})`
                          : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="field">
                <label>Quantity</label>
                <div className="qty-box">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(0, q - 1))}
                  >
                    -
                  </button>
                  <span>{quantity}</span>
                  <button type="button" onClick={() => setQuantity((q) => q + 1)}>
                    +
                  </button>
                </div>

                {size === "500ml" && (
                  <small
                    style={{
                      color: "#d9534f",
                      display: "block",
                      marginTop: "5px",
                    }}
                  >
                    ⚠️ Minimum order for 500ml is 12.
                  </small>
                )}
              </div>
            </div>

            {/* ORDER TYPE */}
            <div className="field">
              <label>Order Type</label>
              <select
                value={orderType}
                onChange={(e) => setOrderType(e.target.value)}
              >
                <option value="">Select order type</option>
                <option value="Delivery">Delivery</option>
                <option value="Pickup">Pickup</option>
              </select>
            </div>

            {/* DELIVERY DETAILS */}
            <div className="section">
              <h3>2. Delivery Details</h3>

              <div className="grid-2">
                <div className="field">
                  <label>Full Name</label>
                  <div className="input-icon">
                    <User size={16} />
                    <input
                      type="text"
                      placeholder="Enter full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="field">
                  <label>Contact Number</label>
                  <div className="input-icon">
                    <Phone size={16} />
                    <input
                      type="text"
                      placeholder="09XXXXXXXXX"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="field">
                <label>Delivery Date</label>
                <div className="input-icon">
                  <Calendar size={16} />
                  <input
                    type="date"
                    min={new Date().toISOString().split("T")[0]}
                    value={date}
                    disabled={orderType === "Pickup"}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>

              {/* DELIVERY ADDRESS */}
              <div className="field">
                <label>Delivery Address</label>
                <input
                  type="text"
                  value={address}
                  disabled={orderType === "Pickup"}
                  placeholder={
                    orderType === "Pickup"
                      ? "Not required for pickup"
                      : "Enter full delivery address"
                  }
                  onChange={(e) => {
                    setAddress(e.target.value);
                    setDestinationCoords(null);
                  }}
                />

                {orderType === "Delivery" && address.length >= 5 && (
                  <small
                    style={{
                      display: "block",
                      marginTop: "5px",
                      color: destinationCoords ? "#16a34a" : "#64748b",
                    }}
                  >
                    {isCheckingAddress
                      ? "Checking address..."
                      : destinationCoords
                      ? "✓ Address located"
                      : "Enter a complete address"}
                  </small>
                )}
              </div>
            </div>

            {/* PAYMENT */}
            <div className="section">
              <h3>3. Payment Method</h3>

              <div className="payment-options">
                <div
                  className={`payment-card ${payment === "cod" ? "active" : ""}`}
                  onClick={() => setPayment("cod")}
                >
                  <h4>Cash on Delivery</h4>
                  <p>Pay when you receive.</p>
                </div>

                <div
                  className={`payment-card ${payment === "gcash" ? "active" : ""}`}
                  onClick={() => {
                    setPayment("gcash");
                    setShowGcashModal(true);
                  }}
                >
                  <h4>GCash</h4>
                  <p>Pay via GCash</p>
                </div>
              </div>
            </div>

            {/* LOGO */}
            <div className="section">
              <h3>4. Customized Logo (Optional)</h3>

              <p className="note">
                ⚠️ Optional feature. Additional ₱2 charge applies if you upload
                a logo.
              </p>

              <div className="logo-upload-box">
                <input
                  type="file"
                  accept="image/*"
                  id="logoUpload"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    setLogoFile(file);
                    setLogoPreview(URL.createObjectURL(file));
                  }}
                />

                {!logoFile ? (
                  <button
                    type="button"
                    className="upload-btn"
                    onClick={() =>
                      document.getElementById("logoUpload").click()
                    }
                  >
                    Upload Photo
                  </button>
                ) : (
                  <button
                    type="button"
                    className="upload-btn remove"
                    onClick={removeLogo}
                  >
                    Remove Photo
                  </button>
                )}

                {logoPreview && (
                  <div style={{ marginTop: "10px" }}>
                    <img
                      src={logoPreview}
                      alt="Logo Preview"
                      style={{
                        width: "150px",
                        height: "150px",
                        objectFit: "cover",
                        borderRadius: "8px",
                        border: "1px solid #ccc",
                      }}
                    />
                  </div>
                )}

                <p className="upload-hint">Upload PNG, JPG or JPEG file</p>
              </div>
            </div>

            {/* FOOTER */}
            <div className="footer">
              <small>✔ Your information is secured and will not be shared.</small>
              <button
                className="place-order"
                onClick={handlePlaceOrder}
                disabled={isCheckingAddress}
              >
                {isCheckingAddress ? "Checking Address..." : "Place Order"}
              </button>
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="make-order-right">
            <h2>Order Summary</h2>

            <div className="makeOrd-summary-card">
              <div className="item">
                <div className="img-box"></div>
                <div>
                  <h4>{size || "Product Variant"}</h4>
                  <small>{waterType || "Select type"}</small>
                </div>
                <span className="badge">{quantity}</span>
              </div>

              <div className="summary-details">
                <p>Unit Price: ₱{unitPrice}</p>
                <p>Logo Fee: ₱{logoFee}</p>
                <p>Quantity: {quantity}</p>
                <p>Order Type: {orderType}</p>
                <p>Delivery Fee: ₱{deliveryFee}</p>
              </div>

              <div className="total">
                <h3>Total: ₱{totalAmount}</h3>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MANUAL GCASH PAYMENT MODAL */}
      {showGcashModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>GCash Payment Details</h3>
            <p className="modal-desc">
              Please pay to our GCash account and upload a screenshot of your
              receipt to proceed.
            </p>

            {/* GCash Info Box */}
            <div className="gcash-info-box">
              <p>Account Name: Admin Name</p>
              <p className="gcash-number">GCash No: 0912-345-6789</p>
              <p>
                Total Amount: <b>₱{totalAmount}</b>
              </p>
            </div>

            {/* Receipt Upload Field */}
            <div className="receipt-upload-section">
              <label>
                Upload Payment Screenshot <span className="required">*</span>
              </label>

              {!gcashReceiptFile && (
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    setGcashReceiptFile(file);
                    setGcashReceiptPreview(URL.createObjectURL(file));
                  }}
                />
              )}

              {gcashReceiptPreview && (
                <div className="receipt-preview-container">
                  <img src={gcashReceiptPreview} alt="Receipt Preview" />
                  <div>
                    <button
                      type="button"
                      className="remove-photo-btn"
                      onClick={() => {
                        setGcashReceiptFile(null);
                        setGcashReceiptPreview(null);
                      }}
                    >
                      Remove Photo
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-buttons">
              <button
                type="button"
                className="modal-btn cancel-btn"
                onClick={() => {
                  setPayment("cod");
                  setGcashReceiptFile(null);
                  setGcashReceiptPreview(null);
                  setShowGcashModal(false);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="modal-btn confirm-btn"
                onClick={() => {
                  if (!gcashReceiptFile) {
                    showToast("Please upload your receipt first.", "error");
                    return;
                  }
                  setShowGcashModal(false);
                  showToast(
                    "Receipt uploaded. Click Place Order to continue.",
                    "success"
                  );
                }}
              >
                Confirm Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
