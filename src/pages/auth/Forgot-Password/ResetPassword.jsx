import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faLock,
  faCircleCheck,
  faCircleXmark,
} from "@fortawesome/free-solid-svg-icons";
import { supabase } from "../../../supabase";
import "./forgot-pass.css";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const userType = location.state?.userType;
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

  const handleSave = async () => {
    if (!password || !confirmPassword) {
      showToast("error", "Please fill in both password fields.");
      return;
    }

    if (password !== confirmPassword) {
      showToast("error", "Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      showToast("error", "Password must be at least 8 characters.");
      return;
    }

    if (!/[A-Z]/.test(password)) {
      showToast("error", "Password must contain at least 1 uppercase letter.");
      return;
    }

    if (!/[a-z]/.test(password)) {
      showToast("error", "Password must contain at least 1 lowercase letter.");
      return;
    }

    if (!/[0-9]/.test(password)) {
      showToast("error", "Password must contain at least 1 number.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      console.log("PASSWORD UPDATE ERROR:", error);
      setSaving(false);
      showToast("error", "Failed to update password: " + error.message);
      return;
    }

    showToast("success", "Password changed successfully!");

    // Maghintay muna sandali para makita ang toast bago lumipat ng page
    navTimer.current = setTimeout(() => {
      navigate("/password-changed", {
        state: { userType },
      });
    }, 1200);
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
              <FontAwesomeIcon icon={faLock} />
            </div>

            <h2>Reset your password</h2>

            <p className="subtitle">
              Create a new password for your account
            </p>

            <label className="forgot-pass-label">
              Enter new password
            </label>

            <input
              className="email-input"
              type="password"
              placeholder="New Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <label className="forgot-pass-label">
              Re-enter your password
            </label>

            <input
              className="email-input"
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            <button
              className="login-btn"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Password"}
            </button>

            <button
              className="back-btn"
              onClick={() =>
                navigate("/verification", {
                  state: { email, userType },
                })
              }
            >
              ← Back
            </button>

          </div>
        </div>
      </div>

    </div>
  );
}
