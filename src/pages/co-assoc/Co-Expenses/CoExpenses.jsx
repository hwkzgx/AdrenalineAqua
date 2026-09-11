import { useState, useEffect } from "react";
import "./co-expenses.css";
import Table from "../../../components/Table";
import { supabase } from "../../../supabase";
import { Calendar, DollarSign, Layers } from "lucide-react";

export default function CoExpenses() {
  const [expenses, setExpenses] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [timeFilter, setTimeFilter] = useState("All");

  useEffect(() => {
    fetchExpenses();
  }, []);

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

  // SUMMARY CALCULATIONS
  const getSummaryTotals = () => {
    const now = new Date();
    let daily = 0, weekly = 0, monthly = 0;

    expenses.forEach((item) => {
      const expDate = new Date(item.date);
      const diffTime = Math.abs(now - expDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (now.toDateString() === expDate.toDateString()) daily += Number(item.amount || 0);
      if (diffDays <= 7) weekly += Number(item.amount || 0);
      if (now.getMonth() === expDate.getMonth() && now.getFullYear() === expDate.getFullYear()) monthly += Number(item.amount || 0);
    });
    return { daily, weekly, monthly };
  };

  const totals = getSummaryTotals();

  // CATEGORY BREAKDOWN
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
  const filteredItems = expenses.filter((item) => {
    const matchSearch = item.expenses_code?.toLowerCase().includes(search.toLowerCase()) || 
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
  });

  const columns = [
    { key: "expenses_code", label: "Expense ID" },
    { key: "date", label: "Date", render: (row) => row.date ? new Date(row.date).toLocaleDateString() : "N/A" },
    { key: "category", label: "Category" },
    { key: "description", label: "Description" },
    { key: "amount", label: "Amount", render: (row) => `₱${Number(row.amount || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}` }
  ];

  return (
    <div className="coexpenses-page">
      <div className="coexpenses-header">
        <h1>Co-Associate Expenses</h1>
        <p>Monitor expense records and cost distributions</p>
      </div>

      <div className="inventory-summary-cards">
        <div className="summary-card total-val"><Calendar className="card-icon" /> <div><h3>Today</h3><h2>₱{totals.daily.toLocaleString()}</h2></div></div>
        <div className="summary-card total-val"><DollarSign className="card-icon" /> <div><h3>Week</h3><h2>₱{totals.weekly.toLocaleString()}</h2></div></div>
        <div className="summary-card total-val"><Layers className="card-icon" /> <div><h3>Month</h3><h2>₱{totals.monthly.toLocaleString()}</h2></div></div>
      </div>

      <div className="coexpenses-controls">
        <input type="text" className="coexpenses-search" placeholder="Search ID or description..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="coexpenses-filter" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="All">All Categories</option>
          <option value="Utilities">Utilities</option>
          <option value="Salary">Salary</option>
          <option value="Maintenance">Maintenance</option>
          <option value="Supplies">Supplies</option>
        </select>
        <select className="coexpenses-filter" value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)}>
          <option value="All">All Time</option>
          <option value="Day">Today</option>
          <option value="Week">This Week</option>
          <option value="Month">This Month</option>
        </select>
      </div>

      <div className="coexpenses-table-container">
        <Table columns={columns} data={filteredItems} emptyMessage="No expenses recorded" />
      </div>

      {/* 📊 BOTTOM SECTION: LOGS & CHART */}
      <div className="expenses-bottom-layout" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        
        {/* LEFT: Recent Expense Activity */}
        <div className="expense-analysis-box">
          <h3>Recent Expense Activity</h3>
          <div className="activity-timeline-container">
            {expenses.slice(0, 5).map((item, idx) => (
              <div className="activity-timeline-item" key={idx} style={{ padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                <div className="timeline-log-details">
                  <div className="timeline-meta" style={{ fontSize: "12px", color: "#64748b" }}>
                    <span>{item.expenses_code}</span> | <span>{new Date(item.date).toLocaleDateString()}</span>
                  </div>
                  <p style={{ margin: "5px 0" }}>
                    Spent <b>₱{Number(item.amount || 0).toLocaleString()}</b> on {item.description}
                  </p>
                </div>
              </div>
            ))}
            {expenses.length === 0 && <p>No recent activity</p>}
          </div>
        </div>

        {/* RIGHT: Category Summary Chart */}
        <div className="expense-analysis-box">
          <h3>Category Summary Chart</h3>
          <div className="chart-bars-wrapper">
            {Object.keys(breakdown).map((cat) => {
              const amount = breakdown[cat];
              const percentage = totalAll > 0 ? (amount / totalAll) * 100 : 0;
              return (
                <div className="chart-bar-row" key={cat} style={{ marginBottom: "15px" }}>
                  <div className="chart-label-group" style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>{cat}</span> <span>₱{amount.toLocaleString()} ({percentage.toFixed(0)}%)</span>
                  </div>
                  <div className="progress-bar-bg" style={{ background: "#e2e8f0", height: "10px", borderRadius: "5px", overflow: "hidden" }}>
                    <div style={{ width: `${percentage}%`, height: "100%", background: "#0f766e" }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}