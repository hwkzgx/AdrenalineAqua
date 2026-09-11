import { useEffect, useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import "../../../styles/user-management.css";
import Table from "../../../components/Table";
import "./staff.css";
import { supabase } from "../../../supabase";

import {
  Eye,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

function Rider() {

  const [rider, setRider] = useState([]);
  const [search, setSearch] = useState("");

  // MODALS
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [toast, setToast] = useState({
    message: "",
    type: "",
    show: false,
  });

  // SELECTED RIDER
  const [selectedRider, setSelectedRider] = useState(null);

  // EDIT FORM DATA
  const [editData, setEditData] = useState({
    name: "",
    email: "",
    address: "",
    contact_number: "",
  });

  // ADD FORM DATA
  const [addData, setAddData] = useState({
    name: "",
    email: "",
    password: "",
    address: "",
    contact_number: "",
  });

  const showToast = (message, type = "success") => {
    setToast({
      message,
      type,
      show: true,
    });

    setTimeout(() => {
      setToast({
        message: "",
        type: "",
        show: false,
      });
    }, 2500);
  };

  // FETCH RIDER
  useEffect(() => {
    fetchRider();
  }, []);

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

  const fetchRider = async () => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("role", "rider");

    if (error) {
      console.log(error.message);
    } else {
      setRider(data);
    }
  };

  // SEARCH FILTER
  const filtered = rider.filter((r) => {
    return (
      r.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.user_id?.toLowerCase().includes(search.toLowerCase())
    );
  });

  // SAVE EDIT
  const handleSaveChanges = async () => {
    const { error } = await supabase
      .from("users")
      .update({
        name: editData.name,
        email: editData.email,
        address: editData.address,
        contact_number: editData.contact_number,
      })
      .eq("users_id", selectedRider.users_id);

    if (error) {
      showToast(error.message, "error");
    } else {
      showToast("Rider updated successfully!", "success");
      setShowEdit(false);
      fetchRider();
    }
  };

  // DELETE RIDER
  const handleDelete = async () => {
    const { error } = await supabase
      .from("users")
      .delete()
      .eq("users_id", selectedRider.users_id);

    if (error) {
      showToast(error.message, "error");
    } else {
      showToast("Rider deleted successfully!", "success");
      setShowDelete(false);
      fetchRider();
    }
  };

  // ADD RIDER
  const handleAddRider = async () => {
    const passError = validatePassword(addData.password);

    if (passError) {
      setPasswordError(passError);
      return;
    }

    // GET LAST RIDER ID
    const { data: lastRider } = await supabase
      .from("users")
      .select("user_id")
      .eq("role", "rider")
      .order("users_id", { ascending: false })
      .limit(1)
      .single();

    let nextNumber = 1;

    // IF MAY EXISTING RIDER
    if (lastRider?.user_id) {
      // RDR2026001 -> 001
      const numberPart = lastRider.user_id.slice(-3);
      nextNumber = parseInt(numberPart) + 1;
    }

    // GENERATE USER ID
    const generatedUserId = `RDR2026${String(nextNumber).padStart(3, "0")}`;

    // INSERT
    const { error } = await supabase
      .from("users")
      .insert([
        {
          user_id: generatedUserId,
          name: addData.name,
          email: addData.email,
          password: addData.password,
          address: addData.address,
          contact_number: addData.contact_number,
          role: "rider",
        },
      ]);

    if (error) {
      showToast(error.message, "error");
    } else {
      showToast("Rider added successfully!", "success");
      setShowAdd(false);

      setAddData({
        name: "",
        email: "",
        password: "",
        address: "",
        contact_number: "",
      });

      fetchRider();
    }
  };

  // TABLE COLUMNS
  const columns = [
    { key: "user_id", label: "Rider ID" },
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "address", label: "Address" },
    { key: "contact_number", label: "Contact Info" },

    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>

          {/* EDIT */}
          <button
            onClick={() => {
              setSelectedRider(row);
              setEditData({
                name: row.name || "",
                email: row.email || "",
                address: row.address || "",
                contact_number: row.contact_number || "",
              });
              setShowEdit(true);
            }}
            style={{
              padding: "6px 10px",
              border: "none",
              borderRadius: "6px",
              backgroundColor: "#f59e0b",
              color: "white",
              cursor: "pointer",
              width: "40px",
            }}
          >
            <Pencil size={18} />
          </button>

          {/* DELETE */}
          <button
            onClick={() => {
              setSelectedRider(row);
              setShowDelete(true);
            }}
            style={{
              padding: "6px 10px",
              border: "none",
              borderRadius: "6px",
              backgroundColor: "#ef4444",
              color: "white",
              cursor: "pointer",
              width: "40px",
            }}
          >
            <Trash2 size={18} />
          </button>

        </div>
      ),
    },
  ];

  return (
    <div className="page">
      
      {toast.show && (
        <div className={`toast ${toast.type} show`}>
          <div className="toast-icon">
            {toast.type === "success" ? (
              <CheckCircle size={18} />
            ) : (
              <XCircle size={18} />
            )}
          </div>
          <div className="toast-text">
            {toast.message}
          </div>
        </div>
      )}

      <div className="page-header">
        <h1>Riders</h1>
      </div>

      <div className="controls-row">
        <div className="controls-left"></div>
        <div className="controls-right">
          <input
            placeholder="Search rider..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="rideradd-btn" onClick={() => setShowAdd(true)}>
            + Add Rider
          </button>
        </div>
      </div>

      <Table
        columns={columns}
        data={filtered}
        emptyMessage="No riders found."
      />

      {/* EDIT MODAL */}
      {showEdit && (
        <div className="modal-overlay">
          <div className="edit-modal">
            <span className="close-btn" onClick={() => setShowEdit(false)}>✕</span>
            <h2>Profile</h2>

            <div className="form-group">
              <label>Name</label>
              <input
                value={editData.name}
                onChange={(e) =>
                  setEditData({ ...editData, name: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                value={editData.email}
                onChange={(e) =>
                  setEditData({ ...editData, email: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label>Address</label>
              <input
                value={editData.address}
                onChange={(e) =>
                  setEditData({ ...editData, address: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label>Contact No.</label>
              <input
                value={editData.contact_number}
                onChange={(e) =>
                  setEditData({ ...editData, contact_number: e.target.value })
                }
              />
            </div>

            <div className="modal-actions">
              <button className="Stfcancel-btn" onClick={() => setShowEdit(false)}>
                Cancel
              </button>
              <button className="Stfsave-btn" onClick={handleSaveChanges}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {showDelete && (
        <div className="modal-overlay">
          <div className="delete-modal">
            <span
              className="close-btn"
              onClick={() => setShowDelete(false)}
            >
              ✕
            </span>
            <h1>Delete Rider</h1>
            <p className="delete-subtitle">
              Are you sure you want to delete this rider record?
            </p>

            <div className="warning-box">
              <h3>⚠ Warning</h3>
              <p>
                 This will permanently delete the rider record and all related data. This action cannot be undone.
              </p>
              <hr />
              <div className="delete-info">
                <p><b>Rider ID:</b> {selectedRider?.user_id}</p>
                <p><b>Name:</b> {selectedRider?.name}</p>
                <p><b>Email:</b> {selectedRider?.email}</p>
                <p><b>Address:</b> {selectedRider?.address}</p>
                <p><b>Contact:</b> {selectedRider?.contact_number}</p>
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="cancel-dark"
                onClick={() => setShowDelete(false)}
              >
                No, Cancel
              </button>
              <button
                className="delete-btn"
                onClick={handleDelete}
              >
                Delete Rider
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD MODAL */}
      {showAdd && (
        <div className="modal-overlay">
          <div className="edit-modal">
            <span className="close-btn" onClick={() => setShowAdd(false)}>✕</span>
            <h2>Add Rider</h2>

            <div className="form-group">
              <label>Name</label>
              <input
                value={addData.name}
                onChange={(e) =>
                  setAddData({ ...addData, name: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                value={addData.email}
                onChange={(e) =>
                  setAddData({ ...addData, email: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="input-wrapper">
                <input
                  type="password"
                  value={addData.password}
                  onChange={(e) => {
                    const value = e.target.value;
                    setAddData({
                      ...addData,
                      password: value
                    });
                    setPasswordError(validatePassword(value));
                  }}
                />
                {passwordError && (
                  <p className="error-message">
                    {passwordError}
                  </p>
                )}
              </div>
            </div>

            <div className="form-group">
              <label>Address</label>
              <input
                value={addData.address}
                onChange={(e) =>
                  setAddData({ ...addData, address: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label>Contact No.</label>
              <input
                value={addData.contact_number}
                onChange={(e) =>
                  setAddData({ ...addData, contact_number: e.target.value })
                }
              />
            </div>

            <div className="modal-actions">
              <button className="Stfcancel-btn" onClick={() => setShowAdd(false)}>
                Cancel
              </button>
              <button className="Stfsave-btn" onClick={handleAddRider}>
                Add Rider
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Rider;