import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faLock,
  faCircleCheck,
  faCircleXmark,
} from "@fortawesome/free-solid-svg-icons";
import "./customer-forgotpassword.css";
import { supabase } from "../../../supabase";

export default function CustomerResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);
  const [isInvitation, setIsInvitation] = useState(false);

  const navigate = useNavigate();
const location = useLocation();
const email = location.state?.email || "";


  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const navTimer = useRef(null);

  const showToast = (type, message) => {
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }

    setToast({ type, message });

    toastTimer.current = setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  // Prepare the Supabase session for invitation and OTP flows.
  useEffect(() => {
    let active = true;

    const prepareSession = async () => {
      const hashParams = new URLSearchParams(
        window.location.hash.replace(/^#/, "")
      );

      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      const searchParams = new URLSearchParams(
        window.location.search
      );

      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type");

      let sessionError = null;

      // Invitation links containing access and refresh tokens.
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        sessionError = error;
      }
      // Invitation links containing a token hash.
      else if (tokenHash && type === "invite") {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "invite",
        });

        sessionError = error;
      }

      if (!active) return;

      if (sessionError) {
        console.error("Invitation session error:", sessionError);
        setReady(false);
        showToast(
          "error",
          "Your invitation link is invalid or expired."
        );
        return;
      }

      // Existing forgot-password OTP verification also creates
      // a session, so it can continue using this same page.
      const { data, error } = await supabase.auth.getSession();

      console.log("SESSION USER:", data.session?.user?.id);
console.log(
  "INVITED AT:",
  data.session?.user?.invited_at
);
console.log(
  "USER METADATA:",
  data.session?.user?.user_metadata
);

      if (!active) return;

      if (error) {
        console.error("Session error:", error);
      }

      if (data.session) {
  const user = data.session.user;

  const invitedAt = user.invited_at;
  const confirmedAt = user.confirmed_at;

  setIsInvitation(
    Boolean(invitedAt) &&
      (!confirmedAt || invitedAt === confirmedAt)
  );
}

      if (data.session) {
        setReady(true);
      } else {
        setReady(false);
        showToast(
          "error",
          "Please open a valid invitation or verification link first."
        );
      }
    };

    prepareSession();

    return () => {
      active = false;

      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }

      if (navTimer.current) {
        clearTimeout(navTimer.current);
      }
    };
  }, []);

  const handleSave = async () => {
    if (!ready) {
      showToast(
        "error",
        "Please open a valid invitation or verification link first."
      );
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

    if (password.length < 8) {
      showToast(
        "error",
        "Password must be at least 8 characters."
      );
      return;
    }

    if (!/[A-Z]/.test(password)) {
      showToast(
        "error",
        "Password must contain at least 1 uppercase letter."
      );
      return;
    }

    if (!/[a-z]/.test(password)) {
      showToast(
        "error",
        "Password must contain at least 1 lowercase letter."
      );
      return;
    }

    if (!/[0-9]/.test(password)) {
      showToast(
        "error",
        "Password must contain at least 1 number."
      );
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        console.error("PASSWORD UPDATE ERROR:", error);
        showToast(
          "error",
          "Failed to update password: " + error.message
        );
        return;
      }

      showToast("success", "Password changed successfully!");

      navTimer.current = setTimeout(() => {
        navigate("/customer/password-changed");
      }, 1200);
    } catch (error) {
      console.error("PASSWORD UPDATE ERROR:", error);
      showToast(
        "error",
        "Something went wrong while updating your password."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="login-wrapper">
      {/* TOAST */}
      {toast && (
        <div className={`forgotpass-toast ${toast.type}`}>
          <span className="forgotpass-toast-icon">
            <FontAwesomeIcon
              icon={
                toast.type === "success"
                  ? faCircleCheck
                  : faCircleXmark
              }
            />
          </span>

          <span className="forgotpass-toast-text">
            {toast.message}
          </span>
        </div>
      )}

      <div className="login-left">
        <div className="overlay"></div>

        <div className="branding">
          <h1>ADRENALINE AQUA WATER STATION</h1>
          <p>Secure &amp; Smart Access</p>
        </div>
      </div>

      <div className="login-right">
        <div className="login-card">
          <div className="login-body">
            <div className="auth-icon">
              <FontAwesomeIcon icon={faLock} />
            </div>

           <h2>
  {isInvitation
    ? "Set Up Your Password"
    : "Reset Your Password"}
</h2>

<p className="subtitle">
  {isInvitation
    ? "Create a password for your customer account."
    : "Create a new password for your account."}
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
              disabled={!ready || saving}
              autoComplete="new-password"
            />

            <label className="forgot-pass-label">
              Re-enter your password
            </label>

            <input
              className="email-input"
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(e.target.value)
              }
              disabled={!ready || saving}
              autoComplete="new-password"
            />

            <button
              className="login-btn"
              onClick={handleSave}
              disabled={!ready || saving}
            >
              {saving
  ? "Saving..."
  : isInvitation
    ? "Set Password"
    : "Save Password"}
            </button>

            <button
              className="back-btn"
              onClick={() =>
                navigate("/customer/verification", {
                  state: { email },
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