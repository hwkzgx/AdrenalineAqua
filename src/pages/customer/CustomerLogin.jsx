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

    let customerData = null;

    // 1. Try Supabase Auth first
    try {
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

      if (!authError && authData?.user) {
        const { data: userData } = await supabase
          .from("users")
          .select("*")
          .eq("email", email.trim())
          .eq("role", "customer")
          .maybeSingle();

        customerData = userData;
      }
    } catch (e) {
      console.warn("Supabase auth check skipped:", e.message);
    }

    // 2. Fallback to direct database check from public.users table
    if (!customerData) {
      const { data: dbUser, error: dbError } = await supabase
        .from("users")
        .select("*")
        .eq("email", email.trim())
        .eq("password", password.trim())
        .eq("role", "customer")
        .maybeSingle();

      if (dbUser) {
        customerData = dbUser;
      }
    }

    setLoading(false);

    if (!customerData) {
      setError("Invalid email or password.");
      return;
    }

    // Save complete customer information
    localStorage.setItem("user", JSON.stringify(customerData));

    if (remember) {
      localStorage.setItem("rememberUser", "true");
    } else {
      localStorage.removeItem("rememberUser");
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
        <button className="cuslogback-btn" onClick={() => nav('/customer/home', { replace: true })}>
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

            <div className="role-login-container">
              <div className="login-divider">or</div>
              
              <button onClick={() => nav("/roles")} className="role-login-btn">
                Sign in with your role
              </button>
            </div>

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