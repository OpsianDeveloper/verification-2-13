import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Home, Clock } from "lucide-react";
import { VerificationData } from "@/pages/Verify";
import confetti from "canvas-confetti";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";

type Props = {
  data: VerificationData;
  onHome: () => void;
};

function formatTimeHHMM(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  // show local device time; stored times are ISO UTC but Date() will render in device local
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function minutesRemaining(expiresIso?: string | null) {
  if (!expiresIso) return null;
  const exp = new Date(expiresIso);
  if (Number.isNaN(exp.getTime())) return null;
  const diffMs = exp.getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / 60000));
}

const VisitorResultsStep = ({ data, onHome }: Props) => {
  const { t } = useTranslation();

  useEffect(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  }, []);

  const accessCode = useMemo(() => {
    console.log("[VisitorResults] Full data object:", data);
    console.log("[VisitorResults] visitorAccessCode:", data.visitorAccessCode);

    const raw = (data.visitorAccessCode || "").toString().trim();
    if (!raw.length) {
      console.warn("[VisitorResults v1.1] No access code available in data. Raw:", data);
      return "PENDING";
    }
    return raw;
  }, [data, data.visitorAccessCode]);

  const grantedAtLabel = useMemo(() => formatTimeHHMM((data as any)?.visitorAccessGrantedAt), [data]);

  const expiresAtLabel = useMemo(() => formatTimeHHMM((data as any)?.visitorAccessExpiresAt), [data]);

  const remainingMins = useMemo(() => minutesRemaining((data as any)?.visitorAccessExpiresAt), [data]);

  const windowLine = useMemo(() => {
    if (grantedAtLabel && expiresAtLabel) return `${grantedAtLabel} – ${expiresAtLabel}`;
    if (expiresAtLabel) return `${t("visitor.expiresAt", { defaultValue: "Expires at" })} ${expiresAtLabel}`;
    return null;
  }, [grantedAtLabel, expiresAtLabel, t]);

  const remainingLine = useMemo(() => {
    if (remainingMins === null) return null;
    // Simple, no extra i18n keys required
    return remainingMins === 1 ? "1 minute remaining" : `${remainingMins} minutes remaining`;
  }, [remainingMins]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="glass rounded-3xl p-8 md:p-12 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
      >
        <CheckCircle2 className="w-24 h-24 text-green-400 mx-auto mb-6" />
      </motion.div>

      <h2 className="text-4xl md:text-5xl font-thin text-white mb-4">{t("visitor.accessGranted")}</h2>

      {/* Time limit indicator */}
      <div className="flex flex-col items-center justify-center gap-2 mb-8">
        <div className="flex items-center justify-center gap-2">
          <Clock className="w-5 h-5 text-white/70" />
          <p className="text-xl text-white/80">{t("visitor.validFor30Minutes")}</p>
        </div>

        {windowLine ? <p className="text-sm text-white/70">{windowLine}</p> : null}

        {remainingLine ? <p className="text-sm text-white/70">{remainingLine}</p> : null}
      </div>

      {/* Large access code display */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-2xl p-8 mb-8 shadow-lg border-2 border-green-500/20"
      >
        <p className="text-gray-500 text-sm mb-2 uppercase tracking-wide font-bold">{t("visitor.accessCode")}</p>

        <p className="text-6xl md:text-7xl font-bold text-gray-900 tracking-widest select-all">{accessCode}</p>

        <p className="text-green-600 text-xs mt-3 font-semibold flex items-center justify-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          {t("visitor.showAtDoor", { defaultValue: "Valid for entry to the property" })}
        </p>
      </motion.div>

      {/* Visitor summary */}
      <div className="glass rounded-xl p-5 mb-8 text-left">
        <h3 className="text-white/60 text-sm uppercase tracking-wide mb-3">{t("visitor.visitorDetails")}</h3>
        <div className="space-y-2">
          <p className="text-white text-lg">
            <span className="text-white/60">{t("visitor.name")}:</span> {data.visitorFirstName} {data.visitorLastName}
          </p>
          <p className="text-white text-lg">
            <span className="text-white/60">{t("visitor.phone")}:</span> {data.visitorPhone}
          </p>
          <p className="text-white text-lg">
            <span className="text-white/60">{t("visitor.purpose")}:</span> {data.visitorReason}
          </p>

        </div>
      </div>

      {/* Data deletion note */}
      <div className="glass rounded-xl p-4 mb-8">
        <p className="text-xs text-white/70 text-center leading-relaxed">{t("results.deletionNote")}</p>
      </div>

      <Button onClick={onHome} variant="glass" className="w-full h-14 text-lg font-bold">
        <Home className="w-5 h-5 mr-2" />
        {t("results.backToHome")}
      </Button>
    </motion.div>
  );
};

export default VisitorResultsStep;
