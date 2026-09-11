import { useNavigate, useLocation } from "react-router-dom";
import "./customer-login.css";
import AquaLogo from "../../assets/AquaLogo.png";
import { useState } from "react";
import { supabase } from "../../supabase";

export default function CustomerLogin() {
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
      .eq("role", "customer")
      .single();

    setLoading(false);

   if (error || !data) {
  setError("Invalid email or password. Maybe this user is not registered as customer");
  return;
}

// save logged in user
localStorage.setItem("user", JSON.stringify(data));

if (remember) {
  localStorage.setItem("rememberUser", "true");
}

nav("/customer/dashboard");
  };

  return (
    <div className="login-wrapper">

      <div className="cuslogin-left">
        <div className="overlay"></div>

        <div className="branding">
          <img src={AquaLogo} className="brand-logo" />
          <h1>Welcome to Adrenaline Aqua Water</h1>
          <p>Your trusted partner for clean water solutions</p>
        </div>
      </div>

      <div className="login-right">

        <div className="login-card">

          <div className="login-header">
            <button className="cuslogback-btn" onClick={() => nav(-1)}>
              ← Back
            </button>
          </div>

          <div className="login-body">

            <h2>Login to your account</h2>

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

              <span
                className="forgot"
                onClick={() => nav("/customer/forgot-password")}
              >
                Forgot Password?
              </span>

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

            <p className="signup-text">
              Don’t have an account?{" "}
              <span onClick={() => nav("/customer/customer-register")}>
                Create Account
              </span>
            </p>

          </div>

        </div>

      </div>
    </div>
  );
}