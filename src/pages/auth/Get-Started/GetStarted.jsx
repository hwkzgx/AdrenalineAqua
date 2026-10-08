import { useNavigate } from "react-router-dom";
import "./get-started.css";

import AquaLogo from "../../../assets/AquaLogo.png";
import AquaBg from "../../../assets/aqua-bg.png";

export default function GetStarted() {
  const nav = useNavigate();

  return (
    <div
      className="getstarted-container"
      style={{ backgroundImage: `url(${AquaBg})` }}
    >
      {/* Gradient overlay */}
      <div className="gradient-overlay"></div>

      <div className="content glass-card">
        <img src={AquaLogo} alt="Aqua Logo" className="logo floating" />

        <p className="tagline">
          “The water that keeps you going.”
        </p>

        <button onClick={() => nav("/customer/home")} className="start-btn">
          Get Started
        </button>
      </div>
    </div>
  );
}