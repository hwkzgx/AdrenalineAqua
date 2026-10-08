import { useState, useEffect, useRef } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { Pencil, CheckCircle2, XCircle } from "lucide-react";
import "../../styles/my-profile.css";
import { supabase } from "../../supabase";

// Hanapin ang user gamit ang users_id; kung wala, email; kung wala, user_id
function applyUserFilter(query, user) {
  if (!user) return null;
  if (user.users_id) return query.eq("users_id", user.users_id);
  if (user.email) return query.ilike("email", String(user.email).trim());
  if (user.user_id) return query.eq("user_id", user.user_id);
  return null;
}

function MyProfile() {
  const context = useOutletContext();
  const role = (context?.role || "admin").toLowerCase();
  const navigate = useNavigate();

  // Title, label at dashboard path ayon sa role
  const isCo = role === "co" || role === "co_associate";

  const roleLabel = isCo
    ? "Co-Associate"
    : role === "staff"
    ? "Staff"
    : role === "admin"
    ? "Admin"
    : role;

  const dashboardPath = isCo
    ? "/co/dashboard"
    : role === "staff"
    ? "/staff/dashboard"
    : "/admin/dashboard";

  const [isEditing, setIsEditing] = useState(false);

  const [profile, setProfile] = useState({
    fullname: "",
    email: "",
    contact: "",
    address: "",
  });

  const [tempProfile, setTempProfile] = useState(profile);

  const [profilePic, setProfilePic] = useState(null);

  // TOAST
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const showToast = (type, message) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);

    setToast({ type, message });

    toastTimer.current = setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    setTempProfile(profile);
  }, [profile]);

  useEffect(() => {
    const fetchProfile = async () => {
      const storedUser = JSON.parse(localStorage.getItem("user"));

      console.log("STORED USER RAW:", storedUser);
      console.log(
        "STORED USER JSON:",
        JSON.stringify(storedUser, null, 2)
      );

      if (!storedUser) return;

      const query = applyUserFilter(
        supabase.from("users").select("*"),
        storedUser
      );

      if (!query) return;

      const { data, error } = await query.limit(1).maybeSingle();

      console.log("FETCHED DATA:", data);
      console.log("FETCH ERROR:", error);

      if (data) {
        setProfile({
          fullname: storedUser.name || data.name || "",
          email: storedUser.email || data.email || "",
          contact: storedUser.contact_number || data.contact_number || "",
          address: storedUser.address || data.address || "",
        });
      }
    };

    fetchProfile();
  }, []);

  const hasChanges =
    JSON.stringify(profile) !== JSON.stringify(tempProfile);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setTempProfile((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setTempProfile(profile);
    setIsEditing(false);
  };

  const handleSave = async () => {
    const storedUser = JSON.parse(localStorage.getItem("user"));

    const query = applyUserFilter(
      supabase.from("users").update({
        name: tempProfile.fullname,
        contact_number: tempProfile.contact,
        address: tempProfile.address,
      }),
      storedUser
    );

    if (!query) {
      showToast("error", "Unable to update profile. Please log in again.");
      return;
    }

    const { error } = await query;

    if (error) {
      console.log(error);
      showToast("error", "Failed to update profile. Please try again.");
      return;
    }

    // Update localStorage para pati sidebar updated
    const updatedUser = {
      ...storedUser,
      name: tempProfile.fullname,
      contact_number: tempProfile.contact,
      address: tempProfile.address,
    };

    localStorage.setItem("user", JSON.stringify(updatedUser));

    setProfile(tempProfile);
    setIsEditing(false);

    // Sabihan ang sidebar na may updated user
    window.dispatchEvent(new Event("userUpdated"));

    showToast("success", "Profile updated successfully!");
  };

  const handleProfilePicUpload = (e) => {
    const file = e.target.files[0];

    if (file) {
      setProfilePic(URL.createObjectURL(file));
    }
  };

  return (
    <div className="myprofile-page">

      {/* TOAST */}
      {toast && (
        <div className={`myprof-toast ${toast.type}`}>
          <span className="myprof-toast-icon">
            {toast.type === "success" ? (
              <CheckCircle2 size={20} />
            ) : (
              <XCircle size={20} />
            )}
          </span>
          <span className="myprof-toast-text">{toast.message}</span>
        </div>
      )}

      {/* TOPBAR */}
      <div className="myprofile-topbar">
        <button className="myprofback-btn" onClick={() => navigate(-1)}>
          ← Back
        </button>
      </div>

      {/* CARD */}
      <div className="myprofile-card">

        {/* HEADER */}
        <div className="profile-header">
          <div>
            <h2>{roleLabel} Profile</h2>

            <p className="breadcrumb">
              <span
                className="breadcrumb-link"
                onClick={() => navigate(dashboardPath)}
              >
                Dashboard
              </span>

              {" > "}
              <span>Profile</span>
            </p>
          </div>

          {!isEditing && (
            <button className="edit-btn" onClick={handleEdit}>
              <Pencil size={14} />
              Edit Profile
            </button>
          )}
        </div>

        {/* PROFILE CONTENT */}
        <div className="profile-content">

          {/* LEFT */}
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

          {/* RIGHT */}
          <div className="profile-right">

            {["fullname", "email", "contact", "address"].map((field) => (
              <div className="profile-field" key={field}>

                <label>
                  {field === "fullname"
                    ? "Username"
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

            {/* ROLE BADGE */}
            <div className="profile-field">
              <label>Role</label>
              <p className="role-badge">{roleLabel}</p>
            </div>

          </div>

        </div>

        {/* BUTTONS */}
        {isEditing && (
          <div className="profile-buttons">

            <button
              className="cancel-btn"
              onClick={handleCancel}
            >
              Cancel
            </button>

            <button
              className="save-btn"
              onClick={handleSave}
              disabled={!hasChanges}
            >
              Save Changes
            </button>

          </div>
        )}

      </div>
    </div>
  );
}

export default MyProfile;
