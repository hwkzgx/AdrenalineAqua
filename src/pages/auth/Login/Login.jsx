import { useNavigate } from "react-router-dom";
import { useState } from "react";
import "./login.css";
import AquaLogo from "../../../assets/AquaLogo.png";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "../../../supabase";
import { clearInsightsStorage } from "../../../services/aiInsightsService";


export default function Login() {
  const nav = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async () => {
    setErrorMessage("");

    if (!email || !password) {
      setErrorMessage("Please enter email and password.");
      return;
    }

    const selectedRole = (localStorage.getItem("role") || "").toLowerCase();

    if (!selectedRole) {
      setErrorMessage("Please select a role first.");
      return;
    }

    setLoading(true);

    let userData = null;

    // 1. Try Supabase Auth first
    try {
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

      if (!authError && authData?.user) {
        const { data } = await supabase
          .from("users")
          .select("*")
          .eq("email", email.trim())
          .eq("role", selectedRole)
          .maybeSingle();

        userData = data;
      }
    } catch (e) {
      console.warn("Supabase auth check skipped:", e.message);
    }

    // 2. Fallback to direct database verification
    if (!userData) {
      const { data: dbUser, error: dbError } = await supabase
        .from("users")
        .select("*")
        .eq("email", email.trim())
        .eq("password", password.trim())
        .maybeSingle();

      if (dbUser) {
        if (dbUser.role?.toLowerCase() !== selectedRole) {
          setLoading(false);
          setErrorMessage(`This account is registered as ${dbUser.role}, not ${selectedRole}.`);
          return;
        }
        userData = dbUser;
      }
    }

    setLoading(false);

    if (!userData) {
      setErrorMessage("Invalid email or password.");
      return;
    }

    // Persist complete user record
    clearInsightsStorage();
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("userRole", userData.role);

    if (userData.role === "staff") {
      nav("/staff/dashboard");
    } else if (userData.role === "co" || userData.role === "co_associate") {
      nav("/co/dashboard");
    } else if (userData.role === "admin") {
      nav("/admin/dashboard");
    } else if (userData.role === "rider") {
      nav("/rider/home");
    } else {
      nav("/customer/dashboard");
    }
  };

  return (
    <div className="login-wrapper">

      {/* LEFT */}
      <div className="login-left">
        <div className="overlay"></div>

        <div className="branding">
          <img src={AquaLogo} className="brand-logo" />
          <h1>Welcome to Adrenaline Aqua Water</h1>
          <p>Your trusted partner for clean water solutions</p>
        </div>
      </div>

      {/* RIGHT */}
      <div className="login-right">

        <div className="login-card">

          {/* BACK */}
          <div className="login-header">
            <button className="logback-btn" onClick={() => nav("/roles")}>
              ← Back
            </button>
          </div>

          <div className="login-body">
            <h2>Login to your account</h2>

            {/* EMAIL */}
            <input
              className="login-input"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            {/* PASSWORD */}
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

            {errorMessage && (
  <div className="login-error">
    <span className="error-icon">✕</span>
    <span>{errorMessage}</span>
  </div>
)}

            {/* OPTIONS */}
            <div className="login-options">
              <label className="remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={() => setRemember(!remember)}
                />
                Remember me
              </label>

              <span className="forgot" onClick={() => nav("/ForgotPass")}>
                Forgot Password?
              </span>
            </div>

            {/* BUTTON */}
            <button
              className="login-btn"
              onClick={handleLogin}
              disabled={loading || !email || !password}
            >
              {loading ? "Logging in..." : "Login"}
            </button>

            {/* REGISTER */}
            <p className="signup-text">
              Don’t have an account?{" "}
              <span onClick={() => nav("/register")}>
                Create Account
              </span>
            </p>

          </div>

        </div>
      </div>
    </div>
  );
}