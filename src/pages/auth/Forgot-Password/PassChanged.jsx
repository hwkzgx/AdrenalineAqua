import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck } from "@fortawesome/free-solid-svg-icons";
import "./forgot-pass.css";

export default function PassChanged() {
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

  
            <div className="auth-icon success">
              <FontAwesomeIcon icon={faCircleCheck} />
            </div>

            <h2>Password changed!</h2>

            <p className="subtitle">
              Your password has been updated successfully.
            </p>

            <button
              className="login-btn"
              onClick={() => navigate("/login")}
            >
              Login Now
            </button>

          </div>
        </div>
      </div>

    </div>
  );
}