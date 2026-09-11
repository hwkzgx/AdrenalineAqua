import { useEffect, useState } from "react";
import "../../../styles/user-management.css";
import Table from "../../../components/Table";
import "./staff-customer.css";
import { supabase } from "../../../supabase";

import {
  Eye,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

function StaffCustomers() {

  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // MODALS
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

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
    password: "",
    address: "",
    contact_number: "",
    status: "Pending",
  });

  // FETCH CUSTOMERS
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
    } else {
      setCustomers(data);
    }
  };

  // FILTER
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

      alert(error.message);

    } else {

      alert("Updated successfully!");
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

      alert(error.message);

    } else {

      alert("Deleted successfully!");
      setShowDelete(false);
      fetchCustomers();
    }
  };

  // ADD CUSTOMER
  const handleAddCustomer = async () => {

    const { data: lastCustomer } = await supabase
      .from("users")
      .select("user_id")
      .eq("role", "customer")
      .order("users_id", { ascending: false })
      .limit(1)
      .single();

    let nextNumber = 1;

    if (lastCustomer?.user_id) {

      const numberPart = lastCustomer.user_id.slice(-3);

      nextNumber = parseInt(numberPart) + 1;
    }

    const generatedUserId =
      `CUS2026${String(nextNumber).padStart(3, "0")}`;

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

      alert(error.message);

    } else {

      alert("Customer added successfully!");

      setShowAdd(false);

      setAddData({
        name: "",
        email: "",
        password: "",
        address: "",
        contact_number: "",
        status: "Pending",
      });

      fetchCustomers();
    }
  };

  // UPDATE STATUS
  const handleUpdateStatus = async (status) => {

    if (!selectedCustomer) return;

    const { error } = await supabase
      .from("users")
      .update({ status })
      .eq("users_id", selectedCustomer.users_id);

    if (error) {

      alert(error.message);
      return;
    }

    setShowView(false);
    fetchCustomers();
  };

  // TABLE COLUMNS
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

        <div
          style={{
            display: "flex",
            gap: "6px",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {/* EDIT */}
          <button
            type="button"
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
              width: "40px",
              pointerEvents: "auto",
              zIndex: 999,
              position: "relative",
            }}
          >
            <Pencil size={18} />
          </button>

          {/* DELETE */}
          <button
            type="button"
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
              width: "40px",
              pointerEvents: "auto",
              zIndex: 999,
              position: "relative",
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

      {/* EDIT MODAL */}
      {showEdit && (
        <div className="StfCusmodal-overlay">

          <div className="StfCusedit-modal">

            <span
              className="StfCusclose-btn"
              onClick={() => setShowEdit(false)}
            >
              ✕
            </span>

            <h2>Edit Customer</h2>

            <div className="StfCusform-group">
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

            <div className="StfCusform-group">
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

            <div className="StfCusform-group">
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

            <div className="StfCusform-group">
              <label>Contact</label>

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

            <div className="StfCusmodal-actions">

              <button
                className="StfCuscancel-dark"
                onClick={() => setShowEdit(false)}
              >
                Cancel
              </button>

              <button
                className="StfCussave-btn"
                onClick={handleSaveChanges}
              >
                Save Changes
              </button>

            </div>

          </div>

        </div>
      )}

      {/* DELETE MODAL */}
      {showDelete && (

        <div className="StfCusmodal-overlay">

          <div className="StfCusdelete-modal">

            <span
              className="StfCusclose-btn"
              onClick={() => setShowDelete(false)}
            >
              ✕
            </span>

            <h1>Delete Customer</h1>
            <h6>Are you sure you want to delete this customer record?</h6>

            <div className="StfCuswarning-box">

              <h3>⚠ Warning</h3>

              <p>
                This will permanently delete the staff record and all related data. This action cannot be undone.
              </p>

              <hr />

              <div className="StfCusdelete-info">

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

            <div className="StfCusmodal-actions">

              <button
                className="StfCuscancel-dark"
                onClick={() => setShowDelete(false)}
              >
                Cancel
              </button>

              <button
                className="StfCusdelete-btn"
                onClick={handleDelete}
              >
                Delete
              </button>

            </div>

          </div>

        </div>
      )}

      {/* ADD MODAL */}
{showAdd && (
  <div className="StfCusmodal-overlay">

    <div className="StfCusadd-modal">

      <span
        className="StfCusclose-btn"
        onClick={() => setShowAdd(false)}
      >
        ✕
      </span>

      <h2>Add Customer</h2>

      <div className="StfCusform-group">
        <label>Name</label>

        <input
          value={addData.name}
          onChange={(e) =>
            setAddData({
              ...addData,
              name: e.target.value,
            })
          }
        />
      </div>

      <div className="StfCusform-group">
        <label>Email</label>

        <input
          value={addData.email}
          onChange={(e) =>
            setAddData({
              ...addData,
              email: e.target.value,
            })
          }
        />
      </div>

      <div className="StfCusform-group">
        <label>Password</label>

        <input
          type="password"
          value={addData.password}
          onChange={(e) =>
            setAddData({
              ...addData,
              password: e.target.value,
            })
          }
        />
      </div>

      <div className="StfCusform-group">
        <label>Address</label>

        <input
          value={addData.address}
          onChange={(e) =>
            setAddData({
              ...addData,
              address: e.target.value,
            })
          }
        />
      </div>

      <div className="StfCusform-group">
        <label>Contact Number</label>

        <input
          value={addData.contact_number}
          onChange={(e) =>
            setAddData({
              ...addData,
              contact_number: e.target.value,
            })
          }
        />
      </div>

      <div className="StfCusmodal-actions">

        <button
          className="StfCuscancel-dark"
          onClick={() => setShowAdd(false)}
        >
          Cancel
        </button>

        <button
          className="StfCussave-btn"
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

export default StaffCustomers;