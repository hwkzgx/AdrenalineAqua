import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Sanitize text for standard jsPDF fonts (converts Peso sign, bullet points, smart quotes, etc.)
 */
export function cleanPdfText(input) {
  if (input === null || input === undefined) return "";
  const str = String(input);
  return str
    .replace(/₱/g, "PHP ")
    .replace(/[•●▪]/g, "- ")
    .replace(/[—–]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\r\n/g, "\n")
    .replace(/[^\x00-\x7F]/g, (char) => {
      const map = {
        "…": "...",
        "™": "(TM)",
        "©": "(C)",
        "®": "(R)",
        "°": " deg",
        "±": "+/-",
        "≥": ">=",
        "≤": "<=",
        "×": "x",
        "÷": "/",
        "→": "->",
        "←": "<-",
        "✓": "[OK]",
        "✔": "[OK]",
      };
      return map[char] || "";
    });
}

/**
 * ==========================================
 * EXPORT INSIGHTS TO PDF
 * ==========================================
 */
export const exportInsightsToPDF = (
  insightsResult,
  role = "admin",
  currentUser = null,
  filename = null
) => {
  if (!insightsResult) return;

  const doc = new jsPDF();
  const primaryColor = [2, 69, 122]; // #02457A Brand Blue
  const darkSlate = [30, 41, 59];
  const mutedGray = [100, 116, 139];
  const lightBg = [248, 250, 252];
  const accentBorder = [226, 232, 240];

  const roleName = role ? role.charAt(0).toUpperCase() + role.slice(1) : "Station";
  const userName = cleanPdfText(currentUser?.name || currentUser?.fullName || `${roleName} User`);
  const reportDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // 1. Top Decorative Bar & Header
  doc.setFillColor(...primaryColor);
  doc.rect(14, 12, 4, 16, "F");

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...darkSlate);
  doc.text("ADRENALINE AQUA WATER REFILLING STATION", 22, 19);

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...mutedGray);
  doc.text(
    role === "customer"
      ? "Personal Hydration Analytics & Refill Strategy Report"
      : "AI Business Intelligence & Executive Operational Briefing",
    22,
    25
  );

  // Meta on Right
  doc.setFontSize(8.5);
  doc.text(`Date: ${reportDate}`, 196, 18, { align: "right" });
  doc.text(`Target: ${roleName} (${userName})`, 196, 24, { align: "right" });

  // Divider line
  doc.setDrawColor(...accentBorder);
  doc.setLineWidth(0.4);
  doc.line(14, 32, 196, 32);

  // 2. Executive Headline Box (Dynamic Height)
  let currentY = 38;
  const headlineText = cleanPdfText(insightsResult.headline || "Operational Summary");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  const headlineLines = doc.splitTextToSize(headlineText, 170);
  const headlineHeight = headlineLines.length * 4.8;
  const briefingBoxHeight = 10 + headlineHeight + 2;

  doc.setFillColor(...lightBg);
  doc.setDrawColor(...accentBorder);
  doc.setLineWidth(0.4);
  doc.roundedRect(14, currentY, 182, briefingBoxHeight, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...primaryColor);
  doc.text("EXECUTIVE BRIEFING", 19, currentY + 6);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...darkSlate);
  doc.text(headlineLines, 19, currentY + 12);

  currentY += briefingBoxHeight + 6;

  // 3. Highlight Callout Box (Dynamic Height)
  if (insightsResult.highlightBanner) {
    const bannerTitle = cleanPdfText(insightsResult.highlightBanner.title || "Key Focus");
    const bannerSubtitle = cleanPdfText(insightsResult.highlightBanner.subtitle || "");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const bannerSubLines = doc.splitTextToSize(bannerSubtitle, 170);
    const bannerSubHeight = bannerSubLines.length * 4.2;
    const bannerBoxHeight = 9 + bannerSubHeight + 3;

    doc.setFillColor(239, 246, 255); // #eff6ff
    doc.setDrawColor(191, 219, 254);
    doc.setLineWidth(0.4);
    doc.roundedRect(14, currentY, 182, bannerBoxHeight, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(2, 69, 122);
    doc.text(`KEY FOCUS: ${bannerTitle}`, 19, currentY + 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(bannerSubLines, 19, currentY + 11);

    currentY += bannerBoxHeight + 6;
  }

  // 4. Performance Diagnostics Table
  const metricsRows = (insightsResult.keyMetrics || []).map((m) => [
    cleanPdfText(m.label || "-"),
    cleanPdfText(m.value || "-"),
    cleanPdfText(m.badge || "-"),
    cleanPdfText(m.trend?.toUpperCase() || "STABLE"),
  ]);

  const overviewHeader =
    role === "rider"
      ? "Riding Overview Metric"
      : role === "customer"
      ? "Customer Overview Metric"
      : "Business Overview Metric";

  if (metricsRows.length > 0) {
    autoTable(doc, {
      startY: currentY,
      head: [[overviewHeader, "Current Value", "Classification", "Trend"]],
      body: metricsRows,
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: 8,
        cellPadding: 3.5,
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8.5,
      },
      bodyStyles: {
        textColor: [51, 65, 85],
      },
      columnStyles: {
        0: { cellWidth: 55, fontStyle: "bold" },
        1: { cellWidth: 45 },
        2: { cellWidth: 50 },
        3: { cellWidth: 32 },
      },
      margin: { left: 14, right: 14 },
    });
    currentY = doc.lastAutoTable.finalY + 8;
  }

  // 5. Key Observations Table (Clean bulleted format, left-aligned)
  const observationsRows = (insightsResult.insights || []).map((item) => {
    let bulletsText = "";
    if (Array.isArray(item.bullets) && item.bullets.length > 0) {
      bulletsText = item.bullets
        .filter(Boolean)
        .map((b) => `- ${cleanPdfText(b)}`)
        .join("\n");
    } else if (item.description) {
      bulletsText = cleanPdfText(item.description);
    }
    return [
      cleanPdfText(item.category || "General"),
      cleanPdfText(item.title || "Observation"),
      bulletsText || "-",
      cleanPdfText(item.impact?.toUpperCase() || "POSITIVE"),
    ];
  });

  if (observationsRows.length > 0) {
    autoTable(doc, {
      startY: currentY,
      head: [["Category", "Key Observation", "Diagnostic Takeaways", "Impact"]],
      body: observationsRows,
      theme: "striped",
      styles: {
        font: "helvetica",
        fontSize: 8,
        cellPadding: 3.5,
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8.5,
      },
      bodyStyles: {
        textColor: [51, 65, 85],
      },
      columnStyles: {
        0: { cellWidth: 26 },
        1: { cellWidth: 42, fontStyle: "bold" },
        2: { cellWidth: 90 },
        3: { cellWidth: 24 },
      },
      margin: { left: 14, right: 14 },
    });
    currentY = doc.lastAutoTable.finalY + 8;
  }

  // 6. Actionable Recommendations Table (Left-aligned)
  const recommendationsRows = (insightsResult.recommendations || []).map((item) => {
    let actionsText = "";
    if (Array.isArray(item.bullets) && item.bullets.length > 0) {
      actionsText = item.bullets
        .filter(Boolean)
        .map((b) => `- ${cleanPdfText(b)}`)
        .join("\n");
    } else if (item.action) {
      actionsText = cleanPdfText(item.action);
    }
    return [
      cleanPdfText(item.priority?.toUpperCase() || "MEDIUM"),
      cleanPdfText(item.title || "Strategy"),
      actionsText || "-",
      cleanPdfText(item.benefit || "-"),
    ];
  });

  if (recommendationsRows.length > 0) {
    autoTable(doc, {
      startY: currentY,
      head: [["Priority", "Action Plan", "Operational Steps", "Expected Outcome"]],
      body: recommendationsRows,
      theme: "striped",
      styles: {
        font: "helvetica",
        fontSize: 8,
        cellPadding: 3.5,
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8.5,
      },
      bodyStyles: {
        textColor: [51, 65, 85],
      },
      columnStyles: {
        0: { cellWidth: 24, fontStyle: "bold" },
        1: { cellWidth: 44, fontStyle: "bold" },
        2: { cellWidth: 64 },
        3: { cellWidth: 50 },
      },
      margin: { left: 14, right: 14 },
    });
    currentY = doc.lastAutoTable.finalY + 8;
  }

  // 7. Projections / Growth Strategy (Compact & Sleek Dynamic Box)
  if (insightsResult.specializedSection) {
    const titleText = cleanPdfText(
      insightsResult.specializedSection.title || "Strategic Blueprint"
    );
    const detailsText = cleanPdfText(
      insightsResult.specializedSection.details || ""
    );
    const tipRaw = insightsResult.specializedSection.actionTip
      ? `Pro Tip: ${insightsResult.specializedSection.actionTip.replace(/^Pro Tip:\s*/i, "")}`
      : "";
    const tipText = cleanPdfText(tipRaw);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const detailsLines = doc.splitTextToSize(detailsText, 172);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    const tipLines = tipText ? doc.splitTextToSize(tipText, 172) : [];

    const detailsHeight = detailsLines.length * 3.8;
    const tipHeight = tipLines.length > 0 ? tipLines.length * 3.8 + 2 : 0;
    const boxHeight = 5.5 + 3.5 + detailsHeight + tipHeight + 3;

    // Check if box fits on current page
    if (currentY + boxHeight > 275) {
      doc.addPage();
      currentY = 20;
    }

    // Draw container card
    doc.setFillColor(...lightBg);
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.4);
    doc.roundedRect(14, currentY, 182, boxHeight, 2, 2, "FD");

    // Title
    let innerY = currentY + 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...primaryColor);
    doc.text(titleText, 18, innerY);

    // Details paragraph
    innerY += 4.2;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.8);
    doc.setTextColor(...darkSlate);
    doc.text(detailsLines, 18, innerY);

    // Action Tip
    if (tipLines.length > 0) {
      innerY += detailsHeight + 1.5;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.8);
      doc.setTextColor(2, 69, 122);
      doc.text(tipLines, 18, innerY);
    }

    currentY += boxHeight + 6;
  }

  // Footer on all pages
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(...mutedGray);
    doc.text(
      `Adrenaline Aqua Refilling Station • Performance & Insights Report • Page ${i} of ${pageCount}`,
      105,
      290,
      { align: "center" }
    );
  }

  const defaultFilename =
    filename ||
    `Adrenaline-Aqua-Insights-${role}-${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(defaultFilename);
};
