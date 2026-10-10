import { useEffect, useRef, useState } from "react";
import {
  CheckCircle,
  XCircle,
  Plus,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
  Search,
} from "lucide-react";
import "../../../styles/user-management.css";
import "./staff.css";
import Table from "../../../components/Table";
import { supabase } from "../../../supabase";

function Rider() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");

  // MODALS
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // SELECTED
  const [selected, setSelected] = useState(null);

  // EDIT FORM DATA
  const [editData, setEditData] = useState({
    name: "",
    email: "",
    address: "",
    contact_number: "",
  });

  // ADD FORM DATA
  const emptyAddData = {
    name: "",
    email: "",
    password: "",
    address: "",
    contact_number: "",
  };
  const [addData, setAddData] = useState(emptyAddData);

  // ===============================
  // TOAST
  // ===============================
  const [toast, setToast] = useState({
    message: "",
    type: "success",
    show: false,
  });
  const toastTimer = useRef(null);

  const showToast = (message, type = "success") => {
    clearTimeout(toastTimer.current);
    setToast({ message, type, show: true });
    toastTimer.current = setTimeout(() => {
      setToast({ message: "", type: "success", show: false });
    }, 3000);
  };

  useEffect(() => {
    return () => clearTimeout(toastTimer.current);
  }, []);

  useEffect(() => {
    fetchData();
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

  const fetchData = async () => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("role", "rider");

    if (error) {
      console.log(error.message);
      showToast("Failed to load riders: " + error.message, "error");
    } else {
      setItems(data || []);
    }
  };

  // SEARCH FILTER
  const filtered = items.filter((i) => {
    return (
      i.name?.toLowerCase().includes(search.toLowerCase()) ||
      i.user_id?.toLowerCase().includes(search.toLowerCase())
    );
  });

  const closeAdd = () => {
    setShowAdd(false);
    setPasswordError("");
  };

  // UPDATE
  const handleSaveChanges = async () => {
    if (!editData.name.trim() || !editData.email.trim()) {
      showToast("Name and email are required.", "error");
      return;
    }

    const { error } = await supabase
      .from("users")
      .update({
        name: editData.name,
        email: editData.email,
        address: editData.address,
        contact_number: editData.contact_number,
      })
      .eq("users_id", selected.users_id);

    if (error) {
      showToast(error.message, "error");
    } else {
      showToast("Rider updated successfully!", "success");
      setShowEdit(false);
      fetchData();
    }
  };

  // DELETE
  const handleDelete = async () => {
    const { error } = await supabase
      .from("users")
      .delete()
      .eq("users_id", selected.users_id);

    if (error) {
      showToast(error.message, "error");
    } else {
      showToast("Rider deleted successfully!", "success");
      setShowDelete(false);
      fetchData();
    }
  };

  // ADD
  const handleAdd = async () => {
    if (!addData.name.trim() || !addData.email.trim()) {
      showToast("Name and email are required.", "error");
      return;
    }

    const passError = validatePassword(addData.password);

    if (passError) {
      setPasswordError(passError);
      showToast(passError, "error");
      return;
    }

    // GET LAST ID
    const { data: lastItem } = await supabase
      .from("users")
      .select("user_id")
      .eq("role", "rider")
      .order("users_id", { ascending: false })
      .limit(1)
      .single();

    let nextNumber = 1;

    if (lastItem?.user_id) {
      const numberPart = lastItem.user_id.slice(-3);
      nextNumber = parseInt(numberPart) + 1;
    }

    const generatedUserId = `RDR2026${String(nextNumber).padStart(3, "0")}`;

   const { data: authData, error: authError } =
  await supabase.auth.signUp({
    email: addData.email,
    password: addData.password,
    options: {
      emailRedirectTo: `${window.location.origin}/rider/riderlogin`,
    },
  });

if (authError) {
  showToast(authError.message, "error");
  return;
}

    const { error } = await supabase.from("users").insert([
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
      closeAdd();
      setAddData(emptyAddData);
      fetchData();
    }
  };

  // TABLE COLUMNS
  const columns = [
    {
      key: "user_id",
      label: "Rider ID",
      render: (row) => <span className="um-id-chip">{row.user_id}</span>,
    },
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "address", label: "Address" },
    { key: "contact_number", label: "Contact Info" },

    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="um-actions">
          <button
            className="um-icon-btn edit"
            title="Edit"
            onClick={() => {
              setSelected(row);
              setEditData({
                name: row.name || "",
                email: row.email || "",
                address: row.address || "",
                contact_number: row.contact_number || "",
              });
              setShowEdit(true);
            }}
          >
            <Pencil size={16} />
          </button>

          <button
            className="um-icon-btn delete"
            title="Delete"
            onClick={() => {
              setSelected(row);
              setShowDelete(true);
            }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="page um-page">
      {/* TOAST */}
      {toast.show && (
        <div className={`um-toast ${toast.type}`}>
          <div className="um-toast-icon">
            {toast.type === "success" ? (
              <CheckCircle size={20} />
            ) : (
              <XCircle size={20} />
            )}
          </div>
          <div className="um-toast-text">{toast.message}</div>
        </div>
      )}

      <div className="um-page-header">
        <div>
          <h1>Riders</h1>
          <p>Manage rider accounts and contact details.</p>
        </div>
      </div>

      <div className="um-toolbar">
        <div className="um-search">
          <Search size={16} />
          <input
            placeholder="Search rider..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="um-toolbar-right">
          <span className="um-count">
            {filtered.length} {filtered.length === 1 ? "record" : "records"}
          </span>
          <button className="um-add-btn" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Add Rider
          </button>
        </div>
      </div>

      <div className="um-table-card">
        <Table
          columns={columns}
          data={filtered}
          emptyMessage="No riders found."
        />
      </div>

      {/* ========================================== */}
      {/* EDIT MODAL                                 */}
      {/* ========================================== */}
      {showEdit && (
        <div className="um-modal-overlay" onClick={() => setShowEdit(false)}>
          <div className="um-modal" onClick={(e) => e.stopPropagation()}>
            <div className="um-modal-header">
              <div className="um-modal-icon primary">
                <Pencil size={20} />
              </div>
              <div className="um-modal-titles">
                <h2>Edit Rider</h2>
                <p>{selected?.user_id}</p>
              </div>
              <button className="um-modal-close" onClick={() => setShowEdit(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="um-modal-body">
              <div className="um-field">
                <label>Name</label>
                <input
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                />
              </div>

              <div className="um-field">
                <label>Email</label>
                <input
                  type="email"
                  value={editData.email}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                />
              </div>

              <div className="um-field">
                <label>Address</label>
                <input
                  value={editData.address}
                  onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                />
              </div>

              <div className="um-field">
                <label>Contact No.</label>
                <input
                  value={editData.contact_number}
                  onChange={(e) => setEditData({ ...editData, contact_number: e.target.value })}
                />
              </div>
            </div>

            <div className="um-modal-footer">
              <button className="um-btn ghost" onClick={() => setShowEdit(false)}>
                Cancel
              </button>
              <button className="um-btn primary" onClick={handleSaveChanges}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* DELETE MODAL                               */}
      {/* ========================================== */}
      {showDelete && (
        <div className="um-modal-overlay" onClick={() => setShowDelete(false)}>
          <div className="um-modal sm" onClick={(e) => e.stopPropagation()}>
            <div className="um-delete-body">
              <div className="um-delete-icon">
                <AlertTriangle size={28} />
              </div>
              <h2>Delete Rider</h2>
              <p className="um-delete-text">
                Are you sure you want to delete this rider record? This will permanently
                delete the record and all related data. This action cannot be undone.
              </p>

              <div className="um-details-box">
                <div className="um-detail-row"><span>Rider ID</span><b>{selected?.user_id}</b></div>
                <div className="um-detail-row"><span>Name</span><b>{selected?.name}</b></div>
                <div className="um-detail-row"><span>Email</span><b>{selected?.email}</b></div>
                <div className="um-detail-row"><span>Address</span><b>{selected?.address || "-"}</b></div>
                <div className="um-detail-row"><span>Contact</span><b>{selected?.contact_number || "-"}</b></div>
              </div>
            </div>

            <div className="um-modal-footer split">
              <button className="um-btn ghost" onClick={() => setShowDelete(false)}>
                No, Cancel
              </button>
              <button className="um-btn danger" onClick={handleDelete}>
                Delete Rider
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* ADD MODAL                                  */}
      {/* ========================================== */}
      {showAdd && (
        <div className="um-modal-overlay" onClick={closeAdd}>
          <div className="um-modal" onClick={(e) => e.stopPropagation()}>
            <div className="um-modal-header">
              <div className="um-modal-icon primary">
                <Plus size={22} />
              </div>
              <div className="um-modal-titles">
                <h2>Add Rider</h2>
                <p>Create a new rider account.</p>
              </div>
            </div>

            <div className="um-modal-body">
              <div className="um-field">
                <label>Name</label>
                <input
                  value={addData.name}
                  onChange={(e) => setAddData({ ...addData, name: e.target.value })}
                />
              </div>

              <div className="um-field">
                <label>Email</label>
                <input
                  type="email"
                  value={addData.email}
                  onChange={(e) => setAddData({ ...addData, email: e.target.value })}
                />
              </div>

              <div className="um-field">
                <label>Password</label>
                <input
                  type="password"
                  className={passwordError ? "invalid" : ""}
                  value={addData.password}
                  onChange={(e) => {
                    const value = e.target.value;
                    setAddData({ ...addData, password: value });
                    setPasswordError(validatePassword(value));
                  }}
                />
                {passwordError && <span className="um-error">{passwordError}</span>}
              </div>

              <div className="um-field">
                <label>Address</label>
                <input
                  value={addData.address}
                  onChange={(e) => setAddData({ ...addData, address: e.target.value })}
                />
              </div>

              <div className="um-field">
                <label>Contact No.</label>
                <input
                  value={addData.contact_number}
                  onChange={(e) => setAddData({ ...addData, contact_number: e.target.value })}
                />
              </div>
            </div>

            <div className="um-modal-footer">
              <button className="um-btn ghost" onClick={closeAdd}>
                Cancel
              </button>
              <button className="um-btn primary" onClick={handleAdd}>
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
