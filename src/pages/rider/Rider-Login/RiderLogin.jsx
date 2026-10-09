import { useNavigate, useLocation } from "react-router-dom";
import "./rider-login.css";
import AquaLogo from "../../../assets/AquaLogo.png";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "../../../supabase";
import { clearInsightsStorage } from "../../../services/aiInsightsService";


export default function RiderLogin() {
  const nav = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

    let riderData = null;

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
          .eq("role", "rider")
          .maybeSingle();

        riderData = userData;
      }
    } catch (e) {
      console.warn("Supabase auth check skipped:", e.message);
    }

    // 2. Fallback to direct database check from public.users table
    if (!riderData) {
      const { data: dbUser, error: dbError } = await supabase
        .from("users")
        .select("*")
        .eq("email", email.trim())
        .eq("password", password.trim())
        .eq("role", "rider")
        .maybeSingle();

      if (dbUser) {
        riderData = dbUser;
      }
    }

    setLoading(false);

    if (!riderData) {
      setError("Invalid email or password.");
      return;
    }

    // Save logged in rider
    clearInsightsStorage();
    localStorage.setItem("user", JSON.stringify(riderData));
    localStorage.setItem("role", "rider");

    if (remember) {
      localStorage.setItem("rememberUser", "true");
    } else {
      localStorage.removeItem("rememberUser");
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

          {/* BACK BUTTON */}
          <div className="login-header">
            <button
              type="button"
              className="riderlogback-btn"
              onClick={() => nav("/roles")}
            >
              ← Back
            </button>
          </div>

          <div className="login-body">

            <h2>Login to your rider account</h2>

            <input
              className="login-input"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <div className="password-input-wrapper">
              <input
                className="login-input"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

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
                onClick={() =>
                  nav("/ForgotPass", {
                    state: { userType: "rider" },
                  })
                }
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

          </div>

        </div>

      </div>
    </div>
  );
}
