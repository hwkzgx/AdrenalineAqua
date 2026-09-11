import { useNavigate, useLocation } from "react-router-dom";
import "./rider-login.css";
import AquaLogo from "../../../assets/AquaLogo.png";
import { useState } from "react";
import { supabase } from "../../../supabase";

export default function RiderLogin() {
  const nav = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");

    if (!email || !password) {
      setError("Please fill all fields");
      return;
    }

    setLoading(true);

    // 🔥 CHECK USER IN SUPABASE
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .eq("password", password)
      .eq("role", "rider")
      .single();

    setLoading(false);

    if (error || !data) {
      setError("Invalid email or password. Maybe this user is not registered as rider");
      return;
    }

    // save logged in user
    localStorage.setItem("user", JSON.stringify(data));

    if (remember) {
      localStorage.setItem("rememberUser", "true");
    }

    nav("/rider/home");
  };

  return (
    <div className="login-wrapper">

      <div className="riderlogin-left">
        <div className="overlay"></div>

        <div className="branding">
          <img src={AquaLogo} className="brand-logo" />
          <h1>Welcome, Rider</h1>
          <p>Deliver with Adrenaline Aqua Water</p>
        </div>
      </div>

      <div className="login-right">

        <div className="login-card">
          <div className="login-body">

            <h2>Login to your rider account</h2>

            <input
              className="login-input"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              className="login-input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <div className="login-options">

              <label className="remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={() => setRemember(!remember)}
                />
                Remember me
              </label>
            </div>

            {error && (
              <p style={{ color: "red", fontSize: "12px" }}>
                {error}
              </p>
            )}

            <button
              className="login-btn"
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </button>

          </div>

        </div>

      </div>
    </div>
  );
}