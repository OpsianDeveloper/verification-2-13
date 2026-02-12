import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  Calendar,
  Download,
  FileText,
  CheckCircle2,
  AlertTriangle,
  FileJson,
  FileSpreadsheet,
  Users,
  User,
} from "lucide-react";
import { exportToCSV, exportToPDF } from "@/lib/exportUtils";
import { exportTM30ToCSV, exportTM30ToJSON } from "@/lib/tm30ExportUtils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SessionRow, GuestVerification } from "@/lib/api";
import { ExtendedSessionRow, TM30Data, getTM30ReadyStatus, GuestVerificationStatus } from "@/types/tm30";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import TM30DetailsDrawer from "./TM30DetailsDrawer";

type FilterStatus = "all" | "verified" | "failed" | "pending";
type FlowTypeFilter = "all" | "guests" | "visitors";

interface VerificationsTableStaffProps {
  sessions: SessionRow[];
}

const toDatetimeLocalFromISO = (iso?: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 16);
};

// Preserve backend data first. Only add fallbacks if missing.
const toExtendedSession = (session: SessionRow): ExtendedSessionRow => {
  const s: any = session as any;

  const extractedAny = s?.extracted_info || {};
  const textract = extractedAny?.textract || null;
  const textractRaw = textract?.raw || null;

  // mrz_parsed can exist either at extracted_info.mrz_parsed or extracted_info.textract.mrz_parsed
  const mrzParsed = extractedAny?.mrz_parsed || textract?.mrz_parsed || null;

  const textractOk = extractedAny?.textract_ok ?? null;

  // Start by preserving whatever backend already provides
  const extracted_info: any = {
    ...extractedAny,
  };

  // Only fill “flat” fields if they are missing
  if (extracted_info.first_name == null) extracted_info.first_name = textractRaw?.first_name ?? null;
  if (extracted_info.middle_name == null) extracted_info.middle_name = textractRaw?.middle_name ?? null;
  if (extracted_info.last_name == null) extracted_info.last_name = textractRaw?.last_name ?? null;

  if (extracted_info.document_number == null) {
    extracted_info.document_number = textractRaw?.document_number ?? textract?.document_number ?? null;
  }

  if (extracted_info.date_of_birth == null) {
    extracted_info.date_of_birth = textractRaw?.date_of_birth ?? textract?.dob ?? null;
  }

  if (extracted_info.date_of_issue == null) extracted_info.date_of_issue = textractRaw?.date_of_issue ?? null;
  if (extracted_info.expiration_date == null) extracted_info.expiration_date = textractRaw?.expiration_date ?? null;
  if (extracted_info.id_type == null) extracted_info.id_type = textractRaw?.id_type ?? null;
  if (extracted_info.mrz_code == null) extracted_info.mrz_code = textractRaw?.mrz_code ?? null;

  // Normalize important nested fields so the drawer can rely on them
  extracted_info.textract = extracted_info.textract ?? textract ?? null;
  extracted_info.textract_ok = extracted_info.textract_ok ?? textractOk ?? null;
  extracted_info.mrz_parsed = extracted_info.mrz_parsed ?? mrzParsed ?? null;

  // Confidence placeholders (leave existing if present)
  if (extracted_info.name_confidence == null) extracted_info.name_confidence = textractOk ? 0.95 : null;
  if (extracted_info.passport_confidence == null) extracted_info.passport_confidence = textractOk ? 0.9 : null;
  if (extracted_info.document_confidence == null) extracted_info.document_confidence = textractOk ? 0.92 : null;

  const tm30Info: any = s?.tm30_info || {};

  const arrivalFromCreatedAt = toDatetimeLocalFromISO(s.created_at);

  // Convert guest_verifications from API to GuestVerificationStatus
  const guestVerifications: GuestVerificationStatus[] = (s.guest_verifications || []).map((gv: GuestVerification) => ({
    guest_index: gv.guest_index,
    guest_verified: gv.guest_verified,
    document_uploaded: gv.document_uploaded,
    selfie_uploaded: gv.selfie_uploaded,
    verification_score: gv.verification_score,
    liveness_score: gv.liveness_score,
    face_match_score: gv.face_match_score,
    verified_at: gv.verified_at,
  }));

  return {
    ...s,
    extracted_info,
    reservation: {
      check_in_time: null,
      check_out_date: null,
      property_name: "RoomQuest Hotel",
    },
    tm30: {
      // prefer tm30_info; fallback to MRZ parsed
      nationality: tm30Info?.nationality ?? mrzParsed?.nationality ?? null,
      sex: tm30Info?.sex ?? mrzParsed?.sex ?? null,

      // auto-fill arrival from created_at if not set
      arrival_date_time: tm30Info?.arrival_date_time ?? arrivalFromCreatedAt ?? null,

      // keep value in state if present, but UI can hide it
      departure_date: tm30Info?.departure_date ?? null,

      property: tm30Info?.property ?? "RoomQuest Hotel",
      room_number: tm30Info?.room_number ?? s?.room_number ?? null,
      notes: tm30Info?.notes ?? null,
    },
    // Multi-guest fields
    expected_guest_count: s.expected_guest_count,
    verified_guest_count: s.verified_guest_count,
    guest_verifications: guestVerifications,
  } as ExtendedSessionRow;
};

