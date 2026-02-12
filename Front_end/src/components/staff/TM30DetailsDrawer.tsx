import { useState } from "react";
import { motion } from "framer-motion";
import {
  Copy,
  Check,
  Eye,
  EyeOff,
  Download,
  ChevronDown,
  AlertTriangle,
  FileJson,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { ExtendedSessionRow, TM30Data, getTM30ReadyStatus, getConfidenceLevel, ConfidenceLevel } from "@/types/tm30";
import { exportSingleTM30 } from "@/lib/tm30ExportUtils";

interface TM30DetailsDrawerProps {
  session: ExtendedSessionRow;
  onSave: (sessionId: string, tm30Data: TM30Data) => void;
  onMarkReady: (sessionId: string) => void;
}

const TM30DetailsDrawer = ({ session, onSave, onMarkReady }: TM30DetailsDrawerProps) => {
  const { toast } = useToast();
  const [showMrz, setShowMrz] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmExtracted, setConfirmExtracted] = useState(false);

  // TM30 form state
  const [formData, setFormData] = useState<TM30Data>({
    nationality: session.tm30?.nationality || null,
    sex: session.tm30?.sex || null,
    arrival_date_time: session.tm30?.arrival_date_time || session.reservation?.check_in_time || null,
    departure_date: session.tm30?.departure_date || session.reservation?.check_out_date || null,
    property: session.tm30?.property || session.reservation?.property_name || null,
    room_number: session.tm30?.room_number || session.room_number || null,
    notes: session.tm30?.notes || null,
  });

  const [originalData] = useState<TM30Data>(formData);

  const extracted = session.extracted_info || {};
  const { ready, missingFields } = getTM30ReadyStatus(formData);

  // Confidence checks
  const nameConfidence = getConfidenceLevel(extracted.name_confidence);
  const passportConfidence = getConfidenceLevel(extracted.passport_confidence);
  const hasLowConfidence = nameConfidence === "low" || passportConfidence === "low";
  const hasAnyConfidence = nameConfidence !== null || passportConfidence !== null;

  const canMarkReady = ready && (!hasLowConfidence || confirmExtracted);

  const handleCopyMrz = async () => {
    if (extracted.mrz_code) {
      await navigator.clipboard.writeText(extracted.mrz_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    // TODO: Replace with actual API call
    await new Promise((resolve) => setTimeout(resolve, 500));
    onSave(session.id, formData);
    setSaving(false);
    toast({ title: "Saved", description: "TM30 data has been saved." });
  };

  const handleMarkReady = () => {
    onMarkReady(session.id);
    toast({ title: "TM30 Ready", description: "Record marked as TM30 Ready." });
  };

  const handleCancel = () => {
    setFormData(originalData);
  };

  const handleExport = (format: "csv" | "json" | "pdf") => {
    if (format === "pdf") {
      toast({
        title: "PDF Export",
        description: "PDF export will be enabled once server endpoint is connected.",
        variant: "default",
      });
      return;
    }
    exportSingleTM30(session, format);
    toast({ title: "Exported", description: `TM30 data exported as ${format.toUpperCase()}.` });
  };

  const renderExtractedField = (label: string, value: string | null | undefined) => {
    const isEmpty = !value;
    return (
      <div className="space-y-1">
        <Label className={`text-xs ${isEmpty ? "text-amber-400" : "text-gray-500"}`}>
          {label} {isEmpty && <span className="text-amber-400">⚠</span>}
        </Label>
        <div className="bg-gray-50 rounded-lg px-3 py-2 text-gray-900 text-sm border border-gray-200">
          {value || "—"}
        </div>
      </div>
    );
  };

  const renderConfidenceBadge = (level: ConfidenceLevel | null, label: string) => {
    if (!level) return null;
    const colors = {
      high: "bg-green-500/20 text-green-700 border-green-500/30",
      medium: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30",
      low: "bg-red-500/20 text-red-700 border-red-500/30",
    };
    return (
      <div className="flex items-center gap-2">
        <span className="text-gray-500 text-xs">{label}:</span>
        <Badge className={colors[level]} variant="outline">
          {level.charAt(0).toUpperCase() + level.slice(1)}
        </Badge>
      </div>
    );
  };

  const renderRequiredInput = (
    label: string,
    field: keyof TM30Data,
    type: "text" | "date" | "datetime-local" = "text",
    placeholder?: string,
  ) => {
    const isMissing = missingFields.includes(field);
    const value = formData[field] || "";

    return (
      <div className="space-y-1">
        <Label className={`text-xs ${isMissing ? "text-red-400" : "text-gray-500"}`}>
          {label} <span className="text-red-400">*</span>
        </Label>
        <Input
          type={type}
          value={value as string}
          onChange={(e) => setFormData((prev) => ({ ...prev, [field]: e.target.value || null }))}
          placeholder={placeholder}
          className={`bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400 ${
            isMissing ? "border-red-500/50 ring-1 ring-red-500/30" : ""
          }`}
        />
        {isMissing && <p className="text-red-400 text-xs">Required</p>}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="overflow-hidden"
    >
      <div className="p-6 bg-white border-t border-gray-200 shadow-lg rounded-b-lg">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-medium text-gray-900">TM30 Details</h3>
            <Badge
              className={
                ready
                  ? "bg-green-500/20 text-green-300 border-green-500/30"
                  : "bg-amber-500/20 text-amber-300 border-amber-500/30"
              }
            >
              {ready ? (
                <>
                  <CheckCircle2 className="w-3 h-3 mr-1" /> TM30 Ready
                </>
              ) : (
                <>TM30 Missing Fields ({missingFields.length})</>
              )}
            </Badge>
          </div>

          {/* Export dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="border-gray-300 text-gray-700 hover:bg-gray-100">
                <Download className="w-4 h-4 mr-2" />
                Export TM30
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-white border-gray-200">
              <DropdownMenuItem
                onClick={() => handleExport("csv")}
                className="text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" /> CSV
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleExport("json")}
                className="text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                <FileJson className="w-4 h-4 mr-2" /> JSON
              </DropdownMenuItem>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuItem
                      onClick={() => handleExport("pdf")}
                      className="text-gray-400 cursor-not-allowed"
                      disabled
                    >
                      <FileText className="w-4 h-4 mr-2" /> PDF
                    </DropdownMenuItem>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>PDF export will be enabled once server endpoint is connected</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Missing fields summary */}
        {!ready && (
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <p className="text-amber-300 text-sm">
              <AlertTriangle className="w-4 h-4 inline mr-2" />
              Missing: {missingFields.map((f) => f.replace(/_/g, " ")).join(", ")}
            </p>
          </div>
        )}

        {/* Confidence warning */}
        {hasLowConfidence && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-600 text-sm mb-2">
              <AlertTriangle className="w-4 h-4 inline mr-2" />
              Low confidence detected. Please confirm extracted values before marking TM30 Ready.
            </p>
            <label className="flex items-center gap-2 text-gray-700 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={confirmExtracted}
                onChange={(e) => setConfirmExtracted(e.target.checked)}
                className="rounded border-gray-300"
              />
              Confirm extracted fields are correct
            </label>
          </div>
        )}

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* SECTION A: Extracted (Read-Only) */}
          <div className="space-y-4">
            <h4 className="text-gray-700 font-medium text-sm uppercase tracking-wide border-b border-gray-200 pb-2">
              Extracted (Read-Only)
            </h4>

            {/* Confidence panel */}
            {hasAnyConfidence && (
              <div className="bg-gray-50 rounded-lg p-3 space-y-2 border border-gray-200">
                <p className="text-gray-500 text-xs uppercase tracking-wide mb-2">Confidence</p>
                <div className="flex flex-wrap gap-3">
                  {renderConfidenceBadge(nameConfidence, "Name")}
                  {renderConfidenceBadge(passportConfidence, "Passport")}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {renderExtractedField("First Name", extracted.first_name)}
              {renderExtractedField("Middle Name", extracted.middle_name)}
              {renderExtractedField("Last Name", extracted.last_name)}
              {renderExtractedField("Document Number", extracted.document_number)}
              {renderExtractedField("Date of Birth", extracted.date_of_birth)}
              {renderExtractedField("Date of Issue", extracted.date_of_issue)}
              {renderExtractedField("Expiration Date", extracted.expiration_date)}
            </div>

            {/* MRZ Code */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-gray-500">MRZ Code</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMrz(!showMrz)}
                  className="text-gray-500 hover:text-gray-700 h-6 px-2"
                >
                  {showMrz ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                  {showMrz ? "Hide" : "Show"}
                </Button>
              </div>
              {showMrz && extracted.mrz_code && (
                <div className="relative">
                  <pre className="bg-gray-900 rounded-lg p-3 text-green-400 text-xs font-mono overflow-x-auto border border-gray-700">
                    {extracted.mrz_code}
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyMrz}
                    className="absolute top-2 right-2 h-6 px-2 text-gray-400 hover:text-white"
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </Button>
                </div>
              )}
              {showMrz && !extracted.mrz_code && (
                <div className="bg-gray-50 rounded-lg px-3 py-2 text-gray-400 text-sm border border-gray-200">
                  No MRZ data available
                </div>
              )}
            </div>
          </div>

          {/* SECTION B: TM30 Required (Editable) */}
          <div className="space-y-4">
            <h4 className="text-gray-700 font-medium text-sm uppercase tracking-wide border-b border-gray-200 pb-2">
              TM30 Required (Editable)
            </h4>

            <div className="space-y-4">
              {/* Nationality (simple text input) */}
              <div className="space-y-1">
                <Label
                  className={`text-xs ${missingFields.includes("nationality") ? "text-red-400" : "text-gray-500"}`}
                >
                  Nationality <span className="text-red-400">*</span>
                </Label>

                <Input
                  value={formData.nationality || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, nationality: e.target.value || null }))}
                  placeholder="e.g. USA"
                  className={`bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400 ${
                    missingFields.includes("nationality") ? "border-red-500/50 ring-1 ring-red-500/30" : ""
                  }`}
                />

                {missingFields.includes("nationality") && <p className="text-red-400 text-xs">Required</p>}
              </div>

              {/* Sex */}
              <div className="space-y-1">
                <Label className={`text-xs ${missingFields.includes("sex") ? "text-red-400" : "text-gray-500"}`}>
                  Sex <span className="text-red-400">*</span>
                </Label>
                <div className="flex gap-2">
                  {(["M", "F", "X"] as const).map((option) => (
                    <Button
                      key={option}
                      variant={formData.sex === option ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFormData((prev) => ({ ...prev, sex: option }))}
                      className={
                        formData.sex === option
                          ? "gradient-button text-white"
                          : `border-gray-300 text-gray-700 hover:bg-gray-100 ${
                              missingFields.includes("sex") ? "border-red-500/50" : ""
                            }`
                      }
                    >
                      {option}
                    </Button>
                  ))}
                </div>
                {missingFields.includes("sex") && <p className="text-red-400 text-xs">Required</p>}
              </div>

              {renderRequiredInput("Arrival Date/Time", "arrival_date_time", "datetime-local")}

              {/* Property */}
              <div className="space-y-1">
                <Label className={`text-xs ${missingFields.includes("property") ? "text-red-400" : "text-gray-500"}`}>
                  Property <span className="text-red-400">*</span>
                </Label>
                <Input
                  value={formData.property || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, property: e.target.value || null }))}
                  placeholder="Property name"
                  className={`bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400 ${
                    missingFields.includes("property") ? "border-red-500/50 ring-1 ring-red-500/30" : ""
                  }`}
                />
                {missingFields.includes("property") && <p className="text-red-400 text-xs">Required</p>}
              </div>

              {renderRequiredInput("Reservation Number", "room_number", "text", "e.g. S923485")}

              {/* Notes */}
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">
                  Notes / Exception Reason{" "}
                  {!ready && <span className="text-amber-400">(required if TM30 incomplete)</span>}
                </Label>
                <Textarea
                  value={formData.notes || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value || null }))}
                  placeholder="Add notes or explain why TM30 is incomplete..."
                  className="bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400 min-h-[80px]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={handleCancel} className="border-gray-300 text-gray-700 hover:bg-gray-100">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gradient-button text-white">
            {saving ? "Saving..." : "Save TM30"}
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    onClick={handleMarkReady}
                    disabled={!canMarkReady}
                    variant="outline"
                    className={
                      canMarkReady
                        ? "bg-green-600 hover:bg-green-700 text-white border-green-500"
                        : "border-gray-300 text-gray-400 cursor-not-allowed"
                    }
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Mark TM30 Ready
                  </Button>
                </span>
              </TooltipTrigger>
              {!canMarkReady && (
                <TooltipContent>
                  <p>{!ready ? `Missing: ${missingFields.join(", ")}` : "Please confirm extracted fields first"}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </motion.div>
  );
};

export default TM30DetailsDrawer;
