import "./customer-navbar.css";
import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import AquaLogo from "../../assets/AquaLogo.png";

export default function CustomerNavbar() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const closeMenu = () => setOpen(false);

  const goTo = (path) => {
    closeMenu();
    navigate(path);
  };

  // Isara ang menu kapag pinindot ang ESC o lumaki ang screen
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onResize = () => {
      if (window.innerWidth > 900) setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  // Bawal mag-scroll ang page sa likod habang bukas ang drawer
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
    <header className="customer-navbar">

      {/* LOGO */}
      <div className="customer-navbar-logo">
        <img src={AquaLogo} alt="Aqua Logo" />
      </div>

      {/* HAMBURGER (mobile lang) */}
      <button
        type="button"
        className={`navbar-toggle ${open ? "open" : ""}`}
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="customer-menu"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      {/* MENU (links + buttons) */}
      <div
        id="customer-menu"
        className={`navbar-menu ${open ? "open" : ""}`}
      >
        {/* LOGO SA LOOB NG DRAWER (mobile lang) */}
        <div className="navbar-menu-head">
          <img src={AquaLogo} alt="Aqua Logo" />
        </div>

        {/* LINKS */}
        <nav className="navbar-links">
          <NavLink
            to="/customer/home"
            onClick={closeMenu}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            Home
          </NavLink>

          <NavLink
            to="/customer/aboutus"
            onClick={closeMenu}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            About Us
          </NavLink>

          <NavLink
            to="/customer/contacts"
            onClick={closeMenu}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            Contact Us
          </NavLink>
        </nav>

        {/* BUTTONS */}
        <div className="navbar-buttons">
          <button
            type="button"
            className="signin-btn"
            onClick={() => goTo("/customer/customerlogin")}
          >
            Sign In
          </button>

          <button
            type="button"
            className="register-btn"
            onClick={() => goTo("/customer/customer-register")}
          >
            Register
          </button>
        </div>
      </div>

    </header>

    {/* BACKDROP (mobile lang, pindutin para isara) */}
    {open && <div className="navbar-backdrop" onClick={closeMenu}></div>}
    </>
  );
}
