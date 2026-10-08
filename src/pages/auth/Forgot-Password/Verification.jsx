import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../../../supabase";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEnvelopeCircleCheck,
  faCircleCheck,
  faCircleXmark,
} from "@fortawesome/free-solid-svg-icons";
import "./forgot-pass.css";

export default function Verification() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email;
  const userType = location.state?.userType;

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

  // 🔥 VERIFY CODE
  const verifyCode = async () => {
    if (!email) {
      showToast("error", "Email not found. Please go back and request a new code.");
      return;
    }

    if (!code.trim()) {
      showToast("error", "Please enter the verification code.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: "email",
    });

    if (error) {
      setLoading(false);
      showToast("error", error.message);
      return;
    }

    showToast("success", "Verified successfully!");

    // Maghintay muna sandali para makita ang toast bago lumipat ng page
    navTimer.current = setTimeout(() => {
      navigate("/reset-password", {
        state: { email, userType },
      });
    }, 1200);
  };

  // 🔥 RESEND CODE
  const resendCode = async () => {
    if (!email) {
      showToast("error", "Email not found. Please go back and request a new code.");
      return;
    }

    setResending(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
    });

    setResending(false);

    if (error) {
      showToast("error", error.message);
      return;
    }

    showToast("success", "Code resent! Please check your email.");
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
          <h1>ADRENALINE AQUA WATER</h1>
          <p>Secure & Smart Access</p>
        </div>
      </div>

      <div className="login-right">
        <div className="login-card">

          <div className="login-body">

            <div className="auth-icon">
              <FontAwesomeIcon icon={faEnvelopeCircleCheck} />
            </div>

            <h2>Check your email</h2>

            <p className="subtitle">
              We sent a 6-digit code to your email
            </p>

            <label className="forgot-pass-label">
              Enter Verification Code
            </label>

            <input
              className="email-input"
              type="text"
              placeholder="6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={6}
            />

            <button
              className="login-btn"
              onClick={verifyCode}
              disabled={loading}
            >
              {loading ? "Verifying..." : "Verify Code"}
            </button>

            <button
              className="back-btn"
              onClick={resendCode}
              disabled={resending}
            >
              {resending ? "Sending..." : "Resend Code"}
            </button>

          </div>
        </div>
      </div>

    </div>
  );
}
