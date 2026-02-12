// ResultsStep.tsx (FIXED: shows door code + room using all backend key variants)
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Home, RotateCcw } from "lucide-react";
import { VerificationData } from "@/pages/Verify";
import confetti from "canvas-confetti";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

type Props = {
  data: VerificationData;
  onRetry: () => void;
  onHome: () => void;
};

const ResultsStep = ({ data, onRetry, onHome }: Props) => {
  const isSuccess = Boolean(data.isVerified);
  const { t } = useTranslation();

  useEffect(() => {
    if (isSuccess) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, [isSuccess]);

  // ---- FIX: accept any possible key name coming back from backend/session ----
  const anyData = data as any;

  const resolvedPhysicalRoom =
    data.physicalRoom || anyData.physical_room || anyData.roomName || anyData.room_name || null;

  const resolvedRoomAccessCode =
    data.roomAccessCode ||
    anyData.room_access_code ||
    anyData.roomAccessCode ||
    anyData.accessCode ||
    anyData.access_code ||
    anyData.doorCode ||
    anyData.door_code ||
    anyData.passcode ||
    anyData.room_key_passcode ||
    anyData.roomKeyPasscode ||
    null;

  // If they typed OTA numeric ID, keep showing the booking ref (roomNumber)
  const displayedReservationRef =
    data.roomNumber || anyData.booking_ref || anyData.bookingRef || anyData.room_number || "";

  if (isSuccess) {
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

        <h2 className="text-4xl md:text-5xl font-thin text-white mb-4">{t("results.successTitle")}</h2>

        <div className="bg-white rounded-xl p-6 mb-6 shadow-lg">
          <p className="text-gray-800 text-lg mb-1">
            <strong>{t("results.guestName")}:</strong> {data.guestName}
          </p>

          <p className="text-gray-800 text-lg mb-1">
            <strong>{t("results.roomNumber")}:</strong> {displayedReservationRef}
          </p>

          <p className="text-gray-800 text-lg">
            <strong>{t("results.physicalRoom")}:</strong> {resolvedPhysicalRoom || t("results.pendingAssignment")}
          </p>
        </div>

        {resolvedRoomAccessCode && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl p-8 mb-8 shadow-lg border-2 border-green-500/20"
          >
            <p className="text-gray-500 text-sm mb-2 uppercase tracking-wide font-bold">
              {t("visitor.accessCode", { defaultValue: "Door Access Code" })}
            </p>

            <p className="text-5xl md:text-6xl font-bold text-gray-900 tracking-widest select-all">
              {resolvedRoomAccessCode}
            </p>

            <p className="text-green-600 text-xs mt-3 font-semibold flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {t("visitor.showAtDoor", { defaultValue: "Valid for entry to the property" })}
            </p>
          </motion.div>
        )}

        <div className="glass rounded-xl p-4 mb-8">
          <p className="text-xs text-white/70 text-center leading-relaxed">{t("results.deletionNote")}</p>
        </div>

        <p className="text-2xl text-white font-bold mb-6">{t("results.checkInComplete")}</p>

        <Button onClick={onHome} variant="glass" className="w-full h-14 text-lg font-bold">
          <Home className="w-5 h-5 mr-2" />
          {t("results.backToHome")}
        </Button>
      </motion.div>
    );
  }

  const score = Number(data.verificationScore || 0);

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
        <XCircle className="w-24 h-24 text-red-400 mx-auto mb-6" />
      </motion.div>

      <h2 className="text-4xl md:text-5xl font-thin text-white mb-4">{t("results.failureTitle")}</h2>

      <div className="glass rounded-2xl p-6 mb-6">
        <div className="text-6xl font-bold text-red-400 mb-2">{(score * 100).toFixed(2)}%</div>
        <div className="text-white/80 text-lg">{t("results.verificationScore")}</div>
      </div>

      <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-6 mb-6">
        <p className="text-white text-lg mb-2">{t("results.whyFailed")}</p>
        <p className="text-white/80 text-left mt-2">{t("results.failureReasons")}</p>
      </div>

      <div className="glass rounded-xl p-4 mb-8">
        <p className="text-xs text-white/70 text-center leading-relaxed">{t("results.deletionNote")}</p>
      </div>

      <div className="flex gap-4">
        <Button onClick={onRetry} variant="glass" className="flex-1 h-14 text-lg font-bold">
          <RotateCcw className="w-5 h-5 mr-2" />
          {t("results.tryAgain")}
        </Button>
        <Button onClick={onHome} variant="glass" className="flex-1 h-14 text-lg font-bold">
          <Home className="w-5 h-5 mr-2" />
          {t("results.home")}
        </Button>
      </div>
    </motion.div>
  );
};

export default ResultsStep;
