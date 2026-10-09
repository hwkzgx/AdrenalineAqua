import React from "react";
import InsightsView from "../../../components/Insights/InsightsView";

export default function AdminInsights() {
  return (
    <div className="sales-page">
      <InsightsView role="admin" customTitle="Insights" />
    </div>
  );
}
