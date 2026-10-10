import { useNavigate, useLocation } from "react-router-dom";
import "./customer-login.css";
import AquaLogo from "../../assets/AquaLogo.png";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "../../supabase";
import { clearInsightsStorage } from "../../services/aiInsightsService";

export default function CustomerLogin() {
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

    try {
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

      if (authError || !authData?.user) {
        setError(
          authError?.message?.toLowerCase().includes("email not confirmed")
            ? "Please verify your email before logging in."
            : "Invalid email or password."
        );
        return;
      }

      if (!authData.user.email_confirmed_at) {
        await supabase.auth.signOut();
        setError("Please verify your email before logging in.");
        return;
      }

      const { data: customerData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("email", authData.user.email)
        .eq("role", "customer")
        .maybeSingle();

      if (userError || !customerData) {
        await supabase.auth.signOut();
        setError("Customer account not found. Please contact the administrator.");
        return;
      }

      clearInsightsStorage();
      localStorage.setItem("user", JSON.stringify(customerData));

      if (remember) {
        localStorage.setItem("rememberUser", "true");
      } else {
        localStorage.removeItem("rememberUser");
      }

      nav("/customer/dashboard");
    } catch (e) {
      console.error("Customer login error:", e);
      setError("Unable to log in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">

      <div className="cuslogin-left">
        <div className="overlay"></div>

        <div className="branding">
          <img src={AquaLogo} className="brand-logo" />
          <h1>Adrenaline Aqua Water</h1>
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