import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../supabase";
import { CheckCircle, XCircle } from "lucide-react";
import "./register.css";
import AquaLogo from "../../../assets/AquaLogo.png";

const EMAIL_TAKEN_MSG =
  "This email is already registered. Please use another email or log in.";

export default function Register() {
  const nav = useNavigate();

  const role = localStorage.getItem("role");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // ===============================
  // MODAL (pamalit sa alert)
  // ===============================
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
      nav("/accountcreated");
    }
  };

  useEffect(() => {
    return () => clearTimeout(redirectTimer.current);
  }, []);

  // 🔥 ROLE PREFIX
  const getPrefix = (role) => {
    switch (role) {
      case "admin":
        return "ADM";
      case "staff":
        return "STF";
      case "co":
        return "COA";
      case "customer":
        return "CUS";
      default:
        return "USR";
    }
  };

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

  // 🔥 GENERATE USER ID
  const generateUserId = async (role) => {
    const prefix = getPrefix(role);
    const year = new Date().getFullYear();

    const { data, error } = await supabase
      .from("users")
      .select("user_id")
      .like("user_id", `${prefix}${year}%`)
      .order("user_id", { ascending: false })
      .limit(1);

    if (error) {
      console.log(error.message);
      return `${prefix}${year}001`;
    }

    let nextNumber = 1;

    if (data && data.length > 0) {
      const lastId = data[0].user_id; // e.g. CUS2026003
      const lastNumber = parseInt(lastId.slice(-3));
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${year}${String(nextNumber).padStart(3, "0")}`;
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

    // 2. Create account in Supabase Authentication
    const { data, error: authError } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
    });

    console.log("SIGNUP DATA:", data);
    console.log("SIGNUP ERROR:", authError);

    if (authError) {
      setLoading(false);
      if (authError.message?.toLowerCase().includes("already registered")) {
        showModal(EMAIL_TAKEN_MSG, "error");
      } else {
        showModal("Registration failed: " + authError.message, "error");
      }
      return;
    }

    // 3. Walang identities = may account na sa Auth
    if (data?.user?.identities?.length === 0) {
      setLoading(false);
      showModal(EMAIL_TAKEN_MSG, "error");
      return;
    }

    const customId = await generateUserId(role);

    // 4. Save additional user information (walang password dito)
    const { error: userError } = await supabase.from("users").insert([
      {
        user_id: customId,
        name,
        email: cleanEmail,
        address,
        contact_number: contactNumber,
        role,
      },
    ]);

    setLoading(false);

    if (userError) {
      console.log(userError.message);
      console.log("INSERT ERROR:", userError.code, userError.message);
      if (
        userError.code === "23505" ||
        userError.message?.toLowerCase().includes("duplicate key")
      ) {
        showModal(EMAIL_TAKEN_MSG, "error");
      } else {
        showModal("Registration failed: " + userError.message, "error");
      }
      return;
    }

    // SUCCESS: toast muna, tapos lipat sa next page
    setDone(true);
    showModal(
      "Please check your email to verify your account.",
      "success"
    );
    redirectTimer.current = setTimeout(() => nav("/accountcreated"), 3500);
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

      <div className="login-left">
        <div className="overlay"></div>

        <div className="branding">
          <img src={AquaLogo} className="brand-logo" />
          <h1>Welcome!</h1>
          <p>Create your account to get started.</p>
        </div>
      </div>

      <div className="login-right">
        <div className="register-card">

          <h2>Create Account</h2>
          <p className="subtitle">Register as {role}</p>

          <input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            placeholder="Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          <input
            placeholder="Contact Number"
            value={contactNumber}
            onChange={(e) => setContactNumber(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => {
              const value = e.target.value;
              setPassword(value);
              setPasswordError(validatePassword(value));
            }}
          />

          {passwordError && (
            <p style={{ color: "red", fontSize: "12px" }}>
              {passwordError}
            </p>
          )}

          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <button
            className="register-btn"
            onClick={handleRegister}
            disabled={loading || done}
          >
            {loading ? "Creating..." : done ? "Account created ✓" : "Register"}
          </button>

          {/* FOOTER LINK */}
          <p className="signup-text">
            Already have an account?{" "}
            <span onClick={() => nav("/login", { state: { role } })}>
              Login here.
            </span>
          </p>
        </div>
      </div>

    </div>
  );
}
