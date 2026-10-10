import { useEffect, useRef, useState } from "react";
import {
  CheckCircle,
  XCircle,
  Eye,
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

const ID_PLACEHOLDER = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

function Customer() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // MODALS
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showView, setShowView] = useState(false);

  // SELECTED
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // EDIT DATA
  const [editData, setEditData] = useState({
    name: "",
    email: "",
    address: "",
    contact_number: "",
    status: "Pending",
  });

  // ADD DATA
  const emptyAddData = {
    name: "",
    email: "",
    address: "",
    contact_number: "",
    status: "Pending",
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
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("role", "customer");

    if (error) {
      console.log(error.message);
      showToast("Failed to load customers: " + error.message, "error");
    } else {
      setCustomers(data || []);
    }
  };

  const filtered = customers.filter((c) => {
    const matchSearch =
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.user_id?.toLowerCase().includes(search.toLowerCase());

    const matchStatus = statusFilter === "All" || c.status === statusFilter;

    return matchSearch && matchStatus;
  });

const closeAdd = () => {
  setShowAdd(false);
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
        status: editData.status,
      })
      .eq("users_id", selectedCustomer.users_id);

    if (error) {
      showToast(error.message, "error");
    } else {
      showToast("Customer updated successfully!", "success");
      setShowEdit(false);
      fetchCustomers();
    }
  };

  // DELETE
  const handleDelete = async () => {
    const { error } = await supabase
      .from("users")
      .delete()
      .eq("users_id", selectedCustomer.users_id);

    if (error) {
      showToast(error.message, "error");
    } else {
      showToast("Customer deleted successfully!", "success");
      setShowDelete(false);
      fetchCustomers();
    }
  };

  // ADD CUSTOMER
  
