import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEnvelopeCircleCheck,
  faCircleCheck,
  faCircleXmark,
} from "@fortawesome/free-solid-svg-icons";
import { supabase } from "../../../supabase";
import "./customer-forgotpassword.css";

export default function CustomerVerification() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email;

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

  const handleVerifyOTP = async () => {
    if (!email) {
      showToast("error", "Email not found. Please request a new OTP.");
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
      console.log("VERIFY OTP ERROR:", error);
      setLoading(false);
      showToast("error", "Invalid or expired verification code.");
      return;
    }

    showToast("success", "Verified successfully!");

    // Maghintay muna sandali para makita ang toast bago lumipat ng page
    navTimer.current = setTimeout(() => {
      navigate("/customer/reset-password", {
        state: { email },
      });
    }, 1200);
  };

  const handleResendOTP = async () => {
    if (!email) {
      showToast("error", "Email not found. Please go back and try again.");
      return;
    }

    setResending(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
      },
    });

    setResending(false);

    if (error) {
      console.log("RESEND OTP ERROR:", error);
      showToast("error", error.message);
      return;
    }

    showToast("success", "A new verification code has been sent to your email.");
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
              <FontAwesomeIcon icon={faEnvelopeCircleCheck} />
            </div>

            <h2>Check your email</h2>

            <p className="subtitle">
              We sent a verification code to your email
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
            />

            <button
              className="login-btn"
              onClick={handleVerifyOTP}
              disabled={loading}
            >
              {loading ? "Verifying..." : "Verify Code"}
            </button>

            <button
              className="back-btn"
              onClick={handleResendOTP}
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
