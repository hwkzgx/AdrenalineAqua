import { useState, useEffect } from "react";
import "./staff-inventory.css";
import Table from "../../../components/Table";
import { supabase } from "../../../supabase";
import { Plus, Pencil, Trash2, AlertTriangle, PackageX, Layers, X } from "lucide-react";

function StaffInventory() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sortField, setSortField] = useState("item_name"); 
  const [sortOrder, setSortOrder] = useState("asc");
  const [selectedItems, setSelectedItems] = useState([]);

  // MODALS CONTROL STATES
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showRestock, setShowRestock] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false); // Bagong state para sa delete modal
  const [deleteMode, setDeleteMode] = useState("single"); // "single" o "bulk"
  const [selectedItem, setSelectedItem] = useState(null);

  // FORM INITIAL STATES
  const [formData, setFormData] = useState({
    item_name: "",
    category: "Water",
    price: "",
    quantity: "",
    reorder_level: 10,
  });
  const [restockQty, setRestockQty] = useState("");

  useEffect(() => {
    fetchInventory();
  }, []);

  // FETCH DATA FROM SUPABASE
  const fetchInventory = async () => {
    const { data, error } = await supabase
      .from("inventory")
      .select("*")
      .order("item_name", { ascending: true });

    if (error) {
      console.error("Error fetching inventory:", error.message);
      return;
    }
    setItems(data || []);
  };

  // AUTOMATED INVENTORY CODE GENERATOR
  const generateItemCode = async () => {
    const year = new Date().getFullYear();
    const { data } = await supabase
      .from("inventory")
      .select("inventory_code")
      .like("inventory_code", `INV${year}%`)
      .order("inventory_code", { ascending: false })
      .limit(1);

    let next = 1;
    if (data?.length > 0) {
      const last = data[0].inventory_code;
      next = Number(last.replace(`INV${year}`, "")) + 1;
    }
    return `INV${year}${String(next).padStart(3, "0")}`;
  };

  // INSERT: ADD NEW PRODUCT
  const handleAddProduct = async () => {
    if (!formData.item_name || !formData.price || formData.quantity === "") {
      alert("Please fill in all required fields.");
      return;
    }

    const itemCode = await generateItemCode();

    const { error } = await supabase.from("inventory").insert([
      {
        inventory_code: itemCode,
        item_name: formData.item_name,
        category: formData.category,
        price: Number(formData.price),
        quantity_available: Number(formData.quantity),
        reorder_level: Number(formData.reorder_level),
        last_updated: new Date().toISOString(),
      },
    ]);

    if (error) {
      alert("Error adding product: " + error.message);
    } else {
      alert("Product added successfully!");
      setShowAdd(false);
      resetForm();
      fetchInventory();
    }
  };

  // UPDATE: EDIT ITEM DETAILS
  const handleEditProduct = async () => {
    const { error } = await supabase
      .from("inventory")
      .update({
        item_name: formData.item_name,
        category: formData.category,
        price: Number(formData.price),
        reorder_level: Number(formData.reorder_level),
        last_updated: new Date().toISOString(),
      })
      .eq("inventory_code", selectedItem.inventory_code);

    if (error) {
      alert("Update failed: " + error.message);
    } else {
      alert("Product updated successfully!");
      setShowEdit(false);
      fetchInventory();
    }
  };

  // UPDATE: STOCK IN / RESTOCK
  const handleRestock = async () => {
    if (!restockQty || Number(restockQty) <= 0) {
      alert("Enter a valid quantity.");
      return;
    }

    const newQty = Number(selectedItem.quantity_available) + Number(restockQty);

    const { error } = await supabase
      .from("inventory")
      .update({ 
        quantity_available: newQty,
        last_updated: new Date().toISOString()
      })
      .eq("inventory_code", selectedItem.inventory_code);

    if (error) {
      alert("Restock failed: " + error.message);
    } else {
      alert("Stock updated successfully!");
      setShowRestock(false);
      setRestockQty("");
      fetchInventory();
    }
  };

  // BUKSAN ANG DELETE MODAL (Single Item)
  const openSingleDeleteModal = (item) => {
    setSelectedItem(item);
    setDeleteMode("single");
    setShowDeleteModal(true);
  };

  // BUKSAN ANG DELETE MODAL (Bulk Items)
  const openBulkDeleteModal = () => {
    setDeleteMode("bulk");
    setShowDeleteModal(true);
  };

  // PROCEED TO DATABASE DELETION
  const handleConfirmDelete = async () => {
    if (deleteMode === "single") {
      // Single Delete Logic
      const { error } = await supabase
        .from("inventory")
        .delete()
        .eq("inventory_code", selectedItem.inventory_code);
      
      if (error) {
        alert(error.message);
      } else {
        setShowDeleteModal(false);
        fetchInventory();
      }
    } else if (deleteMode === "bulk") {
      // Bulk Delete Logic
      const { error } = await supabase
        .from("inventory")
        .delete()
        .in("inventory_code", selectedItems);
      
      if (error) {
        alert(error.message);
      } else {
        setSelectedItems([]);
        setShowDeleteModal(false);
        fetchInventory();
      }
    }
  };

  const resetForm = () => {
    setFormData({
      item_name: "",
      category: "Water",
      price: "",
      quantity: "",
      reorder_level: 10,
    });
  };

  // DYNAMIC STATUS INDICATOR LOGIC
  const getStatus = (quantity, reorderLevel) => {
    if (quantity <= 0) return { label: "Out of Stock", class: "out" };
    if (quantity <= reorderLevel) return { label: "Low Stock", class: "low" };
    return { label: "In Stock", class: "in" };
  };

  // METRICS CALCULATIONS
  const totalInventoryValue = items.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity_available || 0)), 0);
  const lowStockAlertsCount = items.filter(i => i.quantity_available > 0 && i.quantity_available <= i.reorder_level).length;
  const outOfStockAlertsCount = items.filter(i => i.quantity_available <= 0).length;

  // FILTER & SEARCH FILTERING
  const filteredItems = items.filter((item) => {
    const matchSearch =
      item.item_name?.toLowerCase().includes(search.toLowerCase()) ||
      item.inventory_code?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === "All" || item.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  // CHECKBOX SELECTION LOGIC
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedItems(filteredItems.map((i) => i.inventory_code));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (itemId) => {
    setSelectedItems((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  // TABLE COLUMNS CONFIGURATION
  const columns = [
    {
      key: "select",
      label: (
        <input
          type="checkbox"
          onChange={handleSelectAll}
          checked={selectedItems.length === filteredItems.length && filteredItems.length > 0}
        />
      ),
      render: (row) => (
        <input
          type="checkbox"
          checked={selectedItems.includes(row.inventory_code)}
          onChange={() => handleSelectItem(row.inventory_code)}
        />
      ),
    },
    { key: "inventory_code", label: "Inventory Code" },
    { key: "item_name", label: "Item Name" },
    { key: "category", label: "Category" },
    { key: "price", label: "Price", render: (row) => `₱${Number(row.price || 0).toFixed(2)}` },
    { key: "quantity_available", label: "In Stock" },
    {
      key: "status",
      label: "Status",
      render: (row) => {
        const status = getStatus(row.quantity_available, row.reorder_level);
        return <span className={`status-pill ${status.class}`}>{status.label}</span>;
      },
    },
    {
      key: "last_updated",
      label: "Last Updated",
      render: (row) => row.last_updated ? new Date(row.last_updated).toLocaleDateString() : "N/A"
    },
    {
      key: "actions",
      label: "Action",
      render: (row) => (
        <div className="staffaction-buttons">
          {/* 🔥 BINAGO: Ginawang icon button gamit ang Layers o PackagePlus */}
          <button 
            className="staffrestock-icon-btn" 
            title="Stock In"
            onClick={() => { setSelectedItem(row); setShowRestock(true); }}
          >
            <Plus size={16} /> {/* Pwede ring Plus o Layers depende sa trip mong icon */}
          </button>

          <button className="staffedit-icon-btn" onClick={() => {
            setSelectedItem(row);
            setFormData({ item_name: row.item_name, category: row.category, price: row.price, quantity: row.quantity_available, reorder_level: row.reorder_level });
            setShowEdit(true);
          }}><Pencil size={16} /></button>

          <button className="staffdelete-icon-btn" onClick={() => openSingleDeleteModal(row)}><Trash2 size={16} /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="staffinventory-page">
      {/* TITLE HEADER */}
      <div className="stafforders-header">
        <div>
          <h1>Inventory</h1>
          <p>Real-time stock management and automated tracking</p>
        </div>
      </div>

      {/* DASHBOARD STATUS CARDS */}
      <div className="staffinventory-summary-cards">
        <div className="staffsummary-card total-val">
          <Layers className="card-icon" />
          <div>
            <h3>Total Value</h3>
            <h2>₱{totalInventoryValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
          </div>
        </div>
        <div className={`staffsummary-card low-alert ${lowStockAlertsCount > 0 ? "active" : ""}`}>
          <AlertTriangle className="card-icon" />
          <div>
            <h3>Low Stock Items</h3>
            <h2>{lowStockAlertsCount}</h2>
          </div>
        </div>
        <div className={`staffsummary-card out-alert ${outOfStockAlertsCount > 0 ? "active" : ""}`}>
          <PackageX className="card-icon" />
          <div>
            <h3>Out of Stock</h3>
            <h2>{outOfStockAlertsCount}</h2>
          </div>
        </div>
      </div>

      {/* SEARCH, FILTERS & ACTION ACTIONS */}
      <div className="staffcontrols-row">
        <div className="staffleft-controls">
          <input
            type="text"
            className="staffsearch-input"
            placeholder="Search code or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select className="stafffilter-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="All">All Categories</option>
            <option value="Water">Water</option>
            <option value="Bottle">Bottle</option>
            <option value="Equipment">Equipment</option>
          </select>
        </div>

        <div className="staffright-controls">
          {selectedItems.length > 0 && (
            /* Binago natin ang onClick dito para magbukas ng custom modal */
            <button className="staffbulk-delete-btn" onClick={openBulkDeleteModal}>
              <Trash2 size={16} /> Delete Selected ({selectedItems.length})
            </button>
          )}
          <button className="staffadd-btn" onClick={() => { resetForm(); setShowAdd(true); }}>
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      {/* RENDER DYNAMIC TABLE */}
     <div className="stafftable-container inventory-table">
        <Table columns={columns} data={filteredItems}/>
      </div>

      {/* MODAL: ADD NEW PRODUCT */}
      {showAdd && (
        <div className="staffInvmodal-overlay">
          <div className="staffmodal-content">
            <div className="staffmodal-header">
              <h2>Add New Product</h2>
              <button className="staffAddclose-x" onClick={() => setShowAdd(false)}><X size={20} /></button>
            </div>
            <div className="staffmodal-body">
              <div className="staffinput-group">
                <label>Product Name</label>
                <input type="text" value={formData.item_name} onChange={(e) => setFormData({ ...formData, item_name: e.target.value })} />
              </div>
              <div className="staffinput-group">
                <label>Category</label>
                <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                  <option value="Water">Water</option>
                  <option value="Bottle">Bottle</option>
                  <option value="Equipment">Equipment</option>
                </select>
              </div>
              <div className="staffinput-row">
                <div className="staffinput-group">
                  <label>Price (₱)</label>
                  <input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} />
                </div>
                <div className="staffinput-group">
                  <label>Initial Stock</label>
                  <input type="number" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} />
                </div>
              </div>
              <div className="staffinput-group">
                <label>Reorder Level Alert Threshold</label>
                <input type="number" value={formData.reorder_level} onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })} />
              </div>
              <div className="staffmodal-actions">
                <button className="staffcancel-action-btn" onClick={() => setShowAdd(false)}>Cancel</button>
                <button className="staffsave-action-btn" onClick={handleAddProduct}>Save Product</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT PRODUCT DETAILS */}
      {showEdit && (
        <div className="staffInvmodal-overlay">
          <div className="staffmodal-content">
            <div className="staffmodal-header">
              <h2>Edit Product Details</h2>
              <button className="staffclose-x" onClick={() => setShowEdit(false)}><X size={20} /></button>
            </div>
            <div className="staffmodal-body">
              <p className="staffitem-badge-id">Editing Code: {selectedItem?.inventory_code}</p>
              <div className="staffinput-group">
                <label>Product Name</label>
                <input type="text" value={formData.item_name} onChange={(e) => setFormData({ ...formData, item_name: e.target.value })} />
              </div>
              <div className="staffinput-group">
                <label>Category</label>
                <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                  <option value="Water">Water</option>
                  <option value="Bottle">Bottle</option>
                  <option value="Equipment">Equipment</option>
                </select>
              </div>
              <div className="staffinput-row">
                <div className="staffinput-group">
                  <label>Price (₱)</label>
                  <input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} />
                </div>
                <div className="staffinput-group">
                  <label>Alert Threshold Level</label>
                  <input type="number" value={formData.reorder_level} onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })} />
                </div>
              </div>
              <div className="staffmodal-actions">
                <button className="staffcancel-action-btn" onClick={() => setShowEdit(false)}>Cancel</button>
                <button className="staffsave-action-btn" onClick={handleEditProduct}>Update Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: STOCK IN ACTION */}
      {showRestock && (
        <div className="staffInvmodal-overlay">
          <div className="staffmodal-content small-modal">
            <div className="staffmodal-header">
              <h2>Stock In Module</h2>
              <button className="staffStockclose-x" onClick={() => setShowRestock(false)}><X size={20} /></button>
            </div>
            <div className="staffmodal-body">
              <h4 className="staffrestock-item-title">{selectedItem?.item_name}</h4>
              <p>Current Stocks: <b>{selectedItem?.quantity_available} pcs</b></p>
              <div className="staffinput-group">
                <label>Quantity to Add</label>
                <input type="number" placeholder="Enter amount to add" value={restockQty} onChange={(e) => setRestockQty(e.target.value)} />
              </div>
              <div className="staffmodal-actions">
                <button className="staffcancel-action-btn" onClick={() => setShowRestock(false)}>Cancel</button>
                <button className="staffsave-action-btn" onClick={handleRestock}>Increase Inventory</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 CUSTOM CONFIRM DELETE MODAL (GAYA NG DELETE ORDER UI) */}
      {showDeleteModal && (
        <div className="staffInvmodal-overlay">
          <div className="staffmodal-content delete-order-style-modal">
            
            {/* MODAL HEADER */}
            <div className="staffmodal-header-styled">
              <h2>Confirm Deletion</h2>
              <button className="staffclose-x-btn" onClick={() => setShowDeleteModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <p className="staffmodal-subtitle">
              {deleteMode === "single" 
                ? "Are you sure you want to delete this product?" 
                : "Are you sure you want to delete these products?"}
            </p>

            <div className="staffmodal-body">
              {/* WARNING BOX */}
              <div className="staffdanger-warning-box">
                <div className="staffwarning-title">
                  <AlertTriangle size={20} /> Warning:
                </div>
                <p>
                  This will permanently delete the inventory record and all related data. 
                  This action cannot be undone.
                </p>
              </div>

              {/* DYNAMIC ITEM DETAILS BOX */}
              <div className="staffitem-details-display-box">
                {deleteMode === "single" ? (
                  <>
                    <p><b>Inventory Code:</b> {selectedItem?.inventory_code}</p>
                    <p><b>Product Name:</b> {selectedItem?.item_name}</p>
                    <p><b>Category:</b> {selectedItem?.category}</p>
                    <p><b>In Stock:</b> {selectedItem?.quantity_available} pcs</p>
                    <p><b>Price:</b> ₱{Number(selectedItem?.price || 0).toFixed(2)}</p>
                  </>
                ) : (
                  <>
                    <p><b>Total Items Selected:</b> {selectedItems.length} items</p>
                    <p><b>Selected Codes:</b> {selectedItems.join(", ")}</p>
                  </>
                )}
              </div>

              {/* MODAL ACTIONS BUTTONS */}
              <div className="staffmodal-actions-styled-row">
                <button className="staffno-cancel-btn" onClick={() => setShowDeleteModal(false)}>
                  No, Cancel
                </button>
                <button className="staffyes-delete-btn" onClick={handleConfirmDelete}>
                  {deleteMode === "single" ? "Delete Product" : `Delete Selected (${selectedItems.length})`}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StaffInventory;