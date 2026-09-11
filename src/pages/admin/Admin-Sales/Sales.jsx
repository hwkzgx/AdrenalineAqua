import { useState, useEffect } from "react";
import "./sales.css";
import Table from "../../../components/Table";
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
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ChartTooltip,
  Legend,
  Filler
);

import { Line } from "react-chartjs-2";

import { 
  Calendar, 
  BarChart3, 
  CalendarDays, 
  PieChart 
} from "lucide-react";

function Sales() {
  const [sales, setSales] = useState([]);
  const [monthlySales, setMonthlySales] = useState([]);
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("All");

  const [stats, setStats] = useState({
    today: 0,
    weekly: 0,
    monthly: 0,
    overall: 0,
  });

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    const { data, error } = await supabase
      .from("sales")
      .select(`
        sales_code,
        date,
        total_products,
        total_sales,
        payment_method
      `)
      .order("date", { ascending: false });

    if (error) {
      console.log(error.message);
      return;
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let todaySum = 0;
    let weeklySum = 0;
    let monthlySum = 0;
    let overallSum = 0;

    (data || []).forEach((sale) => {
      const saleAmount = Number(sale.total_sales || 0);
      overallSum += saleAmount;

      if (sale.date) {
        const saleDate = new Date(sale.date);
        if (saleDate >= startOfToday) todaySum += saleAmount;
        if (saleDate >= startOfWeek) weeklySum += saleAmount;
        if (saleDate >= startOfMonth) monthlySum += saleAmount;
      }
    });

    setStats({
      today: todaySum,
      weekly: weeklySum,
      monthly: monthlySum,
      overall: overallSum,
    });

    const formatted = (data || []).map((sale) => {
      return {
        salesId: sale.sales_code,
        date: sale.date ? new Date(sale.date).toLocaleDateString() : "-",
        totalProducts: Number(sale.total_products || 0),
        totalSales: `₱${Number(sale.total_sales || 0).toLocaleString()}`,
        paymentMethod: sale.payment_method || "-",
      };
    });

    setSales(formatted);
const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const grouped = {};

months.forEach((month) => {
  grouped[month] = 0;
});

(data || []).forEach((sale) => {
  if (!sale.date) return;

  const month = new Date(sale.date).toLocaleString("en-US", {
    month: "short",
  });

  grouped[month] += Number(sale.total_sales || 0);
});

const graphData = months.map((month) => ({
  month,
  sales: grouped[month],
}));

setMonthlySales(graphData);
  };

  const filtered = sales.filter((item) => {
    const matchSearch = item.salesId?.toLowerCase().includes(search.toLowerCase());
    const matchPayment = paymentFilter === "All" || item.paymentMethod === paymentFilter;
    return matchSearch && matchPayment;
  });

  const columns = [
    { key: "salesId", label: "Sales ID" },
    { key: "date", label: "Date" },
    { key: "totalProducts", label: "Total Products" },
    { key: "totalSales", label: "Total Sales" },
    { key: "paymentMethod", label: "Payment Method" },
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

      pointHoverBackgroundColor: "#ffffff",
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
    <div className="sales-page">
      
      {/* HEADER SECTION */}
      <div className="sales-header">
        <h1>Sales</h1>
        <p>Monitor daily and monthly sales performance</p>
      </div>

      {/* 💳 OVERVIEW CARDS */}
      <div className="sales-cards-container">
        
        {/* TODAY SALES */}
        <div className="sales-card card-today">
          <div className="icon-wrapper">
            <Calendar size={24} />
          </div>
          <div className="card-info">
            <span className="card-label">Today Sales</span>
            <h2 className="card-value">₱{stats.today.toLocaleString()}</h2>
          </div>
        </div>

        {/* WEEKLY SALES */}
        <div className="sales-card card-weekly">
          <div className="icon-wrapper">
            <BarChart3 size={24} />
          </div>
          <div className="card-info">
            <span className="card-label">Weekly Sales</span>
            <h2 className="card-value">₱{stats.weekly.toLocaleString()}</h2>
          </div>
        </div>

        {/* MONTHLY SALES */}
        <div className="sales-card card-monthly">
          <div className="icon-wrapper">
            <CalendarDays size={24} />
          </div>
          <div className="card-info">
            <span className="card-label">Monthly Sales</span>
            <h2 className="card-value">₱{stats.monthly.toLocaleString()}</h2>
          </div>
        </div>

        {/* OVERALL SALES */}
        <div className="sales-card card-overall">
          <div className="icon-wrapper">
            <PieChart size={24} />
          </div>
          <div className="card-info">
            <span className="card-label">Overall Sales</span>
            <h2 className="card-value">₱{stats.overall.toLocaleString()}</h2>
          </div>
        </div>

      </div>

      {/* CONTROLS SECTION */}
      <div className="controls-row">
        <input
          type="text"
          className="search-input"
          placeholder="Search sales ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="filter-select"
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
        >
          <option value="All">All Payment</option>
          <option value="COD">COD</option>
          <option value="GCash">GCash</option>
          <option value="Card">Card</option>
        </select>
      </div>

      {/* DATA TABLE */}
      <div className="table-container">
        <Table columns={columns} data={filtered} emptyMessage="No sales records yet." />
      </div>

    {/* MONTHLY PERFORMANCE GRAPH */}
  <div className="sales-bottom">
    <div className="sales-graph-card">
      <h3 className="graph-title">Monthly Sales Revenue</h3>

      {monthlySales.length > 0 ? (
        <div style={{ width: "100%", height: "320px" }}>
          <Line data={lineData} options={lineOptions} />
        </div>
      ) : (
        <div className="graph-placeholder">
          No sales yet
        </div>
      )}
    </div>
  </div>
  </div>
  );
}

export default Sales;