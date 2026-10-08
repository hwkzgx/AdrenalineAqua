import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase";
import "./customer-register.css";
import AquaLogo from "../../assets/AquaLogo.png";

export default function CustomerRegister() {
  const nav = useNavigate();

  const role = "customer";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");
  const [passwordError, setPasswordError] = useState("");

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

  // 🔥 GENERATE CUSTOMER ID
  const generateCustomerId = async () => {
    const year = new Date().getFullYear();

    const { data } = await supabase
      .from("users")
      .select("user_id")
      .like("user_id", `CUS${year}%`)
      .order("user_id", { ascending: false })
      .limit(1);

    let nextNumber = 1;

    if (data && data.length > 0) {
      const lastId = data[0].user_id;
      const lastNumber = parseInt(lastId.slice(-3));
      nextNumber = lastNumber + 1;
    }

    return `CUS${year}${String(nextNumber).padStart(3, "0")}`;
  };

  // 🔥 REGISTER
  const handleRegister = async () => {
    setError("");

    if (
      !name ||
      !email ||
      !address ||
      !contactNumber ||
      !password ||
      !confirmPassword
    ) {
      setError("Please fill all fields");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const passError = validatePassword(password);

    if (passError) {
      setPasswordError(passError);
      return;
    }

   setLoading(true);

// Create customer account in Supabase Authentication
const { data: authData, error: authError } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${window.location.origin}/customer/customerlogin`,
  },
});

if (authError) {
  setLoading(false);
  console.log("AUTH ERROR:", authError);
  setError(authError.message);
  return;
}

console.log("AUTH DATA:", authData);

const customerId = await generateCustomerId();

    const { error } = await supabase.from("users").insert([
      {
        user_id: customerId,
        name,
        email,
        address,
        contact_number: contactNumber,
        password,
        role,
      },
    ]);

    setLoading(false);

    if (error) {
      console.log(error.message);
      setError("Registration failed");
      return;
    }

    nav("/customer/account-created");
  };

  return (
    <div className="login-wrapper">

      {/* LEFT SIDE */}
      <div className="login-left">
        <div className="overlay"></div>

        <div className="cusbranding">
          <img src={AquaLogo} className="cusbrand-logo" alt="Logo" />
          <h1>Welcome!</h1>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="login-right">

        <div className="register-card">

          <h2>Create Account</h2>
          <p className="subtitle">Please register/create a customer account</p>

          {/* NAME */}
          <input
            className="login-input"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          {/* EMAIL */}
          <input
            className="login-input"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {/* ADDRESS */}
          <input
            className="login-input"
            placeholder="Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          {/* CONTACT */}
          <input
            className="login-input"
            placeholder="Contact Number"
            value={contactNumber}
            onChange={(e) => setContactNumber(e.target.value)}
          />

          {/* PASSWORD */}
          <input
            type="password"
            className="login-input"
            placeholder="Password"
            value={password}
            onChange={(e) => {
              const value = e.target.value;
              setPassword(value);
              setPasswordError(validatePassword(value));
            }}
          />

          {/* PASSWORD ERROR (REALTIME) */}
          {passwordError && (
            <p style={{ color: "red", fontSize: "11px", margin: "1px 0" }}>
              {passwordError}
            </p>
          )}

          {/* CONFIRM PASSWORD */}
          <input
            type="password"
            className="login-input"
            placeholder="Confirm Password"
            value={confirmPassword} 
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          {/* GENERAL ERROR */}
          <div style={{ minHeight: "15px", margin: "2px 0" }}>
            {error && (
              <p style={{ color: "red", fontSize: "11px", margin: 0 }}>
                {error}
              </p>
            )}
          </div>

          {/* BUTTON */}
          <button
            className="custregister-btn"
            onClick={handleRegister}
            disabled={loading}
          >
            {loading ? "Creating..." : "Register"}
          </button>

          {/* LOGIN LINK */}
          <p className="custsignup-text">
            Already have an account?{" "}
            <span onClick={() => nav("/customer/customerlogin")}>
              Login here.
            </span>
          </p>

        </div>
      </div>

    </div>
  );
}