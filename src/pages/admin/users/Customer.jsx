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

function Customer() {

  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // MODALS
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showView, setShowView] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [toast, setToast] = useState({
  message: "",
  type: "",
  show: false,
});
  

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
const [addData, setAddData] = useState({
  name: "",
  email: "",
  password: "", // ADD THIS
  address: "",
  contact_number: "",
  status: "Pending",
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
    fetchCustomers();
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

  const fetchCustomers = async () => {

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("role", "customer");

    if (error) {
      console.log(error.message);
    } else {
      setCustomers(data);
    }
  };

  const filtered = customers.filter((c) => {

    const matchSearch =
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.user_id?.toLowerCase().includes(search.toLowerCase());

    const matchStatus =
      statusFilter === "All" || c.status === statusFilter;

    return matchSearch && matchStatus;
  });

  // UPDATE
  const handleSaveChanges = async () => {

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
  showToast("Deleted successfully!", "success");
  setShowDelete(false);
  fetchCustomers();
}
  };

   // ADD CUSTOMER
const handleAddCustomer = async () => {
const passError = validatePassword(addData.password);

if (passError) {
  setPasswordError(passError);
  showToast(passError, "error");
  return;
}

  // GET LAST Customer ID
  const { data: lastCustomer } = await supabase
    .from("users")
    .select("user_id")
    .eq("role", "customer")
    .order("users_id", { ascending: false })
    .limit(1)
    .single();

  let nextNumber = 1;

  // IF MAY EXISTING Customer
  if (lastCustomer?.user_id) {

    // STF2026001 -> 001
    const numberPart = lastCustomer.user_id.slice(-3);

    nextNumber = parseInt(numberPart) + 1;
  }

  // GENERATE USER ID
  const generatedUserId =
    `CUS2026${String(nextNumber).padStart(3, "0")}`;

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
        role: "customer",
        status: "Pending",
      },
    ]);

 if (error) {

  showToast(error.message, "error");

} else {

  showToast("Customer added successfully!", "success");

    setShowAdd(false);

    setAddData({
      name: "",
      email: "",
      password: "",
      address: "",
      contact_number: "",
    });

    fetchCustomers();
  }
};

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