const VerificationsTableStaff = ({ sessions }: VerificationsTableStaffProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [flowTypeFilter, setFlowTypeFilter] = useState<FlowTypeFilter>("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const [tm30DataMap, setTm30DataMap] = useState<Record<string, TM30Data>>({});
  const [tm30ReadyMap, setTm30ReadyMap] = useState<Record<string, boolean>>({});

  const extendedSessions = useMemo(() => {
    return sessions.map((session) => {
      const extended = toExtendedSession(session);
      if (tm30DataMap[(session as any).id]) {
        extended.tm30 = { ...extended.tm30, ...tm30DataMap[(session as any).id] };
      }
      return extended;
    });
  }, [sessions, tm30DataMap]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 1) return t("staff.table.justNow");
    if (diffMins < 60) return t("staff.table.minutesAgo", { count: diffMins });
    if (diffHours < 24) return t("staff.table.hoursAgo", { count: diffHours });
    return t("staff.table.daysAgo", { count: diffDays });
  };

  const getStatusBadge = (session: ExtendedSessionRow) => {
    if ((session as any).verification_score >= 0.7) {
      return <Badge className="bg-green-500/20 text-green-300 border-green-500/30">{t("staff.table.verified")}</Badge>;
    } else if ((session as any).verification_score > 0) {
      return <Badge className="bg-red-500/20 text-red-300 border-red-500/30">{t("staff.table.failed")}</Badge>;
    }
    return <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">{t("staff.table.pending")}</Badge>;
  };

  // Get multi-guest progress badge
  const getGuestProgressBadge = (session: ExtendedSessionRow) => {
    const expected = session.expected_guest_count;
    const verified = session.verified_guest_count ?? 0;
    
    // Only show if multi-guest (2+ expected)
    if (!expected || expected < 2) {
      return null;
    }

    const allVerified = verified >= expected;
    
    return (
      <Badge 
        className={allVerified 
          ? "bg-green-500/20 text-green-300 border-green-500/30" 
          : "bg-blue-500/20 text-blue-300 border-blue-500/30"
        }
      >
        {t("staff.table.guestsProgress", { verified, total: expected })}
      </Badge>
    );
  };

  // Get individual guest status icons
  const getGuestVerificationDetails = (session: ExtendedSessionRow) => {
    const guests = session.guest_verifications || [];
    const expected = session.expected_guest_count || 1;
    
    if (expected < 2 || guests.length === 0) {
      return null;
    }

    return (
      <div className="flex flex-col gap-1 mt-2">
        {guests.map((guest, idx) => (
          <div key={idx} className="flex items-center gap-2 text-xs">
            <span className="text-white/60">{t("staff.table.guestLabel", { index: guest.guest_index + 1 })}:</span>
            <span className={guest.document_uploaded ? "text-green-400" : "text-yellow-400"}>
              {guest.document_uploaded ? "✓" : "○"} {t("staff.table.documentStatus")}
            </span>
            <span className={guest.selfie_uploaded ? "text-green-400" : "text-yellow-400"}>
              {guest.selfie_uploaded ? "✓" : "○"} {t("staff.table.selfieStatus")}
            </span>
            {guest.guest_verified && (
              <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs py-0">
                ✓ {t("staff.table.verified")}
              </Badge>
            )}
          </div>
        ))}
      </div>
    );
  };

  const getTM30StatusBadge = (session: ExtendedSessionRow) => {
    const id = (session as any).id;

    if (tm30ReadyMap[id]) {
      return (
        <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          TM30 Ready
        </Badge>
      );
    }

    const { ready, missingFields } = getTM30ReadyStatus((session as any).tm30);
    if (ready) {
      return (
        <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          TM30 Ready
        </Badge>
      );
    }

    return (
      <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
        <AlertTriangle className="w-3 h-3 mr-1" />
        Missing ({missingFields.length})
      </Badge>
    );
  };

  const getStatus = (session: ExtendedSessionRow): FilterStatus => {
    if ((session as any).verification_score >= 0.7) return "verified";
    if ((session as any).verification_score > 0) return "failed";
    return "pending";
  };

  const filteredSessions = extendedSessions.filter((session) => {
    // Flow type filter
    const sessionFlowType = (session as any).flow_type || "guest";
    const flowTypeMatch = 
      flowTypeFilter === "all" || 
      (flowTypeFilter === "guests" && sessionFlowType === "guest") ||
      (flowTypeFilter === "visitors" && sessionFlowType === "visitor");
    
    if (!flowTypeMatch) return false;
    
    // Status filter
    const statusMatch = filterStatus === "all" || getStatus(session) === filterStatus;
    if (!statusMatch) return false;
    
    // Date filter
    if (!selectedDate) return true;
    const sessionDate = new Date((session as any).created_at);
    const dateMatch =
      sessionDate.getDate() === selectedDate.getDate() &&
      sessionDate.getMonth() === selectedDate.getMonth() &&
      sessionDate.getFullYear() === selectedDate.getFullYear();
    return dateMatch;
  });

  const readySessions = filteredSessions.filter((s) => {
    if (tm30ReadyMap[(s as any).id]) return true;
    return getTM30ReadyStatus((s as any).tm30).ready;
  });

  const selectedReadySessions = filteredSessions.filter(
    (s) =>
      selectedRows.has((s as any).id) && (tm30ReadyMap[(s as any).id] || getTM30ReadyStatus((s as any).tm30).ready),
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const readyIds = readySessions.map((s) => (s as any).id);
      setSelectedRows(new Set(readyIds));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedRows);
    if (checked) newSelected.add(id);
    else newSelected.delete(id);
    setSelectedRows(newSelected);
  };

  const handleSaveTM30 = (sessionId: string, tm30Data: TM30Data) => {
    setTm30DataMap((prev) => ({ ...prev, [sessionId]: tm30Data }));
  };

  const handleMarkReady = (sessionId: string) => {
    setTm30ReadyMap((prev) => ({ ...prev, [sessionId]: true }));
  };

  const handleBulkExport = (format: "csv" | "json") => {
    const toExport = selectedRows.size > 0 ? selectedReadySessions : readySessions;

    if (toExport.length === 0) {
      toast({ title: "No Records", description: "No TM30 Ready records to export.", variant: "destructive" });
      return;
    }

    if (selectedRows.size > 0 && selectedReadySessions.length < selectedRows.size) {
      toast({
        title: "Partial Export",
        description: `Only ${selectedReadySessions.length} TM30 Ready records will be exported (${selectedRows.size - selectedReadySessions.length} non-ready records skipped).`,
      });
    }

    if (format === "csv") exportTM30ToCSV(toExport, "tm30_bulk_export");
    else exportTM30ToJSON(toExport, "tm30_bulk_export");

    toast({ title: "Exported", description: `${toExport.length} TM30 records exported as ${format.toUpperCase()}.` });
  };

  const hasSelectedRows = selectedRows.size > 0;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-6">
      {/* Flow Type Tabs */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={flowTypeFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFlowTypeFilter("all")}
          className={flowTypeFilter === "all" ? "bg-white text-gray-900 shadow-lg" : "glass-button"}
        >
          {t("staff.table.showAll")}
        </Button>
        <Button
          variant={flowTypeFilter === "guests" ? "default" : "outline"}
          size="sm"
          onClick={() => setFlowTypeFilter("guests")}
          className={flowTypeFilter === "guests" ? "bg-white text-gray-900 shadow-lg" : "glass-button"}
        >
          <User className="w-4 h-4 mr-2" />
          {t("staff.table.guests")}
        </Button>
        <Button
          variant={flowTypeFilter === "visitors" ? "default" : "outline"}
          size="sm"
          onClick={() => setFlowTypeFilter("visitors")}
          className={flowTypeFilter === "visitors" ? "bg-white text-gray-900 shadow-lg" : "glass-button"}
        >
          <Users className="w-4 h-4 mr-2" />
          {t("staff.table.visitors")}
        </Button>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-2xl text-white font-poppins font-thin">{t("staff.todayVerifications")}</h2>

        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <Button
            onClick={() => exportToCSV(sessions, "roomquest_verifications")}
            variant="outline"
            size="sm"
            className="glass-button"
          >
            <Download className="w-4 h-4 mr-2" />
            {t("staff.table.exportCSV")}
          </Button>
          <Button
            onClick={() => exportToPDF(sessions, "roomquest_verifications")}
            variant="outline"
            size="sm"
            className="glass-button"
          >
            <FileText className="w-4 h-4 mr-2" />
            {t("staff.table.exportPDF")}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {(hasSelectedRows || readySessions.length > 0) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-3 bg-white/5 border border-white/10 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
          >
            <div className="flex items-center gap-3">
              <Checkbox
                checked={selectedRows.size === readySessions.length && readySessions.length > 0}
                onCheckedChange={(checked) => handleSelectAll(checked === true)}
                className="border-white/30 data-[state=checked]:bg-primary"
              />
              <span className="text-white/80 text-sm">
                {hasSelectedRows
                  ? `${selectedRows.size} selected (${selectedReadySessions.length} ready)`
                  : `Select all ready (${readySessions.length})`}
              </span>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="glass-button"
                  disabled={readySessions.length === 0}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export TM30 (Ready only)
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="glass-dropdown">
                <DropdownMenuItem
                  onClick={() => handleBulkExport("csv")}
                  className="text-white hover:bg-white/30 focus:bg-white/30 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" /> CSV
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleBulkExport("json")}
                  className="text-white hover:bg-white/30 focus:bg-white/30 cursor-pointer"
                >
                  <FileJson className="w-4 h-4 mr-2" /> JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto ml-auto">
          <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as FilterStatus)}>
            <SelectTrigger className="glass-button w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="glass-dropdown">
              <SelectItem value="all" className="text-white hover:bg-white/30 focus:bg-white/30">{t("staff.table.showAll")}</SelectItem>
              <SelectItem value="verified" className="text-white hover:bg-white/30 focus:bg-white/30">{t("staff.table.verifiedOnly")}</SelectItem>
              <SelectItem value="failed" className="text-white hover:bg-white/30 focus:bg-white/30">{t("staff.table.failedOnly")}</SelectItem>
              <SelectItem value="pending" className="text-white hover:bg-white/30 focus:bg-white/30">{t("staff.table.pendingOnly")}</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="glass-button w-full sm:w-[180px]"
              >
                <Calendar className="w-4 h-4 mr-2" />
                {selectedDate ? format(selectedDate, "MMM dd, yyyy") : t("staff.table.pickDate")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 glass-dropdown">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="pointer-events-auto"
                classNames={{
                  months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                  month: "space-y-4",
                  caption: "flex justify-center pt-1 relative items-center text-white",
                  caption_label: "text-sm font-medium text-white",
                  nav: "space-x-1 flex items-center",
                  nav_button: "h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 text-white hover:bg-white/20 rounded-md inline-flex items-center justify-center",
                  nav_button_previous: "absolute left-1",
                  nav_button_next: "absolute right-1",
                  table: "w-full border-collapse space-y-1",
                  head_row: "flex",
                  head_cell: "text-white/60 rounded-md w-9 font-normal text-[0.8rem]",
                  row: "flex w-full mt-2",
                  cell: "h-9 w-9 text-center text-sm p-0 relative text-white",
                  day: "h-9 w-9 p-0 font-normal text-white hover:bg-white/20 rounded-md inline-flex items-center justify-center",
                  day_range_end: "day-range-end",
                  day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                  day_today: "bg-white/20 text-white",
                  day_outside: "text-white/30 opacity-50",
                  day_disabled: "text-white/30 opacity-50",
                  day_hidden: "invisible",
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-white/5">
              <TableHead className="text-white/80 w-10">
                <span className="sr-only">Select</span>
              </TableHead>
              {flowTypeFilter === "visitors" ? (
                <>
                  <TableHead className="text-white/80">{t("staff.table.visitorName")}</TableHead>
                  <TableHead className="text-white/80">{t("staff.table.visitorPhone")}</TableHead>
                  <TableHead className="text-white/80">{t("staff.table.visitorReason")}</TableHead>
                  <TableHead className="text-white/80">Access Code</TableHead>
                </>
              ) : (
                <>
                  <TableHead className="text-white/80">{t("staff.table.guestName")}</TableHead>
                  <TableHead className="text-white/80">{t("staff.table.roomNumber")}</TableHead>
                  <TableHead className="text-white/80">{t("staff.table.guests")}</TableHead>
                  <TableHead className="text-white/80">TM30</TableHead>
                </>
              )}
              <TableHead className="text-white/80">{t("staff.table.status")}</TableHead>
              <TableHead className="text-white/80">{t("staff.table.score")}</TableHead>
              <TableHead className="text-white/80">{t("staff.table.time")}</TableHead>
              <TableHead className="text-white/80">{t("staff.table.details")}</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredSessions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={flowTypeFilter === "visitors" ? 9 : 9} className="text-center text-white/60 py-8">
                  {t("staff.table.noVerifications")}
                </TableCell>
              </TableRow>
            ) : (
              filteredSessions.map((session) => {
                const id = (session as any).id;
                const isReady = tm30ReadyMap[id] || getTM30ReadyStatus((session as any).tm30).ready;
                const isVisitor = (session as any).flow_type === "visitor";

                return (
                  <AnimatePresence key={id}>
                    <TableRow className="border-white/10 hover:bg-white/5 transition-colors">
                      <TableCell>
                        <Checkbox
                          checked={selectedRows.has(id)}
                          onCheckedChange={(checked) => handleSelectRow(id, checked === true)}
                          disabled={!isReady && !isVisitor}
                          className="border-white/30 data-[state=checked]:bg-primary disabled:opacity-30"
                        />
                      </TableCell>

                      {flowTypeFilter === "visitors" ? (
                        <>
                          <TableCell className="text-white font-medium">
                            {(session as any).visitor_first_name || ""} {(session as any).visitor_last_name || ""}
                          </TableCell>
                          <TableCell className="text-white/80">
                            {(session as any).visitor_phone || "-"}
                          </TableCell>
                          <TableCell className="text-white/80 max-w-[200px] truncate">
                            {(session as any).visitor_reason || "-"}
                          </TableCell>
                          <TableCell>
                            {(session as any).visitor_access_code ? (
                              <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 font-mono">
                                {(session as any).visitor_access_code}
                              </Badge>
                            ) : (
                              <span className="text-white/40">-</span>
                            )}
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell className="text-white font-medium">
                            {(session as any).guest_name}
                            {getGuestVerificationDetails(session)}
                          </TableCell>
                          <TableCell className="text-white/80">{(session as any).room_number}</TableCell>
                          <TableCell>
                            {getGuestProgressBadge(session) || (
                              <span className="text-white/40 text-sm">1</span>
                            )}
                          </TableCell>
                          <TableCell>{getTM30StatusBadge(session)}</TableCell>
                        </>
                      )}

                      <TableCell>{getStatusBadge(session)}</TableCell>

                      <TableCell className="text-white/80">
                        {(session as any).verification_score > 0
                          ? `${(((session as any).verification_score as number) * 100).toFixed(0)}%`
                          : t("staff.table.na")}
                      </TableCell>

                      <TableCell className="text-white/80">{formatTime((session as any).created_at)}</TableCell>

                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedRow(expandedRow === id ? null : id)}
                          className="text-white/80 hover:text-white hover:bg-white/10"
                        >
                          {expandedRow === id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      </TableCell>
                    </TableRow>

                    {expandedRow === id && (
                      <TableRow className="border-white/10">
                        <TableCell colSpan={9} className="p-0">
                          <TM30DetailsDrawer session={session} onSave={handleSaveTM30} onMarkReady={handleMarkReady} />
                        </TableCell>
                      </TableRow>
                    )}
                  </AnimatePresence>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </motion.div>
  );
};

export default VerificationsTableStaff;
