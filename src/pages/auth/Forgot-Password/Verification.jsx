import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../../../supabase";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelopeCircleCheck } from "@fortawesome/free-solid-svg-icons";
import "./forgot-pass.css";

export default function Verification() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email;

  // 🔥 VERIFY CODE
  const verifyCode = async () => {
    if (!code) {
      alert("Enter verification code");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Verified successfully!");
    navigate("/reset-password", { state: { email } });
  };

  // 🔥 RESEND CODE
  const resendCode = async () => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert("Code resent!");
  };

  return (
    <div className="login-wrapper">

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
            >
              Resend Code
            </button>

          </div>
        </div>
      </div>

    </div>
  );
}