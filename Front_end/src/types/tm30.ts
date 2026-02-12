// TM30 Types for verification records

export interface ExtractedInfo {
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  document_number?: string | null;
  date_of_birth?: string | null;
  date_of_issue?: string | null;
  expiration_date?: string | null;
  id_type?: string | null;
  mrz_code?: string | null;
  // Confidence scores (optional)
  name_confidence?: number | null;
  passport_confidence?: number | null;
  document_confidence?: number | null;
}

export interface TM30Data {
  nationality?: string | null;
  sex?: "M" | "F" | "X" | null;
  arrival_date_time?: string | null;
  departure_date?: string | null;
  property?: string | null;
  room_number?: string | null;
  notes?: string | null;
}

export interface ReservationInfo {
  check_in_time?: string | null;
  check_out_date?: string | null;
  property_name?: string | null;
}

export interface GuestVerificationStatus {
  guest_index: number;
  guest_verified: boolean;
  document_uploaded: boolean;
  selfie_uploaded: boolean;
  verification_score?: number;
  liveness_score?: number;
  face_match_score?: number;
  verified_at?: string;
}

export interface ExtendedSessionRow {
  id: string;
  guest_name: string;
  room_number: string;
  is_verified: boolean;
  verification_score: number;
  created_at: string;
  // Extended TM30 fields
  extracted_info?: ExtractedInfo;
  reservation?: ReservationInfo;
  tm30?: TM30Data;
  // Multi-guest verification fields
  expected_guest_count?: number;
  verified_guest_count?: number;
  guest_verifications?: GuestVerificationStatus[];
}

// TM30 Required fields for "Ready" status
export const TM30_REQUIRED_FIELDS: (keyof TM30Data)[] = [
  "nationality",
  "sex",
  "arrival_date_time",
  "property",
  "room_number",
];

export type ConfidenceLevel = "high" | "medium" | "low";

export const getConfidenceLevel = (score: number | null | undefined): ConfidenceLevel | null => {
  if (score === null || score === undefined) return null;
  if (score >= 0.9) return "high";
  if (score >= 0.75) return "medium";
  return "low";
};

export const getTM30ReadyStatus = (tm30: TM30Data | undefined): { ready: boolean; missingFields: string[] } => {
  const missingFields: string[] = [];

  if (!tm30) {
    return { ready: false, missingFields: TM30_REQUIRED_FIELDS as string[] };
  }

  TM30_REQUIRED_FIELDS.forEach((field) => {
    const value = tm30[field];
    if (value === null || value === undefined || value === "") {
      missingFields.push(field);
    }
  });

  return { ready: missingFields.length === 0, missingFields };
};

// Common nationalities for dropdown
export const COMMON_NATIONALITIES = [
  "Thai",
  "Chinese",
  "Japanese",
  "Korean",
  "American",
  "British",
  "Australian",
  "German",
  "French",
  "Indian",
  "Russian",
  "Malaysian",
  "Singaporean",
  "Vietnamese",
  "Indonesian",
  "Filipino",
  "Canadian",
  "Italian",
  "Spanish",
  "Dutch",
];
