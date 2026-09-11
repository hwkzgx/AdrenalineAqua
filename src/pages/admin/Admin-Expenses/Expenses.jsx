import { useState, useEffect } from "react";
import "./expenses.css";
import Table from "../../../components/Table";
import { supabase } from "../../../supabase";
import { Plus, Pencil, Trash2, AlertTriangle, Calendar, DollarSign, Layers, X } from "lucide-react";

function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [timeFilter, setTimeFilter] = useState("All"); // Day, Week, Month
  const [sortOrder, setSortOrder] = useState("latest"); // latest, oldest, highest, lowest

  // MODALS CONTROL STATES
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);

  // FORM STATES
  const [formData, setFormData] = useState({
    category: "Utilities",
    description: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    fetchExpenses();
  }, []);

  // FETCH FROM SUPABASE
  const fetchExpenses = async () => {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .order("date", { ascending: false });

    if (error) {
      console.error("Error fetching expenses:", error.message);
      return;
    }
    setExpenses(data || []);
  };

  // AUTOMATED CODE GENERATOR (EXP2026001)
  const generateExpenseCode = async () => {
    const year = new Date().getFullYear();
    const { data } = await supabase
      .from("expenses")
      .select("expenses_code")
      .like("expenses_code", `EXP${year}%`)
      .order("expenses_code", { ascending: false })
      .limit(1);

    let next = 1;
    if (data?.length > 0) {
      const last = data[0].expenses_code;
      next = Number(last.replace(`EXP${year}`, "")) + 1;
    }
    return `EXP${year}${String(next).padStart(3, "0")}`;
  };

  // ADD EXPENSE
  const handleAddExpense = async () => {
    if (!formData.description || !formData.amount || !formData.date) {
      alert("Please fill in all required fields.");
      return;
    }

    // Dynamic extraction at generation ng EXP code bago mag-insert sa row
    const code = await generateExpenseCode();

    const { error } = await supabase.from("expenses").insert([
      {
        expenses_code: code,
        category: formData.category,
        description: formData.description,
        amount: Number(formData.amount),
        date: formData.date,
      },
    ]);

    if (error) {
      alert(error.message);
    } else {
      setShowAdd(false);
      resetForm();
      fetchExpenses();
    }
  };

  // EDIT EXPENSE
  const handleEditExpense = async () => {
    const { error } = await supabase
      .from("expenses")
      .update({
        category: formData.category,
        description: formData.description,
        amount: Number(formData.amount),
        date: formData.date,
      })
      .eq("expenses_code", selectedExpense.expenses_code);

    if (error) {
      alert(error.message);
    } else {
      setShowEdit(false);
      fetchExpenses();
    }
  };

  // DELETE EXPENSE
  const handleDeleteExpense = async () => {
    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("expenses_code", selectedExpense.expenses_code);

    if (error) {
      alert(error.message);
    } else {
      setShowDelete(false);
      fetchExpenses();
    }
  };

  const resetForm = () => {
    setFormData({
      category: "Utilities",
      description: "",
      amount: "",
      date: new Date().toISOString().split("T")[0],
    });
  };

  // SUMMARY CARD CALCULATIONS
  const getSummaryTotals = () => {
    const now = new Date();
    let daily = 0, weekly = 0, monthly = 0;

    expenses.forEach((item) => {
      const expDate = new Date(item.date);
      const diffTime = Math.abs(now - expDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (now.toDateString() === expDate.toDateString()) {
        daily += Number(item.amount || 0);
      }
      if (diffDays <= 7) {
        weekly += Number(item.amount || 0);
      }
      if (now.getMonth() === expDate.getMonth() && now.getFullYear() === expDate.getFullYear()) {
        monthly += Number(item.amount || 0);
      }
    });

    return { daily, weekly, monthly };
  };

  const totals = getSummaryTotals();

  // DYNAMIC BREAKDOWN FOR GRAPH & ACTIVITY
  const getCategoryBreakdown = () => {
    const breakdown = { Utilities: 0, Salary: 0, Maintenance: 0, Supplies: 0 };
    let totalAll = 0;

    expenses.forEach((item) => {
      if (breakdown[item.category] !== undefined) {
        breakdown[item.category] += Number(item.amount || 0);
        totalAll += Number(item.amount || 0);
      }
    });

    return { breakdown, totalAll };
  };

  const { breakdown, totalAll } = getCategoryBreakdown();

  // FILTER & SEARCH LOGIC
  const filteredItems = expenses
    .filter((item) => {
      const matchSearch =
        item.expenses_code?.toLowerCase().includes(search.toLowerCase()) ||
        item.description?.toLowerCase().includes(search.toLowerCase());

      const matchCategory = categoryFilter === "All" || item.category === categoryFilter;

      const now = new Date();
      const expDate = new Date(item.date);
      const diffDays = Math.ceil(Math.abs(now - expDate) / (1000 * 60 * 60 * 24));

      let matchTime = true;
      if (timeFilter === "Day") matchTime = now.toDateString() === expDate.toDateString();
      if (timeFilter === "Week") matchTime = diffDays <= 7;
      if (timeFilter === "Month") matchTime = now.getMonth() === expDate.getMonth() && now.getFullYear() === expDate.getFullYear();

      return matchSearch && matchCategory && matchTime;
    })
    .sort((a, b) => {
      if (sortOrder === "latest") return new Date(b.date) - new Date(a.date);
      if (sortOrder === "oldest") return new Date(a.date) - new Date(b.date);
      if (sortOrder === "highest") return b.amount - a.amount;
      if (sortOrder === "lowest") return a.amount - b.amount;
      return 0;
    });

  // TABLE COLUMNS CONFIGURATION (O-OVERRIDE ANG TABLE PILL)
  const columns = [
    { key: "expenses_code", label: "Expense ID" },
    { key: "date", label: "Date", render: (row) => new Date(row.date).toLocaleDateString() },
    { 
      key: "category", 
      label: "Category",
      render: (row) => <span className="plain-category-text">{row.category}</span>
    },
    { key: "description", label: "Description" },
    { key: "amount", label: "Amount", render: (row) => `₱${Number(row.amount || 0).toFixed(2)}` },
    {
      key: "actions",
      label: "Action",
      render: (row) => (
        <div className="action-buttons">
          <button
            className="edit-icon-btn"
            onClick={() => {
              setSelectedExpense(row);
              setFormData({ category: row.category, description: row.description, amount: row.amount, date: row.date });
              setShowEdit(true);
            }}
          >
            <Pencil size={16} />
          </button>
          <button
            className="delete-icon-btn"
            onClick={() => {
              setSelectedExpense(row);
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
    <div className="expenses-page"> {/* In-update para sumunod sa native .expenses-page padding layout mo */}
      
      {/* TITLE HEADER */}
      <div className="expenses-header">
        <div>
          <h1>Expenses</h1>
          <p>Real-time cash outflow tracking and category cost analysis</p>
        </div>
      </div>

      {/* DASHBOARD STATUS CARDS */}
      <div className="inventory-summary-cards">
        <div className="summary-card total-val">
          <Calendar className="card-icon" />
          <div>
            <h3>Today's Outflow</h3>
            <h2>₱{totals.daily.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
          </div>
        </div>
        <div className="summary-card total-val">
          <DollarSign className="card-icon" />
          <div>
            <h3>This Week</h3>
            <h2>₱{totals.weekly.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
          </div>
        </div>
        <div className="summary-card total-val">
          <Layers className="card-icon" />
          <div>
            <h3>This Month</h3>
            <h2>₱{totals.monthly.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
          </div>
        </div>
      </div>

      {/* SEARCH, FILTERS & ACTION ACTIONS */}
      <div className="controls-row">
        <div className="left-controls">
          <input
            type="text"
            className="search-input"
            placeholder="Search code or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select className="filter-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="All">All Categories</option>
            <option value="Utilities">Utilities</option>
            <option value="Salary">Salary</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Supplies">Supplies</option>
          </select>

          <select className="filter-select" value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)}>
            <option value="All">All Time Range</option>
            <option value="Day">Today</option>
            <option value="Week">This Week</option>
            <option value="Month">This Month</option>
          </select>

          <select className="filter-select" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
            <option value="latest">Latest Date</option>
            <option value="oldest">Oldest Date</option>
            <option value="highest">Highest Amount</option>
            <option value="lowest">Lowest Amount</option>
          </select>
        </div>

        <div className="right-controls">
          <button className="add-btn" onClick={() => { resetForm(); setShowAdd(true); }}>
            <Plus size={16} /> Record Expense
          </button>
        </div>
      </div>

      {/* RENDER TABLE */}
      <div className="table-container">
        <Table columns={columns} data={filteredItems} />
      </div>

      {/* 📊 BOTTOM SECTION: GRAPH BREAKDOWN & ACTIVITY */}
      <div className="expenses-bottom-layout">
        
        {/* LEFT: Expense Activity Logs */}
        <div className="expense-analysis-box">
          <h3>Recent Expense Activity</h3>
          <div className="activity-timeline-container">
            {expenses.slice(0, 4).map((item, idx) => (
              <div className="activity-timeline-item" key={idx}>
                <div className="timeline-badge-dot"></div>
                <div className="timeline-log-details">
                  <div className="timeline-meta">
                    <span className="log-code">{item.expenses_code}</span>
                    <span className="log-date">{new Date(item.date).toLocaleDateString()}</span>
                  </div>
                  <p className="log-desc">Spent <b>₱{Number(item.amount).toFixed(2)}</b> on {item.description}</p>
                </div>
              </div>
            ))}
            {expenses.length === 0 && <p className="placeholder-text">No data available yet</p>}
          </div>
        </div>

        {/* RIGHT: Category Breakdown Chart Component */}
        <div className="expense-analysis-box">
          <h3>Category Summary Chart</h3>
          <div className="chart-bars-wrapper">
            {Object.keys(breakdown).map((cat) => {
              const amount = breakdown[cat];
              const percentage = totalAll > 0 ? (amount / totalAll) * 100 : 0;
              return (
                <div className="chart-bar-row" key={cat}>
                  <div className="chart-label-group">
                    <span className="chart-cat-name">{cat}</span>
                    <span className="chart-cat-value">₱{amount.toLocaleString()} ({percentage.toFixed(0)}%)</span>
                  </div>
                  <div className="progress-bar-bg">
                    <div className={`progress-bar-fill fill-${cat.toLowerCase()}`} style={{ width: `${percentage}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* MODAL: ADD EXPENSE */}
      {showAdd && (
        <div className="Expmodal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Record New Expense</h2>
              <button className="Addclose-x" onClick={() => setShowAdd(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="input-group">
                <label>Category</label>
                <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                  <option value="Utilities">Utilities</option>
                  <option value="Salary">Salary</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Supplies">Supplies</option>
                </select>
              </div>
              <div className="input-group">
                <label>Description / Particulars</label>
                <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="e.g., Meralco bill payment" />
              </div>
              <div className="input-row">
                <div className="input-group">
                  <label>Amount (₱)</label>
                  <input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} />
                </div>
                <div className="input-group">
                  <label>Transaction Date</label>
                  <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                </div>
              </div>
              <div className="modal-actions">
                <button className="cancel-action-btn" onClick={() => setShowAdd(false)}>Cancel</button>
                <button className="save-action-btn" onClick={handleAddExpense}>Save Transaction</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT EXPENSE */}
      {showEdit && (
        <div className="Expmodal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Edit Expense Log</h2>
              <button className="Editclose-x" onClick={() => setShowEdit(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <p className="item-badge-id">Tracking Voucher: {selectedExpense?.expenses_code}</p>
              <div className="input-group">
                <label>Category</label>
                <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                  <option value="Utilities">Utilities</option>
                  <option value="Salary">Salary</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Supplies">Supplies</option>
                </select>
              </div>
              <div className="input-group">
                <label>Description / Particulars</label>
                <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div className="input-row">
                <div className="input-group">
                  <label>Amount (₱)</label>
                  <input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} />
                </div>
                <div className="input-group">
                  <label>Transaction Date</label>
                  <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                </div>
              </div>
              <div className="modal-actions">
                <button className="cancel-action-btn" onClick={() => setShowEdit(false)}>Cancel</button>
                <button className="save-action-btn" onClick={handleEditExpense}>Update Log</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {showDelete && (
        <div className="Expmodal-overlay">
          <div className="modal-content delete-order-style-modal">
            <div className="modal-header-styled">
              <h2>Delete Voucher</h2>
              <button className="close-x-btn" onClick={() => setShowDelete(false)}><X size={20} /></button>
            </div>
            <p className="modal-subtitle">Are you sure you want to delete this expense log?</p>
            <div className="modal-body">
              <div className="danger-warning-box">
                <div className="warning-title"><AlertTriangle size={20} /> Warning:</div>
                <p>This will permanently delete the cash outflow record. This action cannot be undone and will affect accounting summaries.</p>
              </div>
              <div className="item-details-display-box">
                <p><b>Voucher ID:</b> {selectedExpense?.expenses_code}</p>
                <p><b>Category:</b> {selectedExpense?.category}</p>
                <p><b>Particulars:</b> {selectedExpense?.description}</p>
                <p><b>Amount Paid:</b> ₱{Number(selectedExpense?.amount || 0).toFixed(2)}</p>
                <p><b>Date:</b> {new Date(selectedExpense?.date).toLocaleDateString()}</p>
              </div>
              <div className="modal-actions-styled-row">
                <button className="no-cancel-btn" onClick={() => setShowDelete(false)}>No, Cancel</button>
                <button className="yes-delete-btn" onClick={handleDeleteExpense}>Delete Record</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Expenses;