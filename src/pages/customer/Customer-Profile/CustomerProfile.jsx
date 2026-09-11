import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, Check } from "lucide-react";
import "./customer-profile.css";
import { supabase } from "../../../supabase";

function CustomerProfile() {
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);

  const [profile, setProfile] = useState({
    fullname: "",
    email: "",
    contact: "",
    address: "",
  });

  const [tempProfile, setTempProfile] = useState(profile);

  const [profilePic, setProfilePic] = useState(null);
  const [frontID, setFrontID] = useState(null);
  const [backID, setBackID] = useState(null);
  const [idType, setIdType] = useState("");

  const idTypes = [
    "Philippine National ID (PhilSys)",
    "Driver's License",
    "Passport",
    "SSS ID",
    "UMID",
    "Postal ID",
    "Voter's ID",
    "TIN ID",
    "Senior Citizen ID",
  ];

  // 🔥 FETCH LOGGED-IN USER PROFILE (FIXED)
  useEffect(() => {
  const fetchProfile = async () => {
    const storedUser = JSON.parse(localStorage.getItem("user"));

    console.log("storedUser:", storedUser);

    if (!storedUser) return;

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("users_id", storedUser.users_id)
      .single();

    console.log("data:", data);
    console.log("error:", error);

    if (data) {
      setProfile({
        fullname: data.name || "",
        email: data.email || "",
        contact: data.contact_number || "",
        address: data.address || "",
      });
    }
  };

  fetchProfile();
}, []);

  useEffect(() => {
    setTempProfile(profile);
  }, [profile]);

  const hasChanges =
    JSON.stringify(profile) !== JSON.stringify(tempProfile);

  const canVerify = frontID && backID && idType;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTempProfile((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEdit = () => setIsEditing(true);

  const handleCancel = () => {
    setTempProfile(profile);
    setIsEditing(false);
  };

  // 🔥 UPDATE PROFILE (FIXED)
  const handleSave = async () => {
   const storedUser = JSON.parse(localStorage.getItem("user"));

    await supabase
      .from("users")
      .update({
        name: tempProfile.fullname,
        contact_number: tempProfile.contact,
        address: tempProfile.address,
      })
      .eq("users_id", storedUser.users_id);

    if (error) {
      console.log("Update error:", error.message);
      return;
    }

    setProfile(tempProfile);
    setIsEditing(false);
  };

  const handleUpload = (setter) => (e) => {
    const file = e.target.files[0];
    if (file) setter(URL.createObjectURL(file));
  };

  const handleProfilePicUpload = (e) => {
    const file = e.target.files[0];
    if (file) setProfilePic(URL.createObjectURL(file));
  };

  return (
    <div className="cusprofile-page">

      {/* TOPBAR */}
      <div className="cusprofile-topbar">
        <button className="custback-btn" onClick={() => navigate(-1)}>
          ← Back
        </button>
      </div>

      {/* CARD */}
      <div className="cusprofile-card">

        {/* HEADER */}
        <div className="profile-header">
          <h2>Profile</h2>

          {!isEditing && (
            <button className="edit-btn" onClick={handleEdit}>
              <Pencil size={14} />
              Edit Profile
            </button>
          )}
        </div>

        {/* PROFILE CONTENT */}
        <div className="profile-content">

          {/* LEFT - PROFILE PIC */}
          <div className="profile-left">

            <div className="profile-pic-holder">
              <img
                src={
                  profilePic ||
                  "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
                }
                alt="profile"
              />
            </div>

            {/* REAL BUTTON */}
            <div className="profile-pic-actions">
              <button
                type="button"
                className="change-photo-btn"
                onClick={() =>
                  document.getElementById("profileUpload").click()
                }
              >
                Change Photo
              </button>

              <input
                id="profileUpload"
                type="file"
                accept="image/*"
                hidden
                onChange={handleProfilePicUpload}
              />
            </div>

          </div>

          {/* RIGHT - INFO */}
          <div className="profile-right">

            {["fullname", "email", "contact", "address"].map((field) => (
              <div className="profile-field" key={field}>
                <label>
                  {field === "fullname"
                    ? "Full Name"
                    : field === "contact"
                    ? "Contact No."
                    : field.charAt(0).toUpperCase() + field.slice(1)}
                </label>

                {isEditing ? (
                  <input
                    type="text"
                    name={field}
                    value={tempProfile[field]}
                    onChange={handleChange}
                  />
                ) : (
                  <p>{profile[field]}</p>
                )}
              </div>
            ))}

          </div>
        </div>

        {/* VERIFICATION */}
        <div className="verification-section">
          <h3>Identity Verification</h3>

          <div className="verification-row">

            {/* ID TYPE */}
            <div>
              <span>ID Type</span>

              <select
                className="id-dropdown"
                value={idType}
                onChange={(e) => setIdType(e.target.value)}
              >
                <option value="" disabled>
                  Select ID Type
                </option>

                {idTypes.map((type, i) => (
                  <option key={i} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* STATUS */}
            <div>
              <span>Status</span>

              <div className="verified-badge">
                <Check size={14} />
                Pending
              </div>
            </div>

          </div>
        </div>

        {/* ID UPLOAD */}
        <div className="id-section">
          <h3>ID Photos</h3>

          <div className="id-images">

            {/* FRONT */}
            <div className="id-box">
              <span>Front</span>

              <div className="id-holder">
                {frontID ? (
                  <img src={frontID} alt="front id" />
                ) : (
                  <p>No Image</p>
                )}
              </div>

              <label className="upload-id-btn">
                Upload
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleUpload(setFrontID)}
                />
              </label>
            </div>

            {/* BACK */}
            <div className="id-box">
              <span>Back</span>

              <div className="id-holder">
                {backID ? (
                  <img src={backID} alt="back id" />
                ) : (
                  <p>No Image</p>
                )}
              </div>

              <label className="upload-id-btn">
                Upload
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleUpload(setBackID)}
                />
              </label>
            </div>

          </div>
        </div>

        {/* EDIT BUTTONS */}
        {isEditing && (
          <div className="profile-buttons">
            <button className="cancel-btn" onClick={handleCancel}>
              Cancel
            </button>

            <button
              className="custsave-btn"
              onClick={handleSave}
              disabled={!hasChanges}
            >
              Save Changes
            </button>
          </div>
        )}

        {/* VERIFY BUTTON */}
        <button className="verify-btn" disabled={!canVerify}>
          Verify Account
        </button>

      </div>
    </div>
  );
}

export default CustomerProfile;