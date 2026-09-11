import { useState, useEffect } from "react";
import "./rider-profile.css";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../supabase";
import {
  ArrowLeft,
  Camera,
  Save,
} from "lucide-react";

export default function RiderProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [originalRider, setOriginalRider] = useState({
    name: "",
    email: "",
    contact: "",
    address: "",
    role: "Delivery Rider",
    profile_picture: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
  });

  const [rider, setRider] = useState({
    name: "",
    email: "",
    contact: "",
    address: "",
    role: "Delivery Rider",
    profile_picture: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
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

      let data = null;
      let error = null;

      // 1. Hanapin sa `users` table gamit ang user_id o email
      let query = supabase.from("users").select("*");

      if (userId) {
        query = query.eq("user_id", userId); // Palitan ng "id" kung id ang column name sa users table mo
      } else if (userEmail) {
        query = query.eq("email", userEmail);
      } else {
        alert("Invalid user session data.");
        setLoading(false);
        return;
      }

      const res = await query.maybeSingle();
      data = res.data;
      error = res.error;

      if (error || !data) {
        console.log("Error fetching profile from users table:", error?.message);
        alert("Hindi makita ang profile ng rider na ito sa database.");
        setLoading(false);
        return;
      }

      // I-load ang data mula sa `users` table
      const fetchedData = {
        name: data.name || data.full_name || "",
        email: data.email || "",
        contact: data.contact_number || data.phone || data.contact || "",
        address: data.address || "",
        role: data.role || "Delivery Rider",
        profile_picture: data.profile_picture || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
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
      alert("Failed to upload image to storage bucket.");
      setSaving(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("profiles")
      .getPublicUrl(filePath);

    setRider((prev) => ({ ...prev, profile_picture: publicUrlData.publicUrl }));
    setSaving(false);
  };

  const hasChanges = 
    rider.name !== originalRider.name ||
    rider.email !== originalRider.email ||
    rider.contact !== originalRider.contact ||
    rider.address !== originalRider.address ||
    rider.profile_picture !== originalRider.profile_picture;

  const handleSave = async () => {
    if (!hasChanges) return;

    setSaving(true);
    const storedUser = localStorage.getItem("user");
    const parsedUser = storedUser ? JSON.parse(storedUser) : null;
    const userId = parsedUser?.user_id || parsedUser?.id;

    // I-update sa `users` table
    const { error } = await supabase
      .from("users")
      .update({
        name: rider.name,
        email: rider.email,
        contact_number: rider.contact,
        address: rider.address,
        profile_picture: rider.profile_picture,
      })
      .eq("user_id", userId); // Gamitin ang tamang ID column (user_id o id)

    setSaving(false);

    if (error) {
      console.log("Error updating profile:", error.message);
      alert("Failed to save changes to database.");
    } else {
      alert("Profile updated successfully!");
      setOriginalRider(rider);
    }
  };

  if (loading) {
    return <p style={{ padding: "20px", textAlign: "center" }}>Loading profile from database...</p>;
  }

  return (
    <div className="profile-container">
      <div className="header">
        <div className="header-left">
          <ArrowLeft
            size={40}
            className="back-btn"
            onClick={() => navigate(-1)}
          />
          <h2>Profile</h2>
        </div>
      </div>

      <div className="profile-section">
        <div className="image-upload-wrapper" style={{ position: "relative", cursor: "pointer" }}>
          <img
            src={rider.profile_picture}
            alt="Profile"
            className="profile-image"
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
            cursor: !hasChanges ? "not-allowed" : "pointer" 
          }}
        >
          <Save size={18} /> {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}