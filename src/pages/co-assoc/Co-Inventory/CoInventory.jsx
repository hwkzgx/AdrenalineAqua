import { useState, useEffect } from "react";
import "./co-inventory.css";
import Table from "../../../components/Table";
import { supabase } from "../../../supabase";
import { Layers, AlertTriangle, PackageX } from "lucide-react";

function CoInventory() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  useEffect(() => {
    fetchInventory();
  }, []);

  // FETCH DATA MULA SA DATABASE
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

  // LOGIC PARA SA STATUS PILL
  const getStatus = (quantity, reorderLevel) => {
    if (quantity <= 0) return { label: "Out of Stock", class: "out" };
    if (quantity <= reorderLevel) return { label: "Low Stock", class: "low" };
    return { label: "In Stock", class: "in" };
  };

  // CALCULATIONS
  const totalInventoryValue = items.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity_available || 0)), 0);
  const lowStockAlertsCount = items.filter(i => i.quantity_available > 0 && i.quantity_available <= i.reorder_level).length;
  const outOfStockAlertsCount = items.filter(i => i.quantity_available <= 0).length;

  // FILTER LOGIC
  const filteredItems = items.filter((item) => {
    const matchSearch =
      item.item_name?.toLowerCase().includes(search.toLowerCase()) ||
      item.inventory_code?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === "All" || item.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  // COLUMNS (READ ONLY)
  const columns = [
    { key: "inventory_code", label: "Item ID" },
    { key: "item_name", label: "Item Name" },
    { key: "category", label: "Category" },
    { key: "price", label: "Price", render: (row) => `₱${Number(row.price || 0).toFixed(2)}` },
    { key: "quantity_available", label: "Quantity" },
    {
      key: "status",
      label: "Status",
      render: (row) => {
        const status = getStatus(row.quantity_available, row.reorder_level);
        return <span className={`status-pill ${status.class}`}>{status.label}</span>;
      },
    },
    { key: "last_updated", label: "Last Updated", render: (row) => row.last_updated ? new Date(row.last_updated).toLocaleDateString() : "N/A" },
  ];

  return (
    <div className="coinventory-page">
      {/* HEADER */}
      <div className="coinventory-header">
        <h1> Co- Associate Inventory</h1>
        <p>Manage stock, availability, and product tracking</p>
      </div>

      {/* DASHBOARD SUMMARY CARDS */}
      <div className="inventory-summary-cards">
        <div className="summary-card total-val">
          <Layers className="card-icon" />
          <div>
            <h3>Total Value</h3>
            <h2>₱{totalInventoryValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
          </div>
        </div>
        <div className={`summary-card low-alert ${lowStockAlertsCount > 0 ? "active" : ""}`}>
          <AlertTriangle className="card-icon" />
          <div>
            <h3>Low Stock</h3>
            <h2>{lowStockAlertsCount}</h2>
          </div>
        </div>
        <div className={`summary-card out-alert ${outOfStockAlertsCount > 0 ? "active" : ""}`}>
          <PackageX className="card-icon" />
          <div>
            <h3>Out of Stock</h3>
            <h2>{outOfStockAlertsCount}</h2>
          </div>
        </div>
      </div>

      {/* CONTROLS */}
      <div className="cocontrols-row">
        <input
          type="text"
          className="cosearch-input"
          placeholder="Search item..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="cofilter-select"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="All">All Category</option>
          <option value="Water">Water</option>
          <option value="Bottle">Bottle</option>
          <option value="Equipment">Equipment</option>
        </select>
      </div>

      {/* TABLE */}
      <div className="cotable-container">
        <Table
          columns={columns}
          data={filteredItems}
          emptyMessage="No inventory items found."
        />
      </div>
    </div>
  );
}

export default CoInventory;