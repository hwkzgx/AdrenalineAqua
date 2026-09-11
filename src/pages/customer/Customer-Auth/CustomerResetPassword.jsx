import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLock } from "@fortawesome/free-solid-svg-icons";
import "./customer-forgotpassword.css";

export default function CustomerResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const navigate = useNavigate();

  const handleSave = () => {
    navigate("/customer/password-changed");
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

           
            <button className="login-btn" onClick={handleSave}>
              Save Password
            </button>

           
            <button
              className="back-btn"
              onClick={() => navigate("/customer/verification")}
            >
              ← Back
            </button>

          </div>
        </div>
      </div>

    </div>
  );
}