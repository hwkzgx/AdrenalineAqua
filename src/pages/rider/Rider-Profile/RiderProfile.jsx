import { useState, useEffect, useRef } from "react";
import "./rider-profile.css";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../supabase";
import {
  ArrowLeft,
  Camera,
  Save,
  CheckCircle2,
  XCircle,
} from "lucide-react";

const DEFAULT_PICTURE = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

export default function RiderProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // TOAST
  const [toast, setToast] = useState(null); // { message, type: "success" | "error" }
  const toastTimer = useRef(null);

  const showToast = (message, type = "success") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 30000);
  };

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  // Dito itatago kung anong column/value ang ginamit ng row sa users table
  const userKey = useRef(null);

  const [originalRider, setOriginalRider] = useState({
    name: "",
    email: "",
    contact: "",
    address: "",
    role: "Delivery Rider",
    profile_picture: DEFAULT_PICTURE,
  });

  const [rider, setRider] = useState({
    name: "",
    email: "",
    contact: "",
    address: "",
    role: "Delivery Rider",
    profile_picture: DEFAULT_PICTURE,
  });

  useEffect(() => {
    fetchRiderProfile();
  }, []);

  const fetchRiderProfile = async () => {
    try {
      // Kunin ang user object mula sa localStorage (kung saan naka-save ang nag-login)
      const storedUser = localStorage.getItem("user");
      if (!storedUser) {
        alert("No rider logged in. Please log in again.");
        navigate("/rider/riderlogin");
        return;
      }

      const parsedUser = JSON.parse(storedUser);
      const userId = parsedUser?.user_id || parsedUser?.id;
      const userEmail = parsedUser?.email;

      // 1. Hanapin sa `users` table gamit ang user_id o email
      let query = supabase.from("users").select("*");

      if (userId) {
        query = query.eq("user_id", userId); // Palitan ng "id" kung id ang column name sa users table mo
      } else if (userEmail) {
        query = query.eq("email", userEmail);
      } else {
        showToast("Invalid user session data.", "error");
        setLoading(false);
        return;
      }

      const { data, error } = await query.maybeSingle();

      if (error || !data) {
        console.log("Error fetching profile from users table:", error?.message);
        showToast("Hindi makita ang profile ng rider na ito sa database.", "error");
        setLoading(false);
        return;
      }

      // Tandaan kung anong key column ang meron ang row na ito (para sa Save)
      const keyCol = ["users_id", "user_id", "id"].find(
        (c) => data[c] !== undefined && data[c] !== null
      );
      userKey.current = keyCol ? { col: keyCol, value: data[keyCol] } : null;

      // I-load ang data mula sa `users` table
      const fetchedData = {
        name: data.name || data.full_name || "",
        email: data.email || "",
        contact: data.contact_number || data.phone || data.contact || "",
        address: data.address || "",
        role: data.role || "Delivery Rider",
        profile_picture: data.profile_picture || DEFAULT_PICTURE,
      };

      setOriginalRider(fetchedData);
      setRider(fetchedData);
    } catch (err) {
      console.error("Unexpected error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setRider((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSaving(true);
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("profiles")
      .upload(filePath, file);

    if (uploadError) {
      console.log("Upload error:", uploadError.message);
      showToast("Failed to upload image.", "error");
      setSaving(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("profiles")
      .getPublicUrl(filePath);

    setRider((prev) => ({ ...prev, profile_picture: publicUrlData.publicUrl }));
    setSaving(false);
    showToast("Photo uploaded. Tap Save Changes to apply.");
  };

  const hasChanges =
    rider.name !== originalRider.name ||
    rider.email !== originalRider.email ||
    rider.contact !== originalRider.contact ||
    rider.address !== originalRider.address ||
    rider.profile_picture !== originalRider.profile_picture;

  const handleSave = async () => {
    if (!hasChanges) return;

    if (!userKey.current) {
      showToast("Hindi mahanap ang account na i-uupdate.", "error");
      return;
    }

    setSaving(true);

    // I-update sa `users` table gamit ang mismong key ng row na nakuha
    const { data: updatedRows, error } = await supabase
      .from("users")
      .update({
        name: rider.name,
        email: rider.email,
        contact_number: rider.contact,
        address: rider.address,
        profile_picture: rider.profile_picture,
      })
      .eq(userKey.current.col, userKey.current.value)
      .select();

    setSaving(false);

    if (error) {
      console.log("Error updating profile:", error.message);
      showToast("Failed to save changes.", "error");
    } else if (!updatedRows || updatedRows.length === 0) {
      // Walang na-update na row (maling ID, o hinaharangan ng database policy)
      showToast("Walang na-save. Subukan ulit.", "error");
    } else {
      showToast("Profile updated successfully!");
      setOriginalRider(rider);
    }
  };

  if (loading) {
    return (
      <p style={{ padding: "20px", textAlign: "center" }}>
        Loading profile from database...
      </p>
    );
  }

  return (
    <div className="riderprofile-container">
      {/* TOAST */}
      {toast && (
        <div className={`toast toast-${toast.type}`} role="status">
          {toast.type === "success" ? (
            <CheckCircle2 size={20} />
          ) : (
            <XCircle size={20} />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      <div className="header">
        <div className="header-left">
          <ArrowLeft
            size={40}
            className="rpfpback-btn"
            onClick={() => navigate(-1)}
          />
          <h2>Profile</h2>
        </div>
      </div>

      <div className="profile-section">
        <div
          className="image-upload-wrapper"
          style={{ position: "relative", cursor: "pointer" }}
        >
          <img
            src={rider.profile_picture || DEFAULT_PICTURE}
            alt="Profile"
            className="profile-image"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = DEFAULT_PICTURE;
            }}
          />
          <label htmlFor="pfp-input" className="camera-badge">
            <Camera size={18} />
          </label>
          <input
            id="pfp-input"
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleImageChange}
          />
        </div>

        <h1>{rider.name}</h1>

        <div className="status">
          <span className="dot"></span>
          <span>Online</span>
        </div>
      </div>

      <div className="details-section">
        <div className="detail-row">
          <h4>Fullname</h4>
          <input
            type="text"
            name="name"
            value={rider.name}
            onChange={handleChange}
            className="profile-input"
          />
        </div>

        <div className="detail-row">
          <h4>Email</h4>
          <input
            type="email"
            name="email"
            value={rider.email}
            onChange={handleChange}
            className="profile-input"
          />
        </div>

        <div className="detail-row">
          <h4>Contact No.</h4>
          <input
            type="text"
            name="contact"
            value={rider.contact}
            onChange={handleChange}
            className="profile-input"
          />
        </div>

        <div className="detail-row">
          <h4>Address</h4>
          <input
            type="text"
            name="address"
            value={rider.address}
            onChange={handleChange}
            className="profile-input"
          />
        </div>

        <div className="detail-row">
          <h4>Role</h4>
          <input
            type="text"
            value={rider.role}
            disabled
            className="profile-input disabled"
          />
        </div>

        <button
          className="save-profile-btn"
          onClick={handleSave}
          disabled={!hasChanges || saving}
          style={{
            opacity: !hasChanges ? 0.5 : 1,
            cursor: !hasChanges ? "not-allowed" : "pointer",
          }}
        >
          <Save size={18} /> {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
