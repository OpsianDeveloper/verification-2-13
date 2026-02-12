import { SessionRow } from "@/lib/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const exportToCSV = (sessions: SessionRow[], filename: string = "verifications") => {
  const headers = [
    "Guest Name",
    "Room Number",
    "Status",
    "Verification Score",
    "Time Created",
  ];

  const rows = sessions.map((session) => [
    session.guest_name || "N/A",
    session.room_number || "N/A",
    session.is_verified ? "Verified" : session.verification_score > 0 ? "Failed" : "Pending",
    session.verification_score > 0 ? `${(session.verification_score * 100).toFixed(0)}%` : "N/A",
    new Date(session.created_at).toLocaleString(),
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.csv`);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToPDF = (sessions: SessionRow[], filename: string = "verifications") => {
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(18);
  doc.text("RoomQuest ID - Verification Report", 14, 22);
  
  // Add generation date
  doc.setFontSize(11);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
  
  // Prepare table data
  const tableData = sessions.map((session) => [
    session.guest_name || "N/A",
    session.room_number || "N/A",
    session.is_verified ? "Verified" : session.verification_score > 0 ? "Failed" : "Pending",
    session.verification_score > 0 ? `${(session.verification_score * 100).toFixed(0)}%` : "N/A",
    new Date(session.created_at).toLocaleString(),
  ]);

  // Generate table
  autoTable(doc, {
    head: [
      [
        "Guest Name",
        "Room",
        "Status",
        "Score",
        "Time Created",
      ],
    ],
    body: tableData,
    startY: 35,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [59, 130, 246], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 30 },
      2: { cellWidth: 30 },
      3: { cellWidth: 30 },
      4: { cellWidth: 50 },
    },
  });

  // Save the PDF
  doc.save(`${filename}_${new Date().toISOString().split("T")[0]}.pdf`);
};
