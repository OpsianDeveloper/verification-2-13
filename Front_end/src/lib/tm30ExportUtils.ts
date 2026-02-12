// TM30-specific export utilities
import { ExtendedSessionRow, TM30Data, ExtractedInfo } from "@/types/tm30";

interface TM30ExportRecord {
  // Guest info
  guest_name: string;
  room_number: string;
  verification_status: string;
  verification_score: string;
  created_at: string;
  // Extracted info
  first_name: string;
  middle_name: string;
  last_name: string;
  document_number: string;
  date_of_birth: string;
  date_of_issue: string;
  expiration_date: string;
  id_type: string;
  mrz_code: string;
  // TM30 fields
  nationality: string;
  sex: string;
  arrival_date_time: string;
  departure_date: string;
  property: string;
  tm30_room_number: string;
  notes: string;
}

const buildExportRecord = (session: ExtendedSessionRow): TM30ExportRecord => {
  const extracted = session.extracted_info || {};
  const tm30 = session.tm30 || {};
  
  return {
    guest_name: session.guest_name || "",
    room_number: session.room_number || "",
    verification_status: session.is_verified ? "Verified" : session.verification_score > 0 ? "Failed" : "Pending",
    verification_score: session.verification_score > 0 ? `${(session.verification_score * 100).toFixed(0)}%` : "N/A",
    created_at: new Date(session.created_at).toLocaleString(),
    first_name: extracted.first_name || "",
    middle_name: extracted.middle_name || "",
    last_name: extracted.last_name || "",
    document_number: extracted.document_number || "",
    date_of_birth: extracted.date_of_birth || "",
    date_of_issue: extracted.date_of_issue || "",
    expiration_date: extracted.expiration_date || "",
    id_type: extracted.id_type || "",
    mrz_code: extracted.mrz_code || "",
    nationality: tm30.nationality || "",
    sex: tm30.sex || "",
    arrival_date_time: tm30.arrival_date_time || "",
    departure_date: tm30.departure_date || "",
    property: tm30.property || "",
    tm30_room_number: tm30.room_number || "",
    notes: tm30.notes || "",
  };
};

export const exportTM30ToCSV = (sessions: ExtendedSessionRow[], filename: string = "tm30_export") => {
  const headers = [
    "Guest Name",
    "Room Number",
    "Verification Status",
    "Verification Score",
    "Created At",
    "First Name",
    "Middle Name",
    "Last Name",
    "Document Number",
    "Date of Birth",
    "Date of Issue",
    "Expiration Date",
    "ID Type",
    "MRZ Code",
    "Nationality",
    "Sex",
    "Arrival Date/Time",
    "Departure Date",
    "Property",
    "TM30 Room Number",
    "Notes",
  ];

  const rows = sessions.map((session) => {
    const record = buildExportRecord(session);
    return [
      record.guest_name,
      record.room_number,
      record.verification_status,
      record.verification_score,
      record.created_at,
      record.first_name,
      record.middle_name,
      record.last_name,
      record.document_number,
      record.date_of_birth,
      record.date_of_issue,
      record.expiration_date,
      record.id_type,
      record.mrz_code,
      record.nationality,
      record.sex,
      record.arrival_date_time,
      record.departure_date,
      record.property,
      record.tm30_room_number,
      record.notes,
    ];
  });

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
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

export const exportTM30ToJSON = (sessions: ExtendedSessionRow[], filename: string = "tm30_export") => {
  const records = sessions.map(buildExportRecord);
  
  const jsonContent = JSON.stringify(records, null, 2);
  const blob = new Blob([jsonContent], { type: "application/json" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.json`);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportSingleTM30 = (
  session: ExtendedSessionRow,
  format: "csv" | "json",
  filename?: string
) => {
  const name = filename || `tm30_${session.guest_name?.replace(/\s+/g, "_") || session.id}`;
  
  if (format === "csv") {
    exportTM30ToCSV([session], name);
  } else {
    exportTM30ToJSON([session], name);
  }
};
