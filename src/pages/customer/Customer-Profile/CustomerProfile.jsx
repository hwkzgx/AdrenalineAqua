import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Pencil,
  Check,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
} from "lucide-react";
import "./customer-profile.css";
import { supabase } from "../../../supabase";

// Gumagawa ng ligtas na filename (walang espasyo/special characters)
const makeFileName = (usersId, file) => {
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  return `${usersId}-${Date.now()}.${ext}`;
};

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

  // ADDITIONAL ADDRESSES (table: user_addresses)
  const [addresses, setAddresses] = useState([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressForm, setAddressForm] = useState({ label: "", address: "" });
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState(null); // address na ide-delete (modal)
  const [deletingAddress, setDeletingAddress] = useState(false);

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
    }, 4000);
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
      } else if (data) {
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
      // (tumatakbo kahit nag-error ang users query)
      const { data: profileData, error: profileError } = await supabase
        .from("customer_profiles")
        .select("id_photo")
        .eq("users_id", storedUser.users_id)
        .maybeSingle();

      if (profileError) {
        console.log("Fetch profile picture error:", profileError.message);
      } else if (profileData?.id_photo) {
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
    const input = e.target;
    const file = input.files[0];
    if (!file) return;

    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser) return;

    setUploadingPic(true);

    const fileName = makeFileName(storedUser.users_id, file);

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
        { users_id: storedUser.users_id, id_photo: publicUrl },
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
      const fileName = makeFileName(storedUser.users_id, validIdFile);

      const { error: uploadError } = await supabase.storage
        .from("valid_ids")
        .upload(fileName, validIdFile, {
          upsert: true,
          contentType: validIdFile.type,
        });

      if (uploadError) {
        console.log("Valid ID upload error:", uploadError);
        setUploadingId(false);
        showToast("error", `Upload failed: ${uploadError.message}`);
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
      console.log("Submit verification error:", updateError);
      setUploadingId(false);
      showToast("error", `Submit failed: ${updateError.message}`);
      return;
    }

    setValidId(finalValidIdUrl);
    setValidIdFile(null);
    setAccountStatus("Pending");
    setUploadingId(false);
    showToast("success", "Valid ID submitted for verification!");
  };

  // ===============================
  // ADDITIONAL ADDRESSES
  // ===============================
  const fetchAddresses = async () => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser) return;

    const { data, error } = await supabase
      .from("user_addresses")
      .select("*")
      .eq("user_id", storedUser.users_id)
      .order("created_at", { ascending: true });

    if (error) {
      console.log("Fetch addresses error:", error.message);
      return;
    }

    setAddresses(data || []);
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const openAddAddress = () => {
    setEditingAddressId(null);
    setAddressForm({ label: "", address: "" });
    setShowAddressForm(true);
  };

  const openEditAddress = (item) => {
    setEditingAddressId(item.address_id);
    setAddressForm({ label: item.label || "", address: item.address || "" });
    setShowAddressForm(true);
  };

  const closeAddressForm = () => {
    setShowAddressForm(false);
    setEditingAddressId(null);
    setAddressForm({ label: "", address: "" });
  };

  const handleSaveAddress = async () => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser) return;

    const label = addressForm.label.trim();
    const address = addressForm.address.trim();

    if (address.length < 5) {
      showToast("error", "Please enter a complete address.");
      return;
    }

    setSavingAddress(true);

    const { error } = editingAddressId
      ? await supabase
          .from("user_addresses")
          .update({ label: label || null, address })
          .eq("address_id", editingAddressId)
          .eq("user_id", storedUser.users_id)
      : await supabase
          .from("user_addresses")
          .insert([
            { user_id: storedUser.users_id, label: label || null, address },
          ]);

    setSavingAddress(false);

    if (error) {
      console.log("Save address error:", error.message);
      showToast("error", `Failed to save address: ${error.message}`);
      return;
    }

    showToast(
      "success",
      editingAddressId ? "Address updated!" : "Address added!"
    );
    closeAddressForm();
    fetchAddresses();
  };

  const confirmDeleteAddress = async () => {
    if (!addressToDelete) return;

    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser) return;

    setDeletingAddress(true);

    const { error } = await supabase
      .from("user_addresses")
      .delete()
      .eq("address_id", addressToDelete.address_id)
      .eq("user_id", storedUser.users_id);

    setDeletingAddress(false);
    setAddressToDelete(null);

    if (error) {
      console.log("Delete address error:", error.message);
      showToast("error", `Failed to delete address: ${error.message}`);
      return;
    }

    showToast("success", "Address deleted.");
    fetchAddresses();
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

      {/* DELETE ADDRESS MODAL */}
      {addressToDelete && (
        <div
          className="address-modal-overlay"
          onClick={() => !deletingAddress && setAddressToDelete(null)}
        >
          <div
            className="address-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="address-modal-icon">
              <Trash2 size={22} />
            </div>

            <h3>Delete address?</h3>
            <p>This will permanently remove this address from your account.</p>

            <div className="address-modal-preview">
              <strong>{addressToDelete.label || "Saved address"}</strong>
              <span>{addressToDelete.address}</span>
            </div>

            <div className="address-modal-buttons">
              <button
                type="button"
                className="address-modal-cancel"
                disabled={deletingAddress}
                onClick={() => setAddressToDelete(null)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="address-modal-delete"
                disabled={deletingAddress}
                onClick={confirmDeleteAddress}
              >
                {deletingAddress ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
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
                    : field === "address"
                    ? "Main Address"
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

        {/* ADDITIONAL ADDRESSES */}
        <div className="addresses-section">
          <div className="addresses-header">
            <h3>Additional Addresses</h3>

            {!showAddressForm && (
              <button
                type="button"
                className="add-address-btn"
                onClick={openAddAddress}
              >
                <Plus size={14} />
                Add Address
              </button>
            )}
          </div>

          {addresses.length === 0 && !showAddressForm && (
            <p className="addresses-empty">
              No additional addresses yet. Saved addresses will appear in the
              delivery address dropdown when you place an order.
            </p>
          )}

          {addresses.map((item) => (
            <div className="address-item" key={item.address_id}>
              <div className="address-item-text">
                <strong>{item.label || "Saved address"}</strong>
                <span>{item.address}</span>
              </div>

              <div className="address-item-actions">
                <button
                  type="button"
                  className="address-icon-btn"
                  title="Edit"
                  onClick={() => openEditAddress(item)}
                >
                  <Pencil size={14} />
                </button>

                <button
                  type="button"
                  className="address-icon-btn danger"
                  title="Delete"
                  onClick={() => setAddressToDelete(item)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}

          {showAddressForm && (
            <div className="address-form">
              <input
                type="text"
                placeholder="Label (e.g. Home, Shop)"
                value={addressForm.label}
                onChange={(e) =>
                  setAddressForm((prev) => ({ ...prev, label: e.target.value }))
                }
              />

              <input
                type="text"
                placeholder="Complete address (include Hagonoy)"
                value={addressForm.address}
                onChange={(e) =>
                  setAddressForm((prev) => ({
                    ...prev,
                    address: e.target.value,
                  }))
                }
              />

              <div className="address-form-buttons">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={closeAddressForm}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="custsave-btn"
                  onClick={handleSaveAddress}
                  disabled={savingAddress}
                >
                  {savingAddress
                    ? "Saving..."
                    : editingAddressId
                    ? "Update Address"
                    : "Save Address"}
                </button>
              </div>
            </div>
          )}
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
