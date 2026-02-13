import { getApiBaseUrl } from "./storage";

/* ======================================================
   ACTION TYPES
====================================================== */

export type VerifyAction = "start" | "log_consent" | "update_guest" | "get_session" | "upload_document" | "verify_face" | "validate_document" | "validate_selfie";

/* ======================================================
   REQUEST TYPES
====================================================== */

export interface StartSessionRequest {
  action: "start";
  flow_type?: "guest" | "visitor";
}

export interface StartVisitorRequest {
  action: "start_visitor";
}

export interface LogConsentRequest {
  action: "log_consent";
  session_token: string;
  consent_given: boolean;
  consent_time: string;
  consent_locale: string;
}

export interface UpdateGuestRequest {
  action: "update_guest";
  session_token: string;
  guest_name?: string;
  booking_ref?: string; // preferred
  room_number?: string; // fallback (legacy naming)
  flow_type?: "guest" | "visitor";
  visitor_first_name?: string;
  visitor_last_name?: string;
  visitor_phone?: string;
  visitor_reason?: string;
}

export interface GetSessionRequest {
  action: "get_session";
  session_token: string;
}

export interface UploadDocumentRequest {
  action: "upload_document";
  session_token: string;
  image_data: string;
  document_type?: string;
  guest_name?: string;
  room_number?: string;
  guest_index?: number;
}

export interface VerifyFaceRequest {
  action: "verify_face";
  session_token: string;
  image_data?: string;
  selfie_data: string;
  guest_index?: number;
}

export interface ValidateDocumentRequest {
  action: "validate_document";
  image_data: string;
}

export interface ValidateSelfieRequest {
  action: "validate_selfie";
  image_data: string;
}

export type VerifyRequest =
  | StartSessionRequest
  | StartVisitorRequest
  | LogConsentRequest
  | UpdateGuestRequest
  | GetSessionRequest
  | UploadDocumentRequest
  | VerifyFaceRequest
  | ValidateDocumentRequest
  | ValidateSelfieRequest;

/* ======================================================
   RESPONSE TYPES
====================================================== */

export interface SessionState {
  session_token: string;
  status?: string | null;
  current_step?: string | null;
  consent_given?: boolean | null;
  consent_time?: string | null;
  consent_locale?: string | null;
  guest_name?: string | null;
  room_number?: string | null;
  document_uploaded?: boolean;
  selfie_uploaded?: boolean;
  is_verified?: boolean | null;
  verification_score?: number | null;
  liveness_score?: number | null;
  face_match_score?: number | null;
  // Multi-guest verification fields
  requires_additional_guest?: boolean;
  expected_guest_count?: number;
  verified_guest_count?: number;
  guest_index?: number;
}

// Session alias - use SessionRow for admin/staff tables
export type Session = SessionRow;

export interface VerifyResponse {
  success?: boolean;
  session_token?: string;
  verify_url?: string;
  message?: string;
  error?: string;

  // verification results
  is_verified?: boolean;
  verification_score?: number;
  liveness_score?: number;
  face_match_score?: number;

  // resume
  session?: SessionState;

  // nested legacy format (backend sometimes wraps data)
  data?: {
    is_verified?: boolean;
    verification_score?: number;
    liveness_score?: number;
    face_match_score?: number;
    // Multi-guest fields may also appear here
    guest_verified?: boolean;
    requires_additional_guest?: boolean;
    verified_guest_count?: number;
    expected_guest_count?: number;
    guest_index?: number;
  };

  extracted_text?: string;

  // Multi-guest verification fields (from verify_face response)
  guest_verified?: boolean;  // Did THIS guest pass verification?
  requires_additional_guest?: boolean;
  expected_guest_count?: number;
  verified_guest_count?: number;
  remaining_guest_verifications?: number;
  guest_index?: number;
}

export interface AdminStats {
  totalVerifications: number;
  successfulVerifications: number;
  successRate: number;
  totalCost: number;
}

export interface SessionRow {
  id: string;
  guest_name: string;
  room_number: string;
  is_verified: boolean;
  verification_score: number;
  created_at: string;
  // Flow type
  flow_type?: "guest" | "visitor";
  // Visitor-specific fields
  visitor_first_name?: string;
  visitor_last_name?: string;
  visitor_phone?: string;
  visitor_reason?: string;
  visitor_access_code?: string;
  // Extracted info from Textract
  extracted_info?: {
    text?: string;
    textract?: {
      dob?: string;
      raw?: {
        id_type?: string;
        mrz_code?: string;
        last_name?: string;
        first_name?: string;
        middle_name?: string;
        date_of_birth?: string;
        date_of_issue?: string;
        place_of_birth?: string;
        document_number?: string;
        expiration_date?: string;
      };
      full_name?: string;
      nationality?: string;
      document_number?: string;
    };
    textract_ok?: boolean;
    textract_error?: string;
  } | null;
  // TM30 fields from backend
  tm30_info?: Record<string, unknown>;
  tm30_status?: string;
  // Additional fields
  session_token?: string;
  status?: string;
  liveness_score?: number | null;
  face_match_score?: number | null;
  // Multi-guest verification fields
  expected_guest_count?: number;
  verified_guest_count?: number;
  guest_verifications?: GuestVerification[];
}

// Individual guest verification record
export interface GuestVerification {
  guest_index: number;
  guest_verified: boolean;
  document_uploaded: boolean;
  selfie_uploaded: boolean;
  verification_score?: number;
  liveness_score?: number;
  face_match_score?: number;
  verified_at?: string;
}

/* ======================================================
   API SERVICE
====================================================== */

class ApiService {
  private async fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}${endpoint}`;

    console.log(`[ApiService] ${options?.method || "GET"} ${endpoint}`);
    if (options?.body) {
      console.log("[ApiService] Request body:", options.body);
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    const rawText = await response.text();
    console.log(`[ApiService] Response ${response.status}:`, rawText || "<empty>");

    let parsed: T;
    try {
      parsed = rawText ? JSON.parse(rawText) : ({} as T);
    } catch (err) {
      throw new Error(`Failed to parse API response: ${rawText}`);
    }

    if (!response.ok) {
      const errorMsg = (parsed as any)?.error || (parsed as any)?.message || `API error ${response.status}`;
      throw new Error(errorMsg);
    }

    return parsed;
  }

  /* ---------- VERIFY (all actions) ---------- */
  async verify(data: VerifyRequest): Promise<VerifyResponse> {
    return this.fetchApi<VerifyResponse>("/api/verify", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /* ---------- RESUME ---------- */
  async getSession(sessionToken: string): Promise<VerifyResponse> {
    return this.verify({
      action: "get_session",
      session_token: sessionToken,
    });
  }

  /* ---------- ADMIN ---------- */
  async getAdminStats(): Promise<AdminStats> {
    return this.fetchApi<AdminStats>("/api/admin/stats");
  }

  async getAdminSessions(): Promise<SessionRow[]> {
    return this.fetchApi<SessionRow[]>("/api/admin/sessions");
  }
}

export const api = new ApiService();
