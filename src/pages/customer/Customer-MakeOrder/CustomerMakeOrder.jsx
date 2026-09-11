import "./customer-makeorder.css";
import CustomerTopbar from "../../../components/NavBar/CustomerTopbar";
import { useState, useEffect } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import {
  ShoppingCart,
  Calendar,
  Phone,
  User,
} from "lucide-react";
import { supabase } from "../../../supabase";

export default function CustomerMakeOrder() {
  const [quantity, setQuantity] = useState(0);
  const [payment, setPayment] = useState("cod");

  // DB STATES
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

  // INVENTORY ITEMS STATE (Dynamic galing sa database)
  const [inventoryItems, setInventoryItems] = useState([]);

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

  // 🔥 FETCH INVENTORY ITEMS MULA SA SUPABASE
  useEffect(() => {
    const fetchInventory = async () => {
      const { data, error } = await supabase
        .from("inventory")
        .select("*");

      if (error) {
        console.log("Error fetching inventory:", error.message);
      } else {
        setInventoryItems(data || []);
      }
    };

    fetchInventory();
  }, []);

  useEffect(() => {
    if (orderType === "Pickup") {
      setAddress("");
      setDate("");
    }
  }, [orderType]);

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

  useEffect(() => {
    let timeout;

    const compute = async () => {
      if (orderType !== "Delivery") {
        setDistance(0);
        setDeliveryFee(0);
        return;
      }

      if (!address || address.trim().length < 5) {
        setDistance(0);
        setDeliveryFee(0);
        return;
      }

      const coords = await geocodeAddress(address);

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
    };

    timeout = setTimeout(compute, 800);

    return () => clearTimeout(timeout);
  }, [address, orderType, size]);

  // PRICE MAP (Idinagdag na rin ang 500ml sakaling meron sa inventory)
  const priceMap = {
    Purified: {
      "Faucet Gallon": 20,
      "Round Gallon": 20,
      "350ml": 7,
      "500ml": 10, 
    },
  };

  const unitPrice = priceMap?.[waterType]?.[size] || 0;
  const logoFee = logoFile ? quantity * 2 : 0;
  const totalAmount =
    (unitPrice * quantity) +
    logoFee +
    (orderType === "Delivery" ? deliveryFee : 0);

  const generateOrderCode = async () => {
    const year = new Date().getFullYear();

    const { data, error } = await supabase
      .from("orders")
      .select("order_code");

    if (error) {
      console.log(error.message);
      return `ORD${year}001`;
    }

    let highest = 0;

    data.forEach((order) => {
      if (
        order.order_code &&
        order.order_code.startsWith(`ORD${year}`)
      ) {
        const number = parseInt(order.order_code.slice(-3));
        if (number > highest) {
          highest = number;
        }
      }
    });

    const nextNumber = highest + 1;
    return `ORD${year}${String(nextNumber).padStart(3, "0")}`;
  };
  
  // UPLOAD LOGO
  const uploadLogo = async () => {
    if (!logoFile) return null;

    const fileName = `${Date.now()}-${logoFile.name}`;

    const { error } = await supabase.storage
      .from("logos")
      .upload(fileName, logoFile);

    if (error) {
      console.log("Upload error:", error.message);
      return null;
    }

    const { data } = supabase.storage
      .from("logos")
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);

    const input = document.getElementById("logoUpload");
    if (input) input.value = "";
  };

  const handlePlaceOrder = async () => {
    const currentUser = JSON.parse(
      localStorage.getItem("user")
    );

    if (!currentUser) {
      showToast("Please login first.", "error");
      return;
    }

    if (
      !waterType ||
      !size ||
      !name ||
      !contact ||
      (orderType === "Delivery" && !address)
    ) {
      showToast("Please complete all required fields.", "error");
      return;
    }

    if (!unitPrice) {
      showToast("Please select valid water type and size.", "error");
      return;
    }

    if (quantity <= 0) {
      showToast("Quantity must be at least 1.", "error");
      return;
    }

    // 🔥 MINIMUM ORDER VALIDATION PARA SA 500ml (Dapat at least 12)
    if (size === "500ml" && quantity < 12) {
      showToast("Minimum order for 500ml is 12.", "error");
      return;
    }

    const orderCode = await generateOrderCode();
    const logoUrl = await uploadLogo();

    // INSERT ORDERS
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
          payment_method: payment,
          status: "Pending",
          total_amount: totalAmount,
        }
      ])
      .select()
      .single();

    if (orderError) {
      console.log(orderError.message);
      showToast(orderError.message, "error");
      return;
    }

    // INSERT DELIVERY SCHEDULE
    if (orderType === "Delivery") {
      const { data: deliveries } = await supabase
        .from("delivery_schedule")
        .select("delivery_id");

      const nextNumber = (deliveries?.length || 0) + 1;
      const deliveryCode = `DEL${new Date().getFullYear()}${String(nextNumber).padStart(3, "0")}`;

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
        showToast("Delivery schedule error occurred", "error");
      }
    }

    // INSERT ORDER ITEMS
    const { error: itemError } = await supabase
      .from("order_items")
      .insert([
        {
          order_id: orderData.order_id,
          item_name: `${waterType} ${size}`,
          water_type: waterType,
          size_variant: size,
          quantity: quantity,
          unit_price: unitPrice,
          customized_logo: logoUrl,
        },
      ]);

    if (itemError) {
      showToast("ORDER ITEMS ERROR: " + itemError.message, "error");
      return;
    }

    // 🔥 AUTOMATIC INVENTORY STOCK DEDUCTION
    const targetItemName = size;
    const { error: rpcError } = await supabase.rpc("deduct_inventory_stock", {
      p_item_name: targetItemName,
      p_qty: Number(quantity)
    });

    if (rpcError) {
      console.log("Inventory deduction error:", rpcError.message);
      showToast("Warning: Order placed, but stock deduction failed.", "error");
      return;
    }

    showToast(`Order placed successfully! ${orderCode}`, "success");
  };

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
          <div className="toast-text">
            {toast.message}
          </div>
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
                  <select onChange={(e) => setSize(e.target.value)} value={size}>
                    <option value="">Select size/variant</option>
                    {inventoryItems.map((item) => (
                      <option key={item.id || item.item_name} value={item.item_name}>
                        {item.item_name} {item.quantity_available !== undefined ? `(Stock: ${item.quantity_available})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="field">
                <label>Quantity</label>
                <div className="qty-box">
                  <button onClick={() => setQuantity(q => Math.max(0, q - 1))}>-</button>
                  <span>{quantity}</span>
                  <button onClick={() => setQuantity(q => q + 1)}>+</button>
                </div>
                {size === "500ml" && (
                  <small style={{ color: "#d9534f", display: "block", marginTop: "5px" }}>
                    ⚠️ Minimum order for 500ml is 12.
                  </small>
                )}
              </div>
            </div>

            <div className="field">
              <label>Order Type</label>
              <select
                value={orderType}
                onChange={(e) => setOrderType(e.target.value)}>
                <option value="">Select order type</option>
                <option value="Delivery">Delivery</option>
                <option value="Pickup">Pickup</option>
              </select>
            </div>

            {/* DELIVERY */}
            <div className="section">
              <h3>2. Delivery Details</h3>

              <div className="grid-2">
                <div className="field">
                  <label>Full Name</label>
                  <div className="input-icon">
                    <User size={16} />
                    <input type="text" placeholder="Enter full name" onChange={(e) => setName(e.target.value)} />
                  </div>
                </div>

                <div className="field">
                  <label>Contact Number</label>
                  <div className="input-icon">
                    <Phone size={16} />
                    <input type="text" placeholder="09XXXXXXXXX" onChange={(e) => setContact(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="field">
                <label>Delivery Date</label>
                <div className="input-icon">
                  <Calendar size={16} />
                  <input
                    type="date"
                    value={date}
                    disabled={orderType === "Pickup"} 
                    placeholder={orderType === "Pickup" ? "Not required for pickup" : ""}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>

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
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            </div>

            {/* PAYMENT */}
            <div className="section">
              <h3>3. Payment Method</h3>

              <div className="payment-options">
                <div className={`payment-card ${payment === "cod" ? "active" : ""}`} onClick={() => setPayment("cod")}>
                  <h4>Cash on Delivery</h4>
                  <p>Pay when you receive.</p>
                </div>

                <div className={`payment-card ${payment === "gcash" ? "active" : ""}`} onClick={() => setPayment("gcash")}>
                  <h4>GCash</h4>
                  <p>Pay via GCash</p>
                </div>
              </div>
            </div>

            {/* LOGO */}
            <div className="section">
              <h3>4. Customized Logo (Optional)</h3>

              <p className="note">
                ⚠️ Optional feature. Additional ₱2 charge applies if you upload a logo.
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
                    onClick={() => document.getElementById("logoUpload").click()}
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
              <button className="place-order" onClick={handlePlaceOrder}>
                Place Order
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
    </>
  );
}