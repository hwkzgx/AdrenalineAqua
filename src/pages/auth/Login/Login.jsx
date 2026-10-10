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

    try {
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

      if (authError || !authData?.user) {
        setErrorMessage(
          authError?.message?.toLowerCase().includes("email not confirmed")
            ? "Please verify your email before logging in."
            : "Invalid email or password."
        );
        return;
      }

      if (!authData.user.email_confirmed_at) {
        await supabase.auth.signOut();
        setErrorMessage("Please verify your email before logging in.");
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("email", authData.user.email)
        .maybeSingle();

      if (userError || !userData) {
        await supabase.auth.signOut();
        setErrorMessage("Account record not found. Please contact the administrator.");
        return;
      }

      const actualRole = userData.role?.toLowerCase();

      if (actualRole !== selectedRole) {
        await supabase.auth.signOut();
        setErrorMessage(
          `This account is registered as ${userData.role}, not ${selectedRole}.`
        );
        return;
      }

      clearInsightsStorage();
      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("userRole", userData.role);

      if (remember) {
        localStorage.setItem("rememberUser", "true");
      } else {
        localStorage.removeItem("rememberUser");
      }

      if (actualRole === "staff") {
        nav("/staff/dashboard");
      } else if (actualRole === "co" || actualRole === "co_associate") {
        nav("/co/dashboard");
      } else if (actualRole === "admin") {
        nav("/admin/dashboard");
      } else if (actualRole === "rider") {
        nav("/rider/home");
      } else {
        nav("/customer/dashboard");
      }
    } catch (e) {
      console.error("Login error:", e);
      setErrorMessage("Unable to log in. Please try again.");
    } finally {
      setLoading(false);
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