const handleAddCustomer = async () => {
  const name = addData.name.trim();
  const email = addData.email.trim().toLowerCase();
  const address = addData.address.trim();
  const contact_number = addData.contact_number.trim();

  if (!name || !email || !address || !contact_number) {
    showToast("Please complete all customer fields.", "error");
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast("Please enter a valid email address.", "error");
    return;
  }

  const { data: lastCustomers, error: idError } = await supabase
    .from("users")
    .select("user_id")
    .eq("role", "customer")
    .order("users_id", { ascending: false })
    .limit(1);

  if (idError) {
    showToast("Failed to generate customer ID: " + idError.message, "error");
    return;
  }

  let nextNumber = 1;

  if (lastCustomers?.length && lastCustomers[0]?.user_id) {
    const numberPart = Number(lastCustomers[0].user_id.slice(-3));

    if (Number.isInteger(numberPart)) {
      nextNumber = numberPart + 1;
    }
  }

  const generatedUserId = `CUS2026${String(nextNumber).padStart(3, "0")}`;

  const { data, error } = await supabase.functions.invoke("create-customer", {
    body: {
      user_id: generatedUserId,
      name,
      email,
      address,
      contact_number,
    },
  });

  if (error) {
    let message = error.message || "Failed to send customer invitation.";

    try {
      if (error.context && typeof error.context.json === "function") {
        const details = await error.context.json();
        if (details?.error) message = details.error;
      }
    } catch {
      // Keep the original error message.
    }

    showToast(message, "error");
    return;
  }

  if (!data?.success) {
    showToast(data?.error || "Failed to create customer account.", "error");
    return;
  }

  showToast("Customer invitation sent successfully!", "success");
  closeAdd();
  setAddData(emptyAddData);
  fetchCustomers();
};
   
  // VERIFY / REJECT
  const handleUpdateStatus = async (status) => {
    if (!selectedCustomer) return;

    const { error } = await supabase
      .from("users")
      .update({ status })
      .eq("users_id", selectedCustomer.users_id);

    if (error) {
      showToast(error.message, "error");
      return;
    }

    showToast(
      status === "Verified"
        ? "Customer approved successfully!"
        : "Customer rejected successfully!",
      "success"
    );
    setShowView(false);
    fetchCustomers();
  };

  const statusLabel = (status) =>
    status === "Unverified" ? "Rejected" : status || "Pending";

  const columns = [
    {
      key: "user_id",
      label: "Customer ID",
      render: (row) => <span className="um-id-chip">{row.user_id}</span>,
    },
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "address", label: "Address" },
    { key: "contact_number", label: "Contact Info" },

    {
      key: "status",
      label: "Status",
      render: (row) => (
        <span className={`um-status ${(row.status || "pending").toLowerCase()}`}>
          {statusLabel(row.status)}
        </span>
      ),
    },

    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="um-actions">
          <button
            className="um-icon-btn view"
            title="View / Verify"
            onClick={() => {
              setSelectedCustomer(row);
              setShowView(true);
            }}
          >
            <Eye size={16} />
          </button>

          <button
            className="um-icon-btn edit"
            title="Edit"
            onClick={() => {
              setSelectedCustomer(row);
              setEditData({
                name: row.name || "",
                email: row.email || "",
                address: row.address || "",
                contact_number: row.contact_number || "",
                status: row.status || "Pending",
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
              setSelectedCustomer(row);
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
          <h1>Customers</h1>
          <p>Manage customer accounts and verify uploaded valid IDs.</p>
        </div>
      </div>

      <div className="um-toolbar">
        <div className="um-search">
          <Search size={16} />
          <input
            placeholder="Search customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="um-toolbar-right">
          <select
            className="um-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Verified">Verified</option>
            <option value="Unverified">Rejected</option>
          </select>

          <span className="um-count">
            {filtered.length} {filtered.length === 1 ? "record" : "records"}
          </span>

          <button className="um-add-btn" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Add Customer
          </button>
        </div>
      </div>

      <div className="um-table-card">
        <Table
          columns={columns}
          data={filtered}
          emptyMessage="No customers found."
        />
      </div>

      {/* ========================================== */}
      {/* VIEW / VERIFICATION MODAL                  */}
      {/* ========================================== */}
      {showView && (
        <div className="um-modal-overlay" onClick={() => setShowView(false)}>
          <div className="um-modal lg" onClick={(e) => e.stopPropagation()}>
            <div className="um-modal-header">
              <div className="um-modal-icon primary">
                <Eye size={20} />
              </div>
              <div className="um-modal-titles">
                <h2>User Verification</h2>
                <p>Review the uploaded valid ID and verify the user account.</p>
              </div>
              <button className="um-modal-close" onClick={() => setShowView(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="um-modal-body">
              <div className="um-split">
                <div className="um-id-panel">
                  <span className="um-id-title">
                    Uploaded Valid ID {selectedCustomer?.id_type ? `(${selectedCustomer.id_type})` : ""}
                  </span>
                  <div className="um-id-card">
                    <img
                      src={selectedCustomer?.valid_id || ID_PLACEHOLDER}
                      alt="Valid ID"
                    />
                  </div>
                  {selectedCustomer?.valid_id && (
                    <a
                      href={selectedCustomer.valid_id}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="um-btn ghost sm"
                    >
                      View Full Size
                    </a>
                  )}
                </div>

                <div className="um-split-fields">
                  <div className="um-field">
                    <label>Customer ID</label>
                    <input value={selectedCustomer?.user_id || ""} readOnly />
                  </div>
                  <div className="um-field">
                    <label>Name</label>
                    <input value={selectedCustomer?.name || ""} readOnly />
                  </div>
                  <div className="um-field">
                    <label>Email</label>
                    <input value={selectedCustomer?.email || ""} readOnly />
                  </div>
                  <div className="um-field">
                    <label>Contact No.</label>
                    <input value={selectedCustomer?.contact_number || ""} readOnly />
                  </div>
                  <div className="um-field">
                    <label>Address</label>
                    <input value={selectedCustomer?.address || ""} readOnly />
                  </div>
                  <div className="um-field">
                    <label>ID Type</label>
                    <input value={selectedCustomer?.id_type || "Not submitted"} readOnly />
                  </div>
                </div>
              </div>
            </div>

            <div className="um-modal-footer split">
              <button
                className="um-btn danger"
                disabled={selectedCustomer?.status === "Verified"}
                onClick={() => handleUpdateStatus("Unverified")}
              >
                Reject
              </button>
              <button
                className="um-btn success"
                disabled={selectedCustomer?.status === "Unverified" || !selectedCustomer?.valid_id}
                onClick={() => handleUpdateStatus("Verified")}
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* EDIT MODAL                                 */}
      {/* ========================================== */}
      {showEdit && (
        <div className="um-modal-overlay" onClick={() => setShowEdit(false)}>
          <div className="um-modal lg" onClick={(e) => e.stopPropagation()}>
            <div className="um-modal-header">
              <div className="um-modal-icon primary">
                <Pencil size={20} />
              </div>
              <div className="um-modal-titles">
                <h2>Edit Customer</h2>
                <p>Update the customer information and click save changes.</p>
              </div>
              <button className="um-modal-close" onClick={() => setShowEdit(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="um-modal-body">
              <div className="um-split">
                <div className="um-id-panel">
                  <span className="um-id-title">
                    Valid ID {selectedCustomer?.id_type ? `(${selectedCustomer.id_type})` : ""}
                  </span>
                  <div className="um-id-card">
                    <img
                      src={selectedCustomer?.valid_id || ID_PLACEHOLDER}
                      alt="Valid ID"
                    />
                  </div>
                  {selectedCustomer?.valid_id && (
                    <a
                      href={selectedCustomer.valid_id}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="um-btn ghost sm"
                    >
                      View Full Size
                    </a>
                  )}
                </div>

                <div className="um-split-fields">
                  <div className="um-field">
                    <label>Customer ID</label>
                    <input value={selectedCustomer?.user_id || ""} readOnly />
                  </div>
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
                    <label>Contact No.</label>
                    <input
                      value={editData.contact_number}
                      onChange={(e) =>
                        setEditData({ ...editData, contact_number: e.target.value })
                      }
                    />
                  </div>
                  <div className="um-field">
                    <label>Address</label>
                    <input
                      value={editData.address}
                      onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="um-modal-footer split">
              <button className="um-btn ghost" onClick={() => setShowEdit(false)}>
                Discard Changes
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
              <h2>Delete Customer</h2>
              <p className="um-delete-text">
                Are you sure you want to delete this customer record? This will permanently
                delete the record and all related data. This action cannot be undone.
              </p>

              <div className="um-details-box">
                <div className="um-detail-row"><span>Customer ID</span><b>{selectedCustomer?.user_id}</b></div>
                <div className="um-detail-row"><span>Name</span><b>{selectedCustomer?.name}</b></div>
                <div className="um-detail-row"><span>Email</span><b>{selectedCustomer?.email}</b></div>
                <div className="um-detail-row"><span>Address</span><b>{selectedCustomer?.address || "-"}</b></div>
                <div className="um-detail-row"><span>Contact No.</span><b>{selectedCustomer?.contact_number || "-"}</b></div>
              </div>
            </div>

            <div className="um-modal-footer split">
              <button className="um-btn ghost" onClick={() => setShowDelete(false)}>
                Cancel
              </button>
              <button className="um-btn danger" onClick={handleDelete}>
                Delete Customer
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
              <div className="um-1`````-titles">
                <h2>Add Customer</h2>
                <p>Create a new customer account.</p>
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
                <label>Address</label>
                <input
                  value={addData.address}
                  onChange={(e) => setAddData({ ...addData, address: e.target.value })}
                />
              </div>

              <div className="um-field-row">
                <div className="um-field">
                  <label>Contact No.</label>
                  <input
                    value={addData.contact_number}
                    onChange={(e) =>
                      setAddData({ ...addData, contact_number: e.target.value })
                    }
                  />
                </div>
                <div className="um-field">
                  <label>Status</label>
                  <input value="Pending" disabled />
                </div>
              </div>
            </div>

            <div className="um-modal-footer">
              <button className="um-btn ghost" onClick={closeAdd}>
                Cancel
              </button>
              <button className="um-btn primary" onClick={handleAddCustomer}>
                Add Customer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default Customer;
