import { useNavigate } from "react-router-dom";
import { useState } from "react";
import "./login.css";
import AquaLogo from "../../../assets/AquaLogo.png";
import { supabase } from "../../../supabase";

export default function Login() {
  const nav = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

const handleLogin = async () => {
  setErrorMessage("");

  if (!email || !password) {
    setErrorMessage("Please enter email and password.");
    return;
  }

  const selectedRole = localStorage.getItem("role");

  if (!selectedRole) {
    setErrorMessage("Please select a role first.");
    return;
  }

  setLoading(true);

  // STAFF - SUPABASE AUTH
if (
  selectedRole === "staff" ||
  selectedRole === "co" ||
  selectedRole === "admin"
) {
    const { error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError) {
      setLoading(false);
      setErrorMessage("Invalid email or password.");
      return;
    }

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .eq("role", selectedRole)
      .single();

    if (userError || !userData) {
      await supabase.auth.signOut();
      setLoading(false);
      setErrorMessage("This account is not registered as staff.");
      return;
    }

    localStorage.setItem(
      "user",
      JSON.stringify({
        name: userData.name,
        role: userData.role,
        email: userData.email,
      })
    );

  setLoading(false);

if (selectedRole === "staff") {
  nav("/staff/dashboard");
} else if (selectedRole === "co") {
  nav("/co/dashboard");
} else if (selectedRole === "admin") {
  nav("/admin/dashboard");
}

return;
  }

  // ADMIN + CO - OLD LOGIN MUNA
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .eq("password", password)
    .single();

  setLoading(false);

  if (error || !data) {
    setErrorMessage("Account not found or incorrect credentials.");
    return;
  }

  if (data.role !== selectedRole) {
    setErrorMessage(
      `This account is not registered as ${selectedRole}.`
    );
    return;
  }

  localStorage.setItem(
    "user",
    JSON.stringify({
      name: data.name,
      role: data.role,
      email: data.email,
    })
  );

  if (data.role === "admin") nav("/admin/dashboard");
  else if (data.role === "co") nav("/co/dashboard");
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
            <input
              className="login-input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

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