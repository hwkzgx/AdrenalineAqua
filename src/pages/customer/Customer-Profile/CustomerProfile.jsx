import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, Check, CheckCircle2, XCircle } from "lucide-react";
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
  const [uploadingPic, setUploadingPic] = useState(false);

  const [validId, setValidId] = useState(null); // existing saved URL mula sa DB
  const [validIdFile, setValidIdFile] = useState(null); // bagong napiling file (preview lang muna)
  const [validIdPreview, setValidIdPreview] = useState(null);
  const [idType, setIdType] = useState("");
  const [accountStatus, setAccountStatus] = useState("Pending");
  const [uploadingId, setUploadingId] = useState(false);

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

  // ===============================
  // FETCH LOGGED-IN USER PROFILE
  // ===============================
  useEffect(() => {
    const fetchProfile = async () => {
      const storedUser = JSON.parse(localStorage.getItem("user"));

      if (!storedUser) return;

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("users_id", storedUser.users_id)
        .single();

      if (error) {
        console.log("Fetch profile error:", error.message);
        return;
      }

      if (data) {
        setProfile({
          fullname: data.name || "",
          email: data.email || "",
          contact: data.contact_number || "",
          address: data.address || "",
        });

        setValidId(data.valid_id || null);
        setIdType(data.id_type || "");
        setAccountStatus(data.status || "Pending");
      }

      // Kunin ang existing profile picture mula sa customer_profiles
      const { data: profileData, error: profileError } = await supabase
        .from("customer_profiles")
        .select("id_photo")
        .eq("users_id", storedUser.users_id)
        .maybeSingle();

      if (!profileError && profileData?.id_photo) {
        setProfilePic(profileData.id_photo);
      }
    };

    fetchProfile();
  }, []);

  useEffect(() => {
    setTempProfile(profile);
  }, [profile]);

  const hasChanges = JSON.stringify(profile) !== JSON.stringify(tempProfile);

  const canVerify = (validIdFile || validId) && idType && accountStatus !== "Verified";

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

  // ===============================
  // UPDATE PROFILE
  // ===============================
  const handleSave = async () => {
    const storedUser = JSON.parse(localStorage.getItem("user"));

    const { error } = await supabase
      .from("users")
      .update({
        name: tempProfile.fullname,
        contact_number: tempProfile.contact,
        address: tempProfile.address,
      })
      .eq("users_id", storedUser.users_id);

    if (error) {
      console.log("Update error:", error.message);
      showToast("error", "Failed to update profile. Please try again.");
      return;
    }

    setProfile(tempProfile);
    setIsEditing(false);
    showToast("success", "Profile updated successfully!");
  };

  // ===============================
  // UPLOAD PROFILE PICTURE (actual upload sa Storage + save sa DB)
  // ===============================
  const handleProfilePicUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser) return;

    setUploadingPic(true);

    const fileName = `${storedUser.users_id}-${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("profile_pictures")
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      console.log("Profile picture upload error:", uploadError.message);
      setUploadingPic(false);
      showToast("error", "Failed to upload profile photo. Please try again.");
      return;
    }

    const { data } = supabase.storage
      .from("profile_pictures")
      .getPublicUrl(fileName);

    const publicUrl = data.publicUrl;

    const { error: dbError } = await supabase
      .from("customer_profiles")
      .upsert(
        { users_id: storedUser.users_id, id_photo: publicUrl },
        { onConflict: "users_id" }
      );

    if (dbError) {
      console.log("Save profile picture error:", dbError.message);
      setUploadingPic(false);
      showToast("error", "Failed to save profile photo. Please try again.");
      return;
    }

    setProfilePic(publicUrl);
    setUploadingPic(false);
    showToast("success", "Profile photo updated!");
  };

  // ===============================
  // VALID ID: pumili lang muna ng file (preview), hindi pa upload
  // ===============================
  const handleValidIdSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setValidIdFile(file);
    setValidIdPreview(URL.createObjectURL(file));
  };

  // ===============================
  // SUBMIT VALID ID + ID TYPE (upload + save sa users table)
  // ===============================
  const handleVerifyAccount = async () => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser) return;

    if (!idType) {
      showToast("error", "Please select an ID type first.");
      return;
    }

    if (!validIdFile && !validId) {
      showToast("error", "Please upload your valid ID first.");
      return;
    }

    setUploadingId(true);

    let finalValidIdUrl = validId;

    if (validIdFile) {
      const fileName = `${storedUser.users_id}-${Date.now()}-${validIdFile.name}`;

      const { error: uploadError } = await supabase.storage
        .from("valid_ids")
        .upload(fileName, validIdFile, { upsert: true });

      if (uploadError) {
        console.log("Valid ID upload error:", uploadError.message);
        setUploadingId(false);
        showToast("error", "Failed to upload valid ID. Please try again.");
        return;
      }

      const { data } = supabase.storage.from("valid_ids").getPublicUrl(fileName);
      finalValidIdUrl = data.publicUrl;
    }

    const { error: updateError } = await supabase
      .from("users")
      .update({
        valid_id: finalValidIdUrl,
        id_type: idType,
        status: "Pending",
      })
      .eq("users_id", storedUser.users_id);

    if (updateError) {
      console.log("Submit verification error:", updateError.message);
      setUploadingId(false);
      showToast("error", "Failed to submit verification. Please try again.");
      return;
    }

    setValidId(finalValidIdUrl);
    setValidIdFile(null);
    setAccountStatus("Pending");
    setUploadingId(false);
    showToast("success", "Valid ID submitted for verification!");
  };

  const statusLabel =
    accountStatus === "Unverified" ? "Rejected" : accountStatus || "Pending";

  return (
    <div className="cusprofile-page">

      {/* TOAST */}
      {toast && (
        <div className={`cusprof-toast ${toast.type}`}>
          <span className="cusprof-toast-icon">
            {toast.type === "success" ? (
              <CheckCircle2 size={20} />
            ) : (
              <XCircle size={20} />
            )}
          </span>
          <span className="cusprof-toast-text">{toast.message}</span>
        </div>
      )}

      {/* TOPBAR */}
      <div className="cusprofile-topbar">
        <button className="ctmrback-btn" onClick={() => navigate(-1)}>
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

            <div className="profile-pic-actions">
              <button
                type="button"
                className="change-photo-btn"
                disabled={uploadingPic}
                onClick={() =>
                  document.getElementById("profileUpload").click()
                }
              >
                {uploadingPic ? "Uploading..." : "Change Photo"}
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
                disabled={accountStatus === "Verified"}
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

              <div className={`verified-badge ${statusLabel.toLowerCase()}`}>
                <Check size={14} />
                {statusLabel}
              </div>
            </div>

          </div>
        </div>

        {/* ID UPLOAD */}
        <div className="id-section">
          <h3>Valid ID</h3>

          <div className="id-images">
            <div className="id-box">
              <span>Uploaded ID</span>

              <div className="id-holder">
                {validIdPreview || validId ? (
                  <img src={validIdPreview || validId} alt="valid id" />
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
                  onChange={handleValidIdSelect}
                  disabled={accountStatus === "Verified"}
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
        <button
          className="verify-btn"
          disabled={!canVerify || uploadingId}
          onClick={handleVerifyAccount}
        >
          {uploadingId ? "Submitting..." : "Verify Account"}
        </button>

      </div>
    </div>
  );
}

export default CustomerProfile;
