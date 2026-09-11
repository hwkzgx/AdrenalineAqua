import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelopeOpenText } from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from "react-router-dom";
import "./customer-forgotpassword.css";

export default function CustomerForgotPassword() {
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

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

            <button className="login-btn" onClick={() => navigate("/customer/verification")}>Send Email</button>

             <button
      className="back-btn"
      onClick={() => navigate("/customerlogin")}>
     ← Back to Login
    </button>

          </div>
        </div>
      </div>

    </div>
  );
}