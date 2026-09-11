import React, { useState, useEffect } from "react"; 
import { supabase } from "../../../supabase";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from "chart.js";

import { Line, Pie } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  ChartTooltip,
  Legend,
  Filler
);

import "./co-dashboard.css";

export default function CoDashboard() {
 const [salesData, setSalesData] = useState([]);
  const [deliveryData, setDeliveryData] = useState([]);
   
   const COLORS = ["#22c55e", "#facc15", "#ef4444"];
 
   // Ilagay ito sa taas kasama ng ibang useState
   const [salesRange, setSalesRange] = useState("daily"); 
   const [salesValue, setSalesValue] = useState(0);
   
 const [stats, setStats] = useState({
   totalInventory: 0,
   expenses: 0,
   stock: 0
 });

 useEffect(() => {
   const fetchStats = async () => {
     // 1. Total Inventory (halimbawa: count ng items sa products table)
     const { count: inventoryCount } = await supabase.from("inventory").select("*", { count: "exact", head: true });
 
     // 2. Total Expenses (Sum ng lahat ng amount sa expenses table)
   const { data: expensesData } = await supabase
     .from("expenses")
     .select("amount");
   const totalExpenses = expensesData?.reduce((acc, curr) => acc + (curr.amount || 0), 0) || 0;
 
   // 3. Total Stock (Sum ng quantity sa products table)
   const { data: stocksData } = await supabase
     .from("inventory")
     .select("quantity_available");
   const totalStock = stocksData?.reduce((acc, curr) => acc + (curr.quantity_available || 0), 0) || 0;
   
 setStats({
   totalInventory: inventoryCount || 0,
   expenses: totalExpenses,
   stock: totalStock
 });}
 
   fetchStats();
 }, []);

  // sales
   useEffect(() => {
     const fetchSales = async () => {
       const now = new Date();
       let startDate = new Date();
 
       if (salesRange === "daily") {
         startDate.setHours(0, 0, 0, 0);
       } else if (salesRange === "weekly") {
         startDate.setDate(now.getDate() - 7);
       } else if (salesRange === "monthly") {
         startDate.setMonth(now.getMonth() - 1);
       }
 
       const { data, error } = await supabase
         .from("sales")
         .select("total_sales")
         .gte("date", startDate.toISOString());
 
       if (!error && data) {
         const total = data.reduce((acc, curr) => acc + (Number(curr.total_sales) || 0), 0);
         setSalesValue(total);
       }
     };
     fetchSales();
   }, [salesRange]);

   useEffect(() => {
     const fetchMonthlySales = async () => {
       const { data, error } = await supabase
         .from("sales")
         .select("date, total_sales");
   
       if (error) {
         console.log(error.message);
         return;
       }
   
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
   
       // Initialize lahat ng buwan sa 0
       const grouped = {};
   
       months.forEach((month) => {
         grouped[month] = 0;
       });
   
       // I-add ang sales sa tamang buwan
       (data || []).forEach((sale) => {
         if (!sale.date) return;
   
         const month = new Date(sale.date).toLocaleString("en-US", {
           month: "short",
         });
   
         grouped[month] += Number(sale.total_sales || 0);
       });
   
       // Gumawa ng array Jan-Dec
       const graphData = months.map((month) => ({
         month,
         sales: grouped[month],
       }));
   
       setSalesData(graphData);
     };
   
     fetchMonthlySales();
   }, []);
    useEffect(() => {
     const fetchDeliveryStatus = async () => {
       const { data, error } = await supabase
         .from("delivery_schedule")
         .select("delivery_status");
   
       if (error) {
         console.log(error.message);
         return;
       }
       const counts = {
         Delivered: 0,
         Pending: 0,
         "Out for Delivery": 0,
       };
   
       data.forEach((item) => {
         if (counts[item.delivery_status] !== undefined) {
           counts[item.delivery_status]++;
         }
       });
   
       setDeliveryData([
         { name: "Delivered", value: counts.Delivered },
         { name: "Pending", value: counts.Pending },
         { name: "Out for Delivery", value: counts["Out for Delivery"] },
       ]); 
         };
   
     fetchDeliveryStatus();
   }, []);
   
     const pieData = {
     labels: deliveryData.map(item => item.name),
     datasets: [
       {
         data: deliveryData.map(item => item.value),
         backgroundColor: [
           "#22c55e",
           "#facc15",
           "#1d4ed8",
         ],
       },
     ],
   };
       const pieOptions = {
         responsive: true,
         maintainAspectRatio: false,
         plugins: {
           legend: {
             position: "bottom",
           },
         },
       };
  const lineData = {
  labels: salesData.map(item => item.month),

  datasets: [
    {
      label: "Monthly Sales",

      data: salesData.map(item => item.sales),

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
  
 datasets: [
    {
      label: "Monthly Sales",

     data: salesData.map(item => item.sales),

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
   <div className="co-dashboard-header">
      <h1>Co-Associate Dashboard</h1>

      {/* CARDS */}
        <div className="codashboard-grid">
          <div className="codashboard-card green">
            <h3>Total Inventory</h3>
            <p>{stats.totalInventory}</p>
          </div>

          <div className="codashboard-card purple">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3>Total Sales</h3>
                    <select 
                      value={salesRange} 
                      onChange={(e) => setSalesRange(e.target.value)}
                      className="small-sales-dropdown"
                    >
                      <option value="daily">Today</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
              <p>₱{salesValue.toLocaleString()}</p>
                </div>

          <div className="codashboard-card red">
            <h3>Expenses</h3>
            <p>₱{stats.expenses}</p>
          </div>

          <div className="codashboard-card blue">
            <h3>Stocks</h3>
            <p>{stats.stock}</p>
          </div>
        </div>

       {/* CHARTS */}
      <div className="cograph-container">
      
       <div className="cochart-card">
        <h3>Monthly Sales</h3>
      
        {salesData.length === 0 ? (
          <div className="coempty-state">No sales data yet</div>
        ) : (
          <div style={{ width: "100%", height: "320px" }}>
            <Line data={lineData} options={lineOptions} />
          </div>
        )}
      </div>
      </div>
    </div>
  );
}