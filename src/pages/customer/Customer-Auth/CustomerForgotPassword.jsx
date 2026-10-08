import { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEnvelopeOpenText,
  faCircleCheck,
  faCircleXmark,
} from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from "react-router-dom";
import "./customer-forgotpassword.css";
import { supabase } from "../../../supabase";

export default function CustomerForgotPassword() {
  const [email, setEmail] = useState("");
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // TOAST
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const navTimer = useRef(null);

  const showToast = (type, message) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);

    setToast({ type, message });

    toastTimer.current = setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      if (navTimer.current) clearTimeout(navTimer.current);
    };
  }, []);

  const handleSendOTP = async () => {
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      showToast("error", "Please enter your email.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        shouldCreateUser: false,
      },
    });

    if (error) {
      console.log("OTP ERROR:", error);
      setLoading(false);
      showToast("error", error.message);
      return;
    }

    showToast("success", "6-digit code sent to your email!");

    // Maghintay muna sandali para makita ang toast bago lumipat ng page
    navTimer.current = setTimeout(() => {
      navigate("/customer/verification", {
        state: { email: cleanEmail },
      });
    }, 1500);
  };

  return (
    <div className="login-wrapper">

      {/* TOAST */}
      {toast && (
        <div className={`forgotpass-toast ${toast.type}`}>
          <span className="forgotpass-toast-icon">
            <FontAwesomeIcon
              icon={toast.type === "success" ? faCircleCheck : faCircleXmark}
            />
          </span>
          <span className="forgotpass-toast-text">{toast.message}</span>
        </div>
      )}

      <div className="login-left">
        <div className="overlay"></div>
        <div className="branding">
          <h1>AQUA SYSTEM</h1>
          <p>Secure & Smart Access</p>
        </div>
      </div>

      <div className="login-right">
        <div className="login-card">

          <div className="login-body">

            <div className="auth-icon">
              <FontAwesomeIcon icon={faEnvelopeOpenText} />
            </div>

            <h2>Forgot your password?</h2>
            <p className="subtitle">
              Enter your email so that we can send your password reset link
            </p>

            <label className="forgot-pass-label">Email Address</label>
            <input
              className="email-input"
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <button
              className="login-btn"
              onClick={handleSendOTP}
              disabled={loading}
            >
              {loading ? "Sending..." : "Send OTP"}
            </button>

            <button
              className="back-btn"
              onClick={() => navigate("/customer/customerlogin")}
            >
              ← Back to Login
            </button>

          </div>
        </div>
      </div>

    </div>
  );
}