showToast(`Customer ${status} successfully!`, "success");
  setShowView(false);
  fetchCustomers(); // refresh table
};

  const columns = [
    { key: "user_id", label: "Customer ID" },
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "address", label: "Address" },
    { key: "contact_number", label: "Contact Info" },

    {
      key: "status",
      label: "Status",
      render: (row) => (
        <span className={`status ${row.status?.toLowerCase()}`}>
          {row.status}
        </span>
      ),
    },

    {
      key: "actions",
      label: "Actions",

      render: (row) => (

        <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>

          {/* VIEW */}
          <button
            onClick={() => {
              setSelectedCustomer(row);
              setShowView(true);
            }}
            style={{
              padding: "4px 8px",
              fontSize: "12px",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              backgroundColor: "#2563eb",
              color: "white",
              width: "40px"
            }}
          >
           <Eye size={18} />
          </button>

          {/* EDIT */}
          <button
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
            style={{
              padding: "4px 8px",
              fontSize: "12px",
              border: "none",
              borderRadius: "4px",
              backgroundColor: "#f59e0b",
              color: "white",
              cursor: "pointer",
              width: "40px"
            }}
          >
             <Pencil size={18} />
          </button>

          {/* DELETE */}
          <button
            onClick={() => {
              setSelectedCustomer(row);
              setShowDelete(true);
            }}
            style={{
              padding: "4px 8px",
              fontSize: "12px",
              border: "none",
              borderRadius: "4px",
              backgroundColor: "#ef4444",
              color: "white",
              cursor: "pointer",
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
        <h1>Customers</h1>
      </div>

      <div className="controls-row">

        <div className="controls-left"></div>

        <div className="controls-right">

          <input
            placeholder="Search customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Verified">Verified</option>
            <option value="Rejected">Rejected</option>
          </select>

          <button
            className="cusadd-btn"
            onClick={() => setShowAdd(true)}
          >
            + Add Customer
          </button>

        </div>

      </div>

      <Table
        columns={columns}
        data={filtered}
        emptyMessage="No customers found."
      />

      {/* ========================= */}
      {/* VIEW MODAL */}
      {/* ========================= */}

      {showView && (

        <div className="customer-edit-overlay">

          <div className="customer-edit-modal">

            {/* HEADER */}
            <div className="customer-edit-header">

              <h2>User Verification</h2>

              <p>
                Review the uploaded valid ID and verify the user account
              </p>

              <span
                className="customer-edit-close"
                onClick={() => setShowView(false)}
              >
                ✕
              </span>

            </div>

            {/* BODY */}
            <div className="customer-edit-body">

              {/* LEFT */}
              <div className="customer-edit-left">

            <h3 className="customer-edit-id-title">
              Uploaded Valid ID
             </h3>

                <div className="customer-edit-image-box">

                  <img
                    src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
                    alt="profile"
                  />

                </div>

                <button className="customer-edit-view-btn">
                  🔍 View Full Size
                </button>

              </div>

              {/* DIVIDER */}
              <div className="customer-edit-divider"></div>

              {/* RIGHT */}
              <div className="customer-edit-right">

                <div className="customer-edit-group">
                  <label>Customer ID</label>
                  <input
                    value={selectedCustomer?.user_id || ""}
                    readOnly
                  />
                </div>

                <div className="customer-edit-group">
                  <label>Name</label>
                  <input
                    value={selectedCustomer?.name || ""}
                    readOnly
                  />
                </div>

                <div className="customer-edit-group">
                  <label>Email</label>
                  <input
                    value={selectedCustomer?.email || ""}
                    readOnly
                  />
                </div>

                <div className="customer-edit-group">
                  <label>Contact No.</label>
                  <input
                    value={selectedCustomer?.contact_number || ""}
                    readOnly
                  />
                </div>

                <div className="customer-edit-group">
                  <label>Address</label>
                  <input
                    value={selectedCustomer?.address || ""}
                    readOnly
                  />
                </div>

              </div>

            </div>

            {/* FOOTER */}
            <div className="customer-edit-footer">

          <button
          className="customer-edit-discard"
          disabled={selectedCustomer?.status === "Verified"}
          style={{
            opacity: selectedCustomer?.status === "Verified" ? 0.5 : 1,
            cursor: selectedCustomer?.status === "Verified" ? "not-allowed" : "pointer"
          }}
          onClick={() => handleUpdateStatus("Unverified")}
          > ❌ Reject </button>

        <button
          className="customer-edit-save"
          disabled={selectedCustomer?.status === "Unverified"}
          style={{
          opacity: selectedCustomer?.status === "Unverified" ? 0.5 : 1,
          cursor: selectedCustomer?.status === "Unverified" ? "not-allowed" : "pointer"
        }}
          onClick={() => handleUpdateStatus("Verified")}
        > ✅ Approve </button>

</div>

          </div>

        </div>
      )}

      {/* ========================= */}
      {/* EDIT CUSTOMER */}
      {/* ========================= */}

      {showEdit && (

        <div className="customer-edit-overlay">

          <div className="customer-edit-modal">

            {/* HEADER */}
            <div className="customer-edit-header">

              <h2>Edit Customer</h2>

              <p>
                Update the customer information and click save changes
              </p>

              <span
                className="customer-edit-close"
                onClick={() => setShowEdit(false)}
              >
                ✕
              </span>

            </div>

            {/* BODY */}
            <div className="customer-edit-body">

              {/* LEFT */}
              <div className="customer-edit-left">

                <div className="customer-edit-image-box">

                  <img
                    src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
                    alt="profile"
                  />

                </div>

                <button className="customer-edit-view-btn">
                  🔍 View Full Size
                </button>

              </div>

              {/* DIVIDER */}
              <div className="customer-edit-divider"></div>

              {/* RIGHT */}
              <div className="customer-edit-right">

                <div className="customer-edit-group">
                  <label>Customer ID</label>

                  <input
                    value={selectedCustomer?.user_id || ""}
                    readOnly
                  />
                </div>

                <div className="customer-edit-group">
                  <label>Name</label>

                  <input
                    value={editData.name}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        name: e.target.value
                      })
                    }
                  />
                </div>

                <div className="customer-edit-group">
                  <label>Email</label>

                  <input
                    value={editData.email}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        email: e.target.value
                      })
                    }
                  />
                </div>

                <div className="customer-edit-group">
                  <label>Contact No.</label>

                  <input
                    value={editData.contact_number}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        contact_number: e.target.value
                      })
                    }
                  />
                </div>

                <div className="customer-edit-group">
                  <label>Address</label>

                  <input
                    value={editData.address}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        address: e.target.value
                      })
                    }
                  />
                </div>

              </div>

            </div>

            {/* FOOTER */}
            <div className="customer-edit-footer">

              <button
                className="customer-edit-discard"
                onClick={() => setShowEdit(false)}
              >
                ❌ Discard Changes
              </button>

              <button
                className="customer-edit-save"
                onClick={handleSaveChanges}
              >
                ✅ Save Changes
              </button>

            </div>

          </div>

        </div>
      )}

      {/* ========================= */}
      {/* DELETE MODAL */}
      {/* ========================= */}

      {showDelete && (

        <div className="modal-overlay">

          <div className="delete-modal">

            <span
              className="close-btn"
              onClick={() => setShowDelete(false)}
            >
              ✕
            </span>

            <h1>Delete Customer</h1>
           <p className="delete-subtitle">
            Are you sure you want to delete this staff record?
          </p>

            <div className="warning-box">

              <h3>⚠ Warning</h3>

              <p>
                This will permanently delete the staff record and all related data. This action cannot be undone.
              </p>

              <hr />

              <div className="delete-info">

                <p>
                  <b>ID:</b> {selectedCustomer?.user_id}
                </p>

                <p>
                  <b>Name:</b> {selectedCustomer?.name}
                </p>

                <p>
                  <b>Email:</b> {selectedCustomer?.email}
                </p>

                 <p>
                  <b>Address:</b> {selectedCustomer?.address}
                </p>

                 <p>
                  <b>Contact No.:</b> {selectedCustomer?.contact_number}
                </p>

              </div>

            </div>

            <div className="modal-actions">

              <button
                className="cancel-dark"
                onClick={() => setShowDelete(false)}
              >
                Cancel
              </button>

              <button
                className="delete-btn"
                onClick={handleDelete}
              >
                Delete
              </button>

            </div>

          </div>

        </div>
      )}

      {/* ========================= */}
      {/* ADD MODAL */}
      {/* ========================= */}

      {showAdd && (

        <div className="modal-overlay">

          <div className="edit-modal">

            <span
              className="close-btn"
              onClick={() => setShowAdd(false)}
            >
              ✕
            </span>

            <h2>Add Customer</h2>

            <div className="form-group">

              <label>Name</label>

              <input
                value={addData.name}
                onChange={(e) =>
                  setAddData({
                    ...addData,
                    name: e.target.value
                  })
                }
              />

            </div>

            <div className="form-group">

              <label>Email</label>

              <input
                value={addData.email}
                onChange={(e) =>
                  setAddData({
                    ...addData,
                    email: e.target.value
                  })
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
                  setAddData({
                    ...addData,
                    contact_number: e.target.value
                  })
                }
              />

            </div>

            <div className="form-group">
              <label>Status</label>

              <input
                value="Pending"
                disabled
              />
            </div>

            <div className="modal-actions">

              <button
                className="Stfcancel-btn"
                onClick={() => setShowAdd(false)}
              >
                Cancel
              </button>

              <button
                className="Stfsave-btn"
                onClick={handleAddCustomer}
              >
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