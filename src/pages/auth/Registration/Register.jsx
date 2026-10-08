import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../supabase";
import "./register.css";
import AquaLogo from "../../../assets/AquaLogo.png";

export default function Register() {
  const nav = useNavigate();

  const role = localStorage.getItem("role");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔥 ROLE PREFIX
  const getPrefix = (role) => {
    switch (role) {
      case "admin":
        return "ADM";
      case "staff":
        return "STF";
      case "co":
        return "COA";
      case "customer":
        return "CUS";
      default:
        return "USR";
    }
  };

  // 🔥 PASSWORD VALIDATION
  const validatePassword = (pass) => {
    const minLength = pass.length >= 8;
    const hasUpper = /[A-Z]/.test(pass);
    const hasLower = /[a-z]/.test(pass);
    const hasNumber = /[0-9]/.test(pass);

    if (!minLength) return "Password must be at least 8 characters.";
    if (!hasUpper) return "Must contain 1 uppercase letter.";
    if (!hasLower) return "Must contain 1 lowercase letter.";
    if (!hasNumber) return "Must contain 1 number.";

    return "";
  };

  // 🔥 GENERATE USER ID
  const generateUserId = async (role) => {
    const prefix = getPrefix(role);
    const year = new Date().getFullYear();

    const { data, error } = await supabase
      .from("users")
      .select("user_id")
      .like("user_id", `${prefix}${year}%`)
      .order("user_id", { ascending: false })
      .limit(1);

    if (error) {
      console.log(error.message);
      return `${prefix}${year}001`;
    }

    let nextNumber = 1;

    if (data && data.length > 0) {
      const lastId = data[0].user_id; // e.g. CUS2026003
      const lastNumber = parseInt(lastId.slice(-3));
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${year}${String(nextNumber).padStart(3, "0")}`;
  };

  // 🔥 REGISTER
 // 🔥 REGISTER
const handleRegister = async () => {
  if (
    !name ||
    !email ||
    !address ||
    !contactNumber ||
    !password ||
    !confirmPassword
  ) {
    alert("Please fill all fields");
    return;
  }

  if (password !== confirmPassword) {
    alert("Passwords do not match");
    return;
  }

  const passError = validatePassword(password);

  if (passError) {
    alert(passError);
    return;
  }

  setLoading(true);

  // Create account in Supabase Authentication
  const { data, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });
  
  console.log("SIGNUP DATA:", data);
console.log("SIGNUP ERROR:", authError);

  if (authError) {
    setLoading(false);
    alert("Registration failed: " + authError.message);
    return;
  }

  const customId = await generateUserId(role);

  // Save additional user information
  const { error: userError } = await supabase.from("users").insert([
    {
      user_id: customId,
      name,
      email,
      address,
      contact_number: contactNumber,
      password,
      role,
    },
  ]);

  setLoading(false);

  if (userError) {
    console.log(userError.message);
    alert("Registration failed: " + userError.message);
    return;
  }

  alert("Account created! Please check your email to verify your account.");
  nav("/accountcreated");
};

  return (
    <div className="login-wrapper">

      <div className="login-left">
        <div className="overlay"></div>

        <div className="branding">
          <img src={AquaLogo} className="brand-logo" />
          <h1>Welcome!</h1>
          <p>Create your account to get started.</p>
        </div>
      </div>

      <div className="login-right">
        <div className="register-card">

          <h2>Create Account</h2>
          <p className="subtitle">Register as {role}</p>

          <input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            placeholder="Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          <input
            placeholder="Contact Number"
            value={contactNumber}
            onChange={(e) => setContactNumber(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => {
              const value = e.target.value;
              setPassword(value);
              setPasswordError(validatePassword(value));
            }}
          />

          {passwordError && (
            <p style={{ color: "red", fontSize: "12px" }}>
              {passwordError}
            </p>
          )}

          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <button
            className="register-btn"
            onClick={handleRegister}
            disabled={loading}
          >
            {loading ? "Creating..." : "Register"}
          </button>

        {/* FOOTER LINK */}
          <p className="signup-text">
            Already have an account?{" "}
            <span onClick={() => nav("/login", { state: { role } })}>
              Login here.
            </span>
          </p>
        </div>
      </div>

    </div>
  );
}