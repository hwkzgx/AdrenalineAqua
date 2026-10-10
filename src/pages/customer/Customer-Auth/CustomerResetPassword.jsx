import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../../../supabase";
import "./customer-forgotpassword.css";

export default function CustomerResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const navTimer = useRef(null);

  const showToast = (type, message) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ type, message });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    let active = true;

    const prepareSession = async () => {
      // Supabase can return invitation tokens in the URL hash.
      const hash = new URLSearchParams(
        window.location.hash.replace(/^#/, "")
      );

      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      const tokenHash = new URLSearchParams(window.location.search).get(
        "token_hash"
      );
      const type = new URLSearchParams(window.location.search).get("type");

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          console.error("Invitation session error:", error);
          if (active) showToast("error", "Invitation link is invalid or expired.");
        }
      } else if (tokenHash && type === "invite") {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "invite",
        });

        if (error) {
          console.error("Invitation verification error:", error);
          if (active) showToast("error", "Invitation link is invalid or expired.");
        }
      }

      const { data } = await supabase.auth.getSession();

      if (active) {
        setReady(Boolean(data.session));
        if (!data.session) {
          showToast(
            "error",
            "Open the invitation link from your email again. It may have expired."
          );
        }
      }
    };

    prepareSession();

    return () => {
      active = false;
      if (toastTimer.current) clearTimeout(toastTimer.current);
      if (navTimer.current) clearTimeout(navTimer.current);
    };
  }, []);

  const handleSave = async () => {
    if (!ready) {
      showToast("error", "Please open a valid invitation or verification link first.");
      return;
    }

    if (!password || !confirmPassword) {
      showToast("error", "Please fill in both password fields.");
      return;
    }

    if (password !== confirmPassword) {
      showToast("error", "Passwords do not match.");
      return;
    }

    if (password.length < 8 || !/[A-Z]/.test(password) ||
        !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      showToast(
        "error",
        "Use at least 8 characters with uppercase, lowercase, and a number."
      );
      return;
    }

    setSaving(true);

    const { error } = await supabase.auth.updateUser({ password });

    setSaving(false);

    if (error) {
      showToast("error", "Failed to update password: " + error.message);
      return;
    }

    showToast("success", "Password set successfully!");

    navTimer.current = setTimeout(() => {
      navigate("/customer/password-changed");
    }, 1200);
  };

  return (
    <div className="forgot-password-container">
      <h2>Set Your Password</h2>
      <p>Create a password for your customer account.</p>

      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      )}

      <input
        type="password"
        placeholder="New password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={!ready || saving}
      />

      <input
        type="password"
        placeholder="Confirm password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        disabled={!ready || saving}
      />

      <button onClick={handleSave} disabled={!ready || saving}>
        {saving ? "Saving..." : "Set Password"}
      </button>

      <button onClick={() => navigate("/customer/forgot-password")}>
        Back to Forgot Password
      </button>
    </div>
  );
}