import { useNavigate } from "react-router-dom";
import { useState } from "react";
import "./role-selection.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUserShield,
  faUsers,
  faUserTie,
  faMotorcycle,
} from "@fortawesome/free-solid-svg-icons";

export default function RoleSelection() {
  const nav = useNavigate();
  const [selectedRole, setSelectedRole] = useState(null);

  const roles = [
    { name: "Admin", path: "/login", state: "admin", icon: faUserShield },
    { name: "Co-Associate", path: "/login", state: "co", icon: faUsers },
    { name: "Staff", path: "/login", state: "staff", icon: faUserTie },
    { name: "Rider", path: "/rider/Riderlogin", state: "rider", icon: faMotorcycle },
  ];

  const handleContinue = () => {
    if (!selectedRole) return;

    // 🔥 SAVE ROLE (FIX)
    localStorage.setItem("role", selectedRole.state);

    // NAVIGATE WITHOUT STATE (FIX)
    nav(selectedRole.path);
  };

  return (
    <div className="role-container">
      <div className="role-card">

        <div className="rsheader">
          <span className="back" onClick={() => nav("/customer/customerlogin")}>
            ← Back
          </span>
          <h2>Please select Your Role</h2>
          <p>Choose the type of account you want to access or create.</p>
        </div>

        <div className="grid">
          {roles.map((role) => (
            <div
              key={role.name}
              className={`role-box ${
                selectedRole?.name === role.name ? "active" : ""
              }`}
              onClick={() => setSelectedRole(role)}
            >
              <div className="icon-wrapper">
                <FontAwesomeIcon icon={role.icon} />
              </div>
              <p>{role.name}</p>
            </div>
          ))}
        </div>

        <button
          className="start-btn"
          onClick={handleContinue}
          disabled={!selectedRole}
        >
          Continue
        </button>

      </div>
    </div>
  );
}
