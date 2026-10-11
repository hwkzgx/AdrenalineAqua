import { useState, useEffect, useRef } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import {
  Pencil,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Camera,
  User,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  Check,
  X,
} from "lucide-react";
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
  const [uploadingPic, setUploadingPic] = useState(false);

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

      if (!storedUser) return;

      const query = applyUserFilter(
        supabase.from("users").select("*"),
        storedUser
      );

      if (!query) return;

      const { data, error } = await query.limit(1).maybeSingle();

      if (data) {
        setProfile({
          fullname: storedUser.name || data.name || "",
          email: storedUser.email || data.email || "",
          contact: storedUser.contact_number || data.contact_number || "",
          address: storedUser.address || data.address || "",
        });
      }

      // Kunin ang naka-save na profile picture
      const uid = data?.users_id ?? storedUser.users_id;

      if (uid) {
        const { data: picData, error: picError } = await supabase
          .from("customer_profiles")
          .select("id_photo")
          .eq("users_id", uid)
          .maybeSingle();

        if (picError) {
          console.log("Fetch profile picture error:", picError.message);
        } else if (picData?.id_photo) {
          setProfilePic(picData.id_photo);
        }
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

  // Upload sa Storage (profile_pictures) + save ang URL sa customer_profiles
  const handleProfilePicUpload = async (e) => {
    const input = e.target;
    const file = input.files[0];
    if (!file) return;

    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser) return;

    setUploadingPic(true);

    // Kunin ang users_id (kung wala sa localStorage, hanapin sa users table)
    let uid = storedUser.users_id;

    if (!uid) {
      const lookup = applyUserFilter(
        supabase.from("users").select("users_id"),
        storedUser
      );

      if (lookup) {
        const { data: found } = await lookup.limit(1).maybeSingle();
        uid = found?.users_id;
      }
    }

    if (!uid) {
      setUploadingPic(false);
      showToast("error", "Unable to upload photo. Please log in again.");
      input.value = "";
      return;
    }

    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const fileName = `${uid}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("profile_pictures")
      .upload(fileName, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      console.log("Profile picture upload error:", uploadError);
      setUploadingPic(false);
      showToast("error", `Upload failed: ${uploadError.message}`);
      input.value = "";
      return;
    }

    const { data } = supabase.storage
      .from("profile_pictures")
      .getPublicUrl(fileName);

    const publicUrl = data.publicUrl;

    const { error: dbError } = await supabase
      .from("customer_profiles")
      .upsert(
        { users_id: uid, id_photo: publicUrl },
        { onConflict: "users_id" }
      );

    if (dbError) {
      console.log("Save profile picture error:", dbError);
      setUploadingPic(false);
      showToast("error", `Save failed: ${dbError.message}`);
      input.value = "";
      return;
    }

    setProfilePic(publicUrl);
    setUploadingPic(false);
    showToast("success", "Profile photo updated!");
    input.value = ""; // para puwedeng piliin ulit ang parehong file
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

      {/* TOP NAVIGATION BACK BUTTON */}
      <div className="myprofile-top-nav">
        <button
          className="myprofback-btn"
          onClick={() => navigate(dashboardPath)}
        >
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </button>
      </div>

      {/* PAGE HEADER */}
      <div className="myprofile-header">
        <div>
          <h1>{roleLabel} Profile</h1>
          <p>Manage your account information, contact details, and role access</p>
        </div>

        {!isEditing ? (
          <button className="myprof-edit-btn" onClick={handleEdit}>
            <Pencil size={15} />
            <span>Edit Profile</span>
          </button>
        ) : (
          <div className="myprof-header-actions">
            <button className="myprof-cancel-btn" onClick={handleCancel}>
              <X size={15} />
              <span>Cancel</span>
            </button>
            <button
              className="myprof-save-btn"
              onClick={handleSave}
              disabled={!hasChanges}
            >
              <Check size={15} />
              <span>Save Changes</span>
            </button>
          </div>
        )}
      </div>

      {/* PROFILE GRID LAYOUT */}
      <div className="myprofile-grid">
        {/* LEFT COLUMN: IDENTITY / AVATAR CARD */}
        <div className="myprofile-card myprofile-avatar-card">
          <div className="avatar-wrapper">
            <div className="avatar-frame">
              <img
                src={
                  profilePic ||
                  "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
                }
                alt="Profile Avatar"
              />
            </div>
            <label htmlFor="profileUpload" className="avatar-upload-badge" title="Change Photo">
              <Camera size={16} />
            </label>
            <input
              id="profileUpload"
              type="file"
              accept="image/*"
              hidden
              onChange={handleProfilePicUpload}
            />
          </div>

          <h3 className="avatar-name">{profile.fullname || "User Name"}</h3>
          
          <div className="avatar-role-pill">
            <ShieldCheck size={14} />
            <span>{roleLabel.toUpperCase()}</span>
          </div>

          <div className="account-status-box">
            <span className="status-dot"></span>
            <span className="status-text">Active Account</span>
          </div>

          <button
            type="button"
            className="change-photo-trigger-btn"
            disabled={uploadingPic}
            onClick={() => document.getElementById("profileUpload").click()}
          >
            <Camera size={14} />
            <span>{uploadingPic ? "Uploading..." : "Change Photo"}</span>
          </button>
        </div>

        {/* RIGHT COLUMN: DETAILS FORM CARD */}
        <div className="myprofile-card myprofile-details-card">
          <div className="details-card-header">
            <h3>Account Details</h3>
            <p>Your verified credentials and contact details in the system</p>
          </div>

          <div className="myprofile-form-grid">
            {/* USERNAME */}
            <div className="myprof-field">
              <label>
                <User size={14} />
                <span>Full Name / Username</span>
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="fullname"
                  placeholder="Enter full name"
                  value={tempProfile.fullname}
                  onChange={handleChange}
                />
              ) : (
                <div className="field-view-box">
                  {profile.fullname || <span className="empty-val">Not set</span>}
                </div>
              )}
            </div>

            {/* EMAIL */}
            <div className="myprof-field">
              <label>
                <Mail size={14} />
                <span>Email Address</span>
              </label>
              {isEditing ? (
                <input
                  type="email"
                  name="email"
                  placeholder="Enter email address"
                  value={tempProfile.email}
                  disabled
                  title="Email cannot be modified directly"
                  className="disabled-input"
                />
              ) : (
                <div className="field-view-box">
                  {profile.email || <span className="empty-val">Not set</span>}
                </div>
              )}
            </div>

            {/* CONTACT NO */}
            <div className="myprof-field">
              <label>
                <Phone size={14} />
                <span>Contact Number</span>
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="contact"
                  placeholder="e.g. 09123456789"
                  value={tempProfile.contact}
                  onChange={handleChange}
                />
              ) : (
                <div className="field-view-box">
                  {profile.contact || <span className="empty-val">Not set</span>}
                </div>
              )}
            </div>

            {/* ROLE */}
            <div className="myprof-field">
              <label>
                <ShieldCheck size={14} />
                <span>System Role</span>
              </label>
              <div className="field-view-box role-view-box">
                <span className="role-chip">{roleLabel}</span>
              </div>
            </div>

            {/* ADDRESS */}
            <div className="myprof-field full-span">
              <label>
                <MapPin size={14} />
                <span>Address</span>
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="address"
                  placeholder="Enter complete address"
                  value={tempProfile.address}
                  onChange={handleChange}
                />
              ) : (
                <div className="field-view-box">
                  {profile.address || <span className="empty-val">Not set</span>}
                </div>
              )}
            </div>
          </div>

          {/* EDIT MODE ACTION FOOTER */}
          {isEditing && (
            <div className="myprofile-form-footer">
              <button className="myprof-cancel-btn" onClick={handleCancel}>
                Cancel
              </button>
              <button
                className="myprof-save-btn"
                onClick={handleSave}
                disabled={!hasChanges}
              >
                Save Changes
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MyProfile;
