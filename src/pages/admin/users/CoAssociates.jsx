import { useEffect, useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import "../../../styles/user-management.css";
import "./staff.css";
import Table from "../../../components/Table";
import { supabase } from "../../../supabase";

import {
  Eye,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

function CoAssociates() {

  const [co, setCo] = useState([]);
  const [search, setSearch] = useState("");

  // MODALS
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
    const [showView, setShowView] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  

  // SELECTED
  const [selectedCo, setSelectedCo] = useState(null);

  // EDIT DATA
  const [editData, setEditData] = useState({
    name: "",
    email: "",
    address: "",
    contact_number: "",
  });

  // ADD DATA
  const [addData, setAddData] = useState({
    name: "",
    email: "",
    password: "", // ADD THIS
    address: "",
    contact_number: "",
  });

  const [toast, setToast] = useState({
  message: "",
  type: "",
  show: false,
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

  useEffect(() => {
    fetchCoAssociates();
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

  const fetchCoAssociates = async () => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("role", "co");

    if (error) {
      console.log(error.message);
    } else {
      setCo(data);
    }
  };

  const filtered = co.filter((c) =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.user_id?.toLowerCase().includes(search.toLowerCase())
  );

  // UPDATE
  const handleSaveChanges = async () => {

    const { error } = await supabase
      .from("users")
      .update({
        name: editData.name,
        email: editData.email,
        address: editData.address,
        contact_number: editData.contact_number,
      })
      .eq("users_id", selectedCo.users_id);

if (error) {
  showToast(error.message, "error");
} else {
  showToast("Updated successfully!", "success");
  setShowEdit(false);
  fetchCoAssociates();
}
  };

  // DELETE
  const handleDelete = async () => {

    const { error } = await supabase
      .from("users")
      .delete()
      .eq("users_id", selectedCo.users_id);

    if (error) {
  showToast(error.message, "error");
} else {
  showToast("Deleted successfully!", "success");
  setShowDelete(false);
  fetchCoAssociates();
}
  };

    // ADD CO
const handleAddCo = async () => {
  const passError = validatePassword(addData.password);

if (passError) {
  setPasswordError(passError);
  showToast(passError, "error");
  return;
}

  // GET LAST CO ID
  const { data: lastCo } = await supabase
    .from("users")
    .select("user_id")
    .eq("role", "co")
    .order("users_id", { ascending: false })
    .limit(1)
    .single();

  let nextNumber = 1;

  // IF MAY EXISTING CO
  if (lastCo?.user_id) {

    // STF2026001 -> 001
    const numberPart = lastCo.user_id.slice(-3);

    nextNumber = parseInt(numberPart) + 1;
  }

  // GENERATE USER ID
  const generatedUserId =
    `COA2026${String(nextNumber).padStart(3, "0")}`;

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
        role: "co",
      },
    ]);

if (error) {

  showToast(error.message, "error");

} else {

  showToast("Co-Associate added successfully!", "success");

  setShowAdd(false);

  setAddData({
    name: "",
    email: "",
    password: "",
    address: "",
    contact_number: "",
  });

  fetchCoAssociates();
}
};

  const columns = [
    { key: "user_id", label: "User ID" },
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "address", label: "Address" },
    { key: "contact_number", label: "Contact Info" },

    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>

          <button
            onClick={() => {
              setSelectedCo(row);
              setEditData({
                name: row.name || "",
                email: row.email || "",
                address: row.address || "",
                contact_number: row.contact_number || "",
              });
              setShowEdit(true);
            }}
            style={{
              padding: "4px 8px",
              fontSize: "12px",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              backgroundColor: "#f59e0b",
              color: "white",
              width: "40px"
            }}
          >
           <Pencil size={18} />
          </button>

          <button
            onClick={() => {
              setSelectedCo(row);
              setShowDelete(true);
            }}
            style={{
              padding: "4px 8px",
              fontSize: "12px",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              backgroundColor: "#ef4444",
              color: "white",
              width: "40px"
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
        <h1>Co-Associates</h1>
      </div>

      <div className="controls-row">

        <div className="controls-left"></div>

        <div className="controls-right">

          <input
            placeholder="Search co-associate..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <button className="coadd-btn" onClick={() => setShowAdd(true)}>
            + Add Co-Associate
          </button>

        </div>

      </div>

      <Table
        columns={columns}
        data={filtered}
        emptyMessage="No co-associates found."
      />

      {/* EDIT MODAL */}
      {showEdit && (
        <div className="modal-overlay">
          <div className="edit-modal">

            <span className="close-btn" onClick={() => setShowEdit(false)}>✕</span>

            <h2>Edit Co-Associate</h2>

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
              <label>Contact</label>
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

            <span className="close-btn" onClick={() => setShowDelete(false)}>✕</span>

            <h1>Delete Co-Associate</h1>
            <p className="delete-subtitle">
            Are you sure you want to delete this staff record?
          </p>

            <div className="warning-box">

              <h3>⚠ Warning</h3>

              <p> This will permanently delete the staff record and all related data. This action cannot be undone.</p>

              <hr />

              <div className="delete-info">
                <p><b>ID:</b> {selectedCo?.user_id}</p>
                <p><b>Name:</b> {selectedCo?.name}</p>
                <p><b>Email:</b> {selectedCo?.email}</p>
                <p><b>Address:</b> {selectedCo?.address}</p>
                <p><b>Contact:</b> {selectedCo?.contact_number}</p>
              </div>

            </div>

            <div className="modal-actions">

              <button className="cancel-dark" onClick={() => setShowDelete(false)}>
                Cancel
              </button>

              <button className="delete-btn" onClick={handleDelete}>
                Delete
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

            <h2>Add Co-Associate</h2>

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
                  setAddData({
                    ...addData,
                    address: e.target.value
                  })
                }
              />

            </div>

            <div className="form-group">
              <label>Contact</label>
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

              <button className="Stfsave-btn" onClick={handleAddCo}>
                Add Co
              </button>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default CoAssociates;