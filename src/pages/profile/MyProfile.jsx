import { useState, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { Pencil } from "lucide-react";
import "../../styles/my-profile.css";
import { supabase } from "../../supabase";

function MyProfile() {
  const context = useOutletContext();
  const role = context?.role || "admin";
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

    const { data, error } = await supabase
  .from("users")
  .select("*")
  .eq("email", storedUser.email)
  .single();

    console.log("FETCHED DATA:", data);
    console.log("FETCH ERROR:", error);

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

  const userId =
    storedUser.users_id ||
    storedUser.user_id ||
    storedUser.admin_id ||
    storedUser.id;

 const { error } = await supabase
  .from("users")
  .update({
    name: tempProfile.fullname,
    contact_number: tempProfile.contact,
    address: tempProfile.address,
  })
  .eq("email", storedUser.email);

if (error) {
  console.log(error);
  return;
}

  setProfile(tempProfile);
  setIsEditing(false);
};

  const handleProfilePicUpload = (e) => {
    const file = e.target.files[0];

    if (file) {
      setProfilePic(URL.createObjectURL(file));
    }
  };

  return (
    <div className="myprofile-page">

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
            <h2>
              {role === "admin"
                ? "Admin Profile"
                : "Co-Associate Profile"}
            </h2>

            <p className="breadcrumb">
              <span
                className="breadcrumb-link"
                onClick={() =>
                  navigate(
                    role === "admin"
                      ? "/admin/dashboard"
                      : "/co/dashboard"
                  )
                }
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
            
          {/* ROLE BADGE */}
          <div className="profile-field">
          <label>Role</label>
          <p className="role-badge">{role}</p>
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