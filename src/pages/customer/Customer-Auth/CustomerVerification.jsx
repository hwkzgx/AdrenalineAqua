import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelopeCircleCheck } from "@fortawesome/free-solid-svg-icons";
import "./customer-forgotpassword.css";

export default function CustomerVerification() {
  const [code, setCode] = useState("");
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
              onClick={() => navigate("/customer/reset-password")}
            >
              Verify Code
            </button>

            <button className="back-btn">
              Resend Code
            </button>

          </div>
        </div>
      </div>

    </div>
  );
}