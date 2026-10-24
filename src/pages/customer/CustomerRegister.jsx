import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase";
import { CheckCircle, XCircle } from "lucide-react";
import "./customer-register.css";
import AquaLogo from "../../assets/AquaLogo.png";

const EMAIL_TAKEN_MSG =
  "This email is already registered. Please use another email or log in.";

export default function CustomerRegister() {
  const nav = useNavigate();

  const role = "customer";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const [done, setDone] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // MODAL (pamalit sa alert / inline error)
  const [modal, setModal] = useState({ show: false, type: "success", title: "", message: "" });
  const redirectTimer = useRef(null);

  const showModal = (message, type = "success", title) => {
    setModal({
      show: true,
      type,
      title: title || (type === "success" ? "Account Created!" : "Oops!"),
      message,
    });
  };

  const closeModal = () => {
    setModal((m) => ({ ...m, show: false }));
    if (modal.type === "success") {
      clearTimeout(redirectTimer.current);
      nav("/customer/account-created");
    }
  };

  useEffect(() => {
    return () => clearTimeout(redirectTimer.current);
  }, []);

  // 🔥 PASSWORD VALIDATION
  const validatePassword = (pass) => {
    const minLength = pass.length >= 8;
    const hasUpper = /[A-Z]/.test(pass);
    const hasLower = /[a-z]/.test(pass);
    const hasNumber = /[0-9]/.test(pass);

    if (!minLength) return "Password must be at least 8 characters.";
    if (!hasUpper) return "Must contain 1 uppercase letter.";
    if (!hasLower) return "Must contain 1 lowercase letter.";
    if (!hasNumber) return "Must contain 1 number.";

    return "";
  };

  // 🔥 GENERATE CUSTOMER ID
  const generateCustomerId = async () => {
    const year = new Date().getFullYear();

    const { data } = await supabase
      .from("users")
      .select("user_id")
      .like("user_id", `CUS${year}%`)
      .order("user_id", { ascending: false })
      .limit(1);

    let nextNumber = 1;

    if (data && data.length > 0) {
      const lastId = data[0].user_id;
      const lastNumber = parseInt(lastId.slice(-3));
      nextNumber = lastNumber + 1;
    }

    return `CUS${year}${String(nextNumber).padStart(3, "0")}`;
  };

  // 🔥 REGISTER
  const handleRegister = async () => {
    if (
      !name ||
      !email ||
      !address ||
      !contactNumber ||
      !password ||
      !confirmPassword
    ) {
      showModal("Please fill all fields.", "error");
      return;
    }

    if (password !== confirmPassword) {
      showModal("Passwords do not match.", "error");
      return;
    }

    const passError = validatePassword(password);

    if (passError) {
      setPasswordError(passError);
      showModal(passError, "error");
      return;
    }

    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    // 1. I-check muna kung may ganitong email na sa users table
    const { data: existing } = await supabase
      .from("users")
      .select("email")
      .ilike("email", cleanEmail)
      .limit(1);

    if (existing && existing.length > 0) {
      setLoading(false);
      showModal(EMAIL_TAKEN_MSG, "error");
      return;
    }

    // 2. Create customer account in Supabase Authentication
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/customer/customerlogin`,
      },
    });

    if (authError) {
      setLoading(false);
      console.log("AUTH ERROR:", authError);
      if (authError.message?.toLowerCase().includes("already registered")) {
        showModal(EMAIL_TAKEN_MSG, "error");
      } else {
        showModal("Registration failed: " + authError.message, "error");
      }
      return;
    }

    console.log("AUTH DATA:", authData);

    // 3. Walang identities = may account na sa Auth
    if (authData?.user?.identities?.length === 0) {
      setLoading(false);
      showModal(EMAIL_TAKEN_MSG, "error");
      return;
    }

    const customerId = await generateCustomerId();

    // 4. Save additional user information (walang password dito)
    const { error } = await supabase.from("users").insert([
      {
        user_id: customerId,
        name,
        email: cleanEmail,
        address,
        contact_number: contactNumber,
        role,
      },
    ]);

    setLoading(false);

    if (error) {
      console.log(error.message);
      console.log("INSERT ERROR:", error.code, error.message);
      if (
        error.code === "23505" ||
        error.message?.toLowerCase().includes("duplicate key")
      ) {
        showModal(EMAIL_TAKEN_MSG, "error");
      } else {
        showModal("Registration failed: " + error.message, "error");
      }
      return;
    }

    // SUCCESS: modal muna, tapos lipat sa next page
    setDone(true);
    showModal("Please check your email to verify your account.", "success");
    redirectTimer.current = setTimeout(
      () => nav("/customer/account-created"),
      3500
    );
  };

  return (
    <div className="login-wrapper">

      {/* MODAL */}
      {modal.show && (
        <div className="reg-modal-overlay" onClick={closeModal}>
          <div
            className={`reg-modal ${modal.type}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="reg-modal-icon">
              {modal.type === "success" ? <CheckCircle size={44} /> : <XCircle size={44} />}
            </div>
            <h3>{modal.title}</h3>
            <p>{modal.message}</p>
            <button className="reg-modal-btn" onClick={closeModal}>
              {modal.type === "success" ? "Continue" : "Okay"}
            </button>
            {modal.type === "success" && <div className="reg-modal-bar" />}
          </div>
        </div>
      )}

      {/* LEFT SIDE */}
      <div className="login-left">
        <div className="overlay"></div>

        <div className="cusbranding">
          <img src={AquaLogo} className="cusbrand-logo" alt="Logo" />
          <h1>Welcome!</h1>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="login-right">

        <div className="register-card">

          <h2>Create Account</h2>
          <p className="subtitle">Please register/create a customer account</p>

          {/* NAME */}
          <input
            className="login-input"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          {/* EMAIL */}
          <input
            className="login-input"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {/* ADDRESS */}
          <input
            className="login-input"
            placeholder="Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          {/* CONTACT */}
          <input
            className="login-input"
            placeholder="Contact Number"
            value={contactNumber}
            onChange={(e) => setContactNumber(e.target.value)}
          />

          {/* PASSWORD */}
          <input
            type="password"
            className="login-input"
            placeholder="Password"
            value={password}
            onChange={(e) => {
              const value = e.target.value;
              setPassword(value);
              setPasswordError(validatePassword(value));
            }}
          />

          {/* PASSWORD ERROR (REALTIME) */}
          {passwordError && (
            <p style={{ color: "red", fontSize: "11px", margin: "1px 0" }}>
              {passwordError}
            </p>
          )}

          {/* CONFIRM PASSWORD */}
          <input
            type="password"
            className="login-input"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <div style={{ minHeight: "15px", margin: "2px 0" }} />

          {/* BUTTON */}
          <button
            className="custregister-btn"
            onClick={handleRegister}
            disabled={loading || done}
          >
            {loading ? "Creating..." : done ? "Account created ✓" : "Register"}
          </button>

          {/* LOGIN LINK */}
          <p className="custsignup-text">
            Already have an account?{" "}
            <span onClick={() => nav("/customer/customerlogin")}>
              Login here.
            </span>
          </p>

        </div>
      </div>

    </div>
  );
}
