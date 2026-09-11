import { useState, useEffect } from "react";
import Table from "../../../components/Table";
import "./co-sales.css";
import { supabase } from "../../../supabase";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from "chart.js";

import { Line } from "react-chartjs-2";
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ChartTooltip,
  Legend,
  Filler
);

export default function CoSales() {
  const [sales, setSales] = useState([]);
  const [monthlySales, setMonthlySales] = useState([]); // State para sa graph
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    const { data, error } = await supabase
      .from("sales")
      .select("*")
      .order("date", { ascending: false });

    if (error) {
      console.error("Error fetching sales:", error.message);
      return;
    }

    setSales(data || []);

    // LOGIC PARA SA GRAPH (Group by Month)
   const months = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec"
];

const grouped = {};

months.forEach(month => {
  grouped[month] = 0;
});

(data || []).forEach((sale) => {
  if (!sale.date) return;

  const month = new Date(sale.date).toLocaleString("en-US", {
    month: "short",
  });

  grouped[month] += Number(sale.total_sales || 0);
});

const graphData = months.map(month => ({
  month,
  sales: grouped[month],
}));

setMonthlySales(graphData);
  };

  const filtered = sales.filter((item) => {
    const matchSearch =
      item.sales_code?.toLowerCase().includes(search.toLowerCase()) ||
      item.staff?.toLowerCase().includes(search.toLowerCase());

    const matchFilter = filter === "All" || item.period === filter;

    return matchSearch && matchFilter;
  });

  const columns = [
    { key: "sales_code", label: "Sales ID" },
    { 
      key: "date", 
      label: "Date", 
      render: (row) => row.date ? new Date(row.date).toLocaleDateString() : "N/A" 
    },
    { key: "total_products", label: "Total Products" },
    { 
      key: "total_sales", 
      label: "Total Sales",
      render: (row) => `₱${Number(row.total_sales || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}` 
    },
    { key: "payment_method", label: "Payment Method" }
  ];

  const lineData = {
  labels: monthlySales.map(item => item.month),

  datasets: [
    {
      label: "Monthly Sales",

      data: monthlySales.map(item => item.sales),

      borderColor: "#2563eb",

      backgroundColor: (context) => {
        const chart = context.chart;
        const { ctx, chartArea } = chart;

        if (!chartArea) return null;

        const gradient = ctx.createLinearGradient(
          0,
          chartArea.top,
          0,
          chartArea.bottom
        );

        gradient.addColorStop(0, "rgba(37,99,235,.35)");
        gradient.addColorStop(1, "rgba(147,197,253,0)");

        return gradient;
      },

      fill: true,
      tension: 0.35,

      borderWidth: 3,

      pointStyle: "circle",

      pointRadius: 7,
      pointHoverRadius: 10,

      pointBackgroundColor: "#93c5fd",
      pointBorderColor: "#2563eb",
      pointBorderWidth: 2,

      pointHoverBackgroundColor: "#fff",
      pointHoverBorderColor: "#2563eb",
      pointHoverBorderWidth: 3,
    },
  ],
};

const lineOptions = {
  responsive: true,
  maintainAspectRatio: false,

  interaction: {
    mode: "index",
    intersect: false,
  },

  plugins: {
    legend: {
      display: false,
    },

    tooltip: {
      backgroundColor: "#1e293b",
      titleColor: "#fff",
      bodyColor: "#fff",
      padding: 12,
      cornerRadius: 10,

      callbacks: {
        label: (context) =>
          `₱${Number(context.raw).toLocaleString()}`,
      },
    },
  },

 scales: {
  x: {
    grid: {
      display: false,
    },

    ticks: {
      autoSkip: false,     // Ipakita lahat ng buwan
      maxRotation: 0,      // Huwag i-rotate
      minRotation: 0,
      font: {
        size: 11,
      },
    },
  },

  y: {
    beginAtZero: true,
    ticks: {
      callback: (value) => `₱${value}`,
    },
  },
},
};

  return (
    <div className="cosales-page">
      <div className="cosales-header">
        <h1>Co-Associate Sales</h1>
        <p>View sales performance records</p>
      </div>

      <div className="cosales-controls">
        <input
          type="text"
          className="cosales-search"
          placeholder="Search sales ID or staff..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="cosales-filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="All">All Periods</option>
          <option value="Daily">Daily</option>
          <option value="Weekly">Weekly</option>
          <option value="Monthly">Monthly</option>
        </select>
      </div>

      <div className="cosales-table-container">
        <Table
          columns={columns}
          data={filtered}
          emptyMessage="No sales available yet"
        />
      </div>

      {/* GRAPH SECTION */}
    {/* GRAPH SECTION */}
<div className="cosales-bottom">
  <div className="cosales-graph-card">
    <h3 className="graph-title">Monthly Sales Revenue</h3>

    {monthlySales.length > 0 ? (
      <div style={{ width: "100%", height: "320px" }}>
        <Line
          data={lineData}
          options={lineOptions}
        />
      </div>
    ) : (
      <div className="graph-placeholder">
        No sales data yet
      </div>
    )}
  </div>
</div>
    </div>
  );
}