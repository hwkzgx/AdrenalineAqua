import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../supabase";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelopeOpenText } from "@fortawesome/free-solid-svg-icons";
import "./forgot-pass.css";

export default function ForgotPass() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const sendOTP = async () => {
    if (!email) {
      alert("Please enter your email");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false, // change to true if allow signup
      },
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("6-digit code sent to your email!");

    // 🔥 IMPORTANT: pass email to verification page
    navigate("/verification", { state: { email } });
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
              <FontAwesomeIcon icon={faEnvelopeOpenText} />
            </div>

            <h2>Forgot your password?</h2>

            <p className="subtitle">
              Enter your email and we’ll send you a 6-digit code
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
              onClick={sendOTP}
              disabled={loading}
            >
              {loading ? "Sending..." : "Send Code"}
            </button>

            <button
              className="back-btn"
              onClick={() => navigate("/login")}
            >
              ← Back to Login
            </button>

          </div>
        </div>
      </div>

    </div>
  );
}