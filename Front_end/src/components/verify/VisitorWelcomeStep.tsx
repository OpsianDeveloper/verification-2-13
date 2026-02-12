import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { VerificationData } from "@/pages/Verify";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { z } from "zod";

type Props = {
  data: VerificationData;
  updateData: (data: Partial<VerificationData>) => void;
  onNext: () => void;
  onError: (error: Error) => void;
};

// Zod schema for visitor form validation
const visitorSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(50, "First name must be less than 50 characters"),
  lastName: z
    .string()
    .trim()
    .min(1, "Last name is required")
    .max(50, "Last name must be less than 50 characters"),
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .max(20, "Phone number must be less than 20 characters")
    .regex(/^[+]?[\d\s\-()]+$/, "Please enter a valid phone number"),
  reason: z
    .string()
    .trim()
    .min(1, "Reason for visit is required")
    .max(500, "Reason must be less than 500 characters"),
});

const VisitorWelcomeStep = ({ data, updateData, onNext, onError }: Props) => {
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslation();

  const [firstName, setFirstName] = useState(data.visitorFirstName || "");
  const [lastName, setLastName] = useState(data.visitorLastName || "");
  const [phone, setPhone] = useState(data.visitorPhone || "");
  const [reason, setReason] = useState(data.visitorReason || "");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    // Validate with zod
    const result = visitorSchema.safeParse({ firstName, lastName, phone, reason });

    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as string;
        errors[field] = err.message;
      });
      setFieldErrors(errors);

      toast({
        title: t("common.error"),
        description: Object.values(errors)[0],
        variant: "destructive",
      });
      return;
    }

    // Must have token (created during consent/start)
    if (!data.sessionToken) {
      toast({
        title: "Session error",
        description: "No session token found. Please restart.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      await api.verify({
        action: "update_guest",
        session_token: data.sessionToken,
        guest_name: `${result.data.firstName} ${result.data.lastName}`.trim(),
        room_number: "VISITOR",
        flow_type: "visitor",
        visitor_first_name: result.data.firstName,
        visitor_last_name: result.data.lastName,
        visitor_phone: result.data.phone,
        visitor_reason: result.data.reason,
      });

      // Update local state
      updateData({
        visitorFirstName: result.data.firstName,
        visitorLastName: result.data.lastName,
        visitorPhone: result.data.phone,
        visitorReason: result.data.reason,
      });

      // Move forward
      onNext();
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to save visitor info");

      console.error("[VisitorWelcomeStep] update_guest failed:", error);

      toast({
        title: t("common.error"),
        description: "Could not save your details. Please check your connection and try again.",
        variant: "destructive",
      });

      onError(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="glass rounded-3xl p-8 md:p-12"
    >
      <h2 className="text-3xl md:text-4xl font-thin text-white mb-4 text-center">
        {t("visitor.welcomeTitle")}
      </h2>
      <p className="text-white/80 text-center mb-8">{t("visitor.welcomeSubtitle")}</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName" className="text-white text-lg">
              {t("visitor.firstName")}
            </Label>
            <Input
              id="firstName"
              type="text"
              placeholder={t("visitor.firstNamePlaceholder")}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={`h-14 text-lg bg-white/10 border-white/20 text-white placeholder:text-white/50 ${
                fieldErrors.firstName ? "border-red-400" : ""
              }`}
              required
              disabled={isLoading}
            />
            {fieldErrors.firstName && (
              <p className="text-red-400 text-sm">{fieldErrors.firstName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName" className="text-white text-lg">
              {t("visitor.lastName")}
            </Label>
            <Input
              id="lastName"
              type="text"
              placeholder={t("visitor.lastNamePlaceholder")}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={`h-14 text-lg bg-white/10 border-white/20 text-white placeholder:text-white/50 ${
                fieldErrors.lastName ? "border-red-400" : ""
              }`}
              required
              disabled={isLoading}
            />
            {fieldErrors.lastName && (
              <p className="text-red-400 text-sm">{fieldErrors.lastName}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone" className="text-white text-lg">
            {t("visitor.phoneNumber")}
          </Label>
          <Input
            id="phone"
            type="tel"
            placeholder={t("visitor.phonePlaceholder")}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={`h-14 text-lg bg-white/10 border-white/20 text-white placeholder:text-white/50 ${
              fieldErrors.phone ? "border-red-400" : ""
            }`}
            required
            disabled={isLoading}
          />
          {fieldErrors.phone && (
            <p className="text-red-400 text-sm">{fieldErrors.phone}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="reason" className="text-white text-lg">
            {t("visitor.reason")}
          </Label>
          <Textarea
            id="reason"
            placeholder={t("visitor.reasonPlaceholder")}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={`min-h-[100px] text-lg bg-white/10 border-white/20 text-white placeholder:text-white/50 resize-none ${
              fieldErrors.reason ? "border-red-400" : ""
            }`}
            required
            disabled={isLoading}
          />
          {fieldErrors.reason && (
            <p className="text-red-400 text-sm">{fieldErrors.reason}</p>
          )}
        </div>

        <Button type="submit" disabled={isLoading} variant="glass" className="w-full h-14 text-lg font-bold">
          {isLoading ? t("welcome.starting") : t("welcome.startVerification")}
        </Button>
      </form>
    </motion.div>
  );
};

export default VisitorWelcomeStep;
