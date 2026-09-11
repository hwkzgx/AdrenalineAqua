import "./customer-navbar.css";
import { NavLink, useNavigate } from "react-router-dom";
import AquaLogo from "../../assets/AquaLogo.png";

export default function CustomerNavbar() {
  const navigate = useNavigate();

  return (
    <header className="customer-navbar">

      {/* LOGO */}
      <div className="customer-navbar-logo">
        <img src={AquaLogo} alt="Aqua Logo" />
      </div>

      {/* LINKS */}
      <nav className="navbar-links">
        <NavLink
          to="/customer/home"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          Home
        </NavLink>

        <NavLink
          to="/customer/aboutus"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          About Us
        </NavLink>

        <NavLink
          to="/customer/contacts"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          Contact Us
        </NavLink>
      </nav>

      {/* BUTTONS */}
      <div className="navbar-buttons">
        <button
          type="button"
          className="signin-btn" onClick={() => navigate("/customer/customerlogin")}>
          Sign In
        </button>

        <button
          type="button"
          className="register-btn"
          onClick={() => navigate("/customer/customer-register")}
        >
          Register
        </button>
      </div>

    </header>
  );
}