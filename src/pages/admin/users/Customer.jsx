import { useEffect, useRef, useState } from "react";
import {
  CheckCircle,
  XCircle,
  Eye,
  Plus,
  Pencil,
  Archive,
  RotateCcw,
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
  const [viewMode, setViewMode] = useState("Active"); // Active | Archived
  const [statusFilter, setStatusFilter] = useState("All");

  // MODALS
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showView, setShowView] = useState(false);

  // SELECTED
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // REJECT (kailangan ng reason)
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState("");

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
    if ((viewMode === "Archived") !== !!c.is_archived) return false;

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

  // ARCHIVE (hindi binubura: nananatili ang data na naka-link sa kanya)
  const handleDelete = async () => {
    const { error } = await supabase
      .from("users")
      .update({ is_archived: true, archived_at: new Date().toISOString() })
      .eq("users_id", selectedCustomer.users_id);

    if (error) {
      showToast(error.message, "error");
    } else {
      showToast("Customer archived successfully!", "success");
      setShowDelete(false);
      fetchCustomers();
    }
  };

  // RESTORE (ibalik mula sa archive)
  const handleRestore = async (row) => {
    const { error } = await supabase
      .from("users")
      .update({ is_archived: false, archived_at: null })
      .eq("users_id", row.users_id);

    if (error) {
      showToast(error.message, "error");
    } else {
      showToast("Customer restored successfully!", "success");
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

    let reason = null;
    if (status === "Unverified") {
      reason = rejectReason.trim();
      if (!reason) {
        setRejectError("Please enter the reason for rejecting this account.");
        return;
      }
    }

    const { error } = await supabase
      .from("users")
      .update({ status, rejection_reason: reason })
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
    closeView();
    fetchCustomers();
  };

  const closeView = () => {
    setShowView(false);
    setRejectMode(false);
    setRejectReason("");
    setRejectError("");
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
              setRejectMode(false);
              setRejectReason("");
              setRejectError("");
              setShowView(true);
            }}
          >
            <Eye size={16} />
          </button>

          {!row.is_archived && (
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
          )}

          {row.is_archived ? (
            <button
              className="um-icon-btn view"
              title="Restore"
              onClick={() => handleRestore(row)}
            >
              <RotateCcw size={16} />
            </button>
          ) : (
            <button
              className="um-icon-btn delete"
              title="Archive"
              onClick={() => {
                setSelectedCustomer(row);
                setShowDelete(true);
              }}
            >
              <Archive size={16} />
            </button>
          )}
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

          <select
            className="um-select"
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
          >
            <option value="Active">Active</option>
            <option value="Archived">Archived</option>
          </select>

          <span className="um-count">
            {filtered.length} {filtered.length === 1 ? "record" : "records"}
          </span>
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
        <div className="um-modal-overlay" onClick={closeView}>
          <div className="um-modal lg" onClick={(e) => e.stopPropagation()}>
            <div className="um-modal-header">
              <div className="um-modal-icon primary">
                <Eye size={20} />
              </div>
              <div className="um-modal-titles">
                <h2>User Verification</h2>
                <p>Review the uploaded valid ID and verify the user account.</p>
              </div>
              <button className="um-modal-close" onClick={closeView}>
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

                  {/* Reason ng pagka-reject (nakikita lang kapag Rejected) */}
                  {selectedCustomer?.status === "Unverified" && !rejectMode && (
                    <div className="um-field">
                      <label>Rejection Reason</label>
                      <textarea
                        rows={3}
                        readOnly
                        value={selectedCustomer?.rejection_reason || "No reason provided."}
                        style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#fef2f2", resize: "none" }}
                      />
                    </div>
                  )}

                  {/* Reason na kailangang ilagay bago i-reject */}
                  {rejectMode && (
                    <div className="um-field">
                      <label>Reason for rejection *</label>
                      <textarea
                        rows={3}
                        autoFocus
                        value={rejectReason}
                        onChange={(e) => {
                          setRejectReason(e.target.value);
                          setRejectError("");
                        }}
                        placeholder="e.g. ID is blurry, name does not match, expired ID..."
                        style={{ width: "100%", padding: "8px", borderRadius: "8px", border: `1px solid ${rejectError ? "#ef4444" : "#e2e8f0"}`, resize: "vertical" }}
                      />
                      {rejectError && (
                        <span style={{ color: "#ef4444", fontSize: "12px", display: "block", marginTop: "4px" }}>
                          {rejectError}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="um-modal-footer split">
              {rejectMode ? (
                <>
                  <button
                    className="um-btn ghost"
                    onClick={() => {
                      setRejectMode(false);
                      setRejectReason("");
                      setRejectError("");
                    }}
                  >
                    Back
                  </button>
                  <button className="um-btn danger" onClick={() => handleUpdateStatus("Unverified")}>
                    Confirm Reject
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="um-btn danger"
                    disabled={selectedCustomer?.status === "Verified"}
                    onClick={() => setRejectMode(true)}
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
                </>
              )}
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
                      onError={(e) => {
                        // kapag sira o hindi ma-load ang URL, bumalik sa placeholder
                        console.log("Valid ID failed to load:", selectedCustomer?.valid_id);
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = ID_PLACEHOLDER;
                      }}
                    />
                  </div>
                  {!selectedCustomer?.valid_id && (
                    <span style={{ fontSize: 12, color: "#888" }}>
                      No valid ID uploaded yet.
                    </span>
                  )}
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
              <h2>Archive Customer</h2>
              <p className="um-delete-text">
                Archive this customer? The account will be hidden from the active list and can no longer be used, but all linked records (orders, deliveries, history) are kept. You can restore it anytime from the Archived view.
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
                Archive Customer
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
