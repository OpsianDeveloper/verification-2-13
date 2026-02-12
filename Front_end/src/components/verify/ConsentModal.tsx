import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";

interface ConsentModalProps {
  flowType?: "guest" | "visitor";
  existingSessionToken?: string;
  onConsent: (sessionToken: string) => void;
  onCancel: () => void;
}

const RETRY_DELAYS = [1000, 3000, 5000];

const ConsentModal = ({ flowType = "guest", existingSessionToken, onConsent, onCancel }: ConsentModalProps) => {
  const [isChecked, setIsChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const retryAbortRef = useRef(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const logConsentWithRetry = async (sessionToken: string, attempt = 0): Promise<void> => {
    if (retryAbortRef.current) return;

    try {
      await api.verify({
        action: "log_consent",
        session_token: sessionToken,
        consent_given: true,
        consent_time: new Date().toISOString(),
        consent_locale: "en-th",
      });
      console.log("[Consent] logged successfully");
    } catch {
      if (attempt < RETRY_DELAYS.length - 1) {
        const delay = RETRY_DELAYS[attempt];
        setTimeout(() => {
          logConsentWithRetry(sessionToken, attempt + 1);
        }, delay);
      }
    }
  };

  const handleConsent = async () => {
    if (!isChecked) return;

    setIsLoading(true);
    retryAbortRef.current = false;

    try {
      let sessionToken: string;

      // If we have an existing session token, reuse it instead of creating new
      if (existingSessionToken) {
        console.log("[Consent] Using existing session:", existingSessionToken);
        sessionToken = existingSessionToken;
      } else {
        // STEP 1 — create session (MUST succeed)
        console.log("[Consent] Starting NEW session with flowType:", flowType);
        const startRes = await api.verify({ action: "start", flow_type: flowType });
        console.log("[Consent] start response:", startRes);

        sessionToken = startRes.session_token;

        if (!sessionToken) {
          console.error("[Consent] No session token in response:", startRes);
          throw new Error("No session token returned from server");
        }

        console.log("[Consent] Session created successfully:", sessionToken, "flowType:", flowType);
      }

      // STEP 2 — log consent and wait for it (blocking to ensure DB sync)
      try {
        console.log("[Consent] Logging consent for session:", sessionToken);
        await api.verify({
          action: "log_consent",
          session_token: sessionToken,
          consent_given: true,
          consent_time: new Date().toISOString(),
          consent_locale: "en-th",
        });
        console.log("[Consent] Consent logged successfully");
      } catch (consentErr) {
        console.warn("[Consent] log_consent failed, will retry in background:", consentErr);
        // Non-blocking retry
        logConsentWithRetry(sessionToken);
      }

      // STEP 3 — Small delay to ensure DB write is propagated
      console.log("[Consent] Waiting 500ms for DB sync...");
      await new Promise((resolve) => setTimeout(resolve, 500));

      // STEP 4 — hand token upward (routing handled by Verify.tsx)
      console.log("[Consent] Passing session token to parent:", sessionToken);
      onConsent(sessionToken);
    } catch (err: any) {
      console.error("[Consent] failed to start session:", err);
      toast({
        title: "Error",
        description: err?.message || "Failed to start verification. Please check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass rounded-3xl p-6 md:p-8 max-w-3xl w-full my-8 flex flex-col max-h-[90vh]"
      >
        <h2 className="text-2xl md:text-3xl font-thin text-white mb-6 text-center">{t("consent.title")}</h2>

        <ScrollArea className="flex-1 mb-6 -mr-4 pr-6">
          <div className="space-y-4 text-white/90 text-sm md:text-base pr-2">
            <p>{t("consent.intro")}</p>
            <p className="font-semibold">{t("consent.dataCollection")}</p>
            <ul className="list-disc list-inside ml-4">
              <li>{t("consent.item1")}</li>
              <li>{t("consent.item2")}</li>
              <li>{t("consent.item3")}</li>
            </ul>
            <p className="font-semibold">{t("consent.purpose")}</p>
            <p>{t("consent.purposeText")}</p>
            <p className="font-semibold">{t("consent.storage")}</p>
            <p>{t("consent.storageText")}</p>
            <p className="font-semibold">{t("consent.rights")}</p>
            <p>{t("consent.rightsText")}</p>

            <div className="pt-4 border-t border-white/20">
              <h4 className="font-semibold">{t("consent.thaiTitle")}</h4>
              <p>{t("consent.thaiText")}</p>
            </div>
          </div>
        </ScrollArea>

        <div className="flex items-start space-x-3 mb-6 p-4 glass rounded-xl">
          <Checkbox id="consent" checked={isChecked} onCheckedChange={(v) => setIsChecked(v === true)} />
          <label htmlFor="consent" className="text-sm text-white cursor-pointer">
            {t("consent.agreement")}
          </label>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <Button onClick={handleConsent} disabled={!isChecked || isLoading} className="w-full h-14 text-lg">
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                {t("common.loading")}
              </>
            ) : (
              t("consent.continue")
            )}
          </Button>

          <Button
            variant="ghost"
            onClick={onCancel}
            disabled={isLoading}
            className="w-full h-14 text-lg text-white hover:bg-white/10"
          >
            {t("consent.cancel")}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default ConsentModal;
