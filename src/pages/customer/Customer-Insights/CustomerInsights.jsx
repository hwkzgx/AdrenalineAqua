import React from "react";
import CustomerTopbar from "../../../components/NavBar/CustomerTopbar";
import InsightsView from "../../../components/Insights/InsightsView";
import "../Customer-Dashboard/customer-dashboard.css";

export default function CustomerInsights() {
  return (
    <>
      <CustomerTopbar />
      <div className="cusdashboard-container">
        <InsightsView role="customer" customTitle="Insights" />
      </div>
    </>
  );
}
