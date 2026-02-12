//verify.tsx
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import WelcomeStep from "@/components/verify/WelcomeStep";
import VisitorWelcomeStep from "@/components/verify/VisitorWelcomeStep";
import DocumentStep from "@/components/verify/DocumentStep";
import SelfieStep from "@/components/verify/SelfieStep";
import ResultsStep from "@/components/verify/ResultsStep";
import VisitorResultsStep from "@/components/verify/VisitorResultsStep";
import ConsentModal from "@/components/verify/ConsentModal";
import GuestProgressIndicator from "@/components/verify/GuestProgressIndicator";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { api } from "@/lib/api";

const RETRY_DELAYS = [500, 1500, 3000];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type FlowType = "guest" | "visitor";

export type VerificationData = {
  guestName: string;
  roomNumber?: string;
  sessionToken?: string;
  verificationScore?: number;
  isVerified?: boolean;
  consentGiven?: boolean;
  consentTime?: string;
  documentImage?: string;
  selfieImage?: string;
  livenessScore?: number;
  faceMatchScore?: number;

  guestVerified?: boolean;
  expectedGuestCount?: number;
  verifiedGuestCount?: number;
  guestIndex?: number;
  requiresAdditionalGuest?: boolean;

  flowType?: FlowType;

  visitorFirstName?: string;
  visitorLastName?: string;
  visitorPhone?: string;
  visitorReason?: string;

  visitorAccessCode?: string;
  visitorAccessGrantedAt?: string;
  visitorAccessExpiresAt?: string;

  propertyExternalId?: string;
  doorKey?: string;

  physicalRoom?: string;
  roomAccessCode?: string;
};

const stepFromBackend = (step?: string) => {
  switch (step) {
    case "document":
      return 2;
    case "selfie":
      return 3;
    case "results":
      return 4;
    default:
      return 1;
  }
};

const Verify = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [showConsent, setShowConsent] = useState(false);

  const [pendingFlowType, setPendingFlowType] = useState<FlowType>("guest");

  const [data, setData] = useState<VerificationData>({
    guestName: "",
    roomNumber: "",
  });

  const hasLoadedRef = useRef(false);

  const fetchSessionWithRetry = useCallback(async (sessionToken: string, attempt = 0): Promise<boolean> => {
    console.log(`[Verify] get_session attempt ${attempt + 1} for token: ${sessionToken}`);

    try {
      const res = await api.verify({
        action: "get_session",
        session_token: sessionToken,
      } as any);

      console.log("[Verify] get_session success:", res);

      const session = res.session;

      const params = new URLSearchParams(window.location.search);
      const urlFlow = params.get("flow");
      let storedFlow: string | null = null;
      try {
        storedFlow = sessionStorage.getItem(`verify_flow_${sessionToken}`);
      } catch {
        // ignore
      }

      const flowType: FlowType =
        (session as any).flow_type === "visitor"
          ? "visitor"
          : urlFlow === "visitor"
            ? "visitor"
            : storedFlow === "visitor"
              ? "visitor"
              : "guest";

      setData({
        guestName: session.guest_name || "",
        roomNumber: session.room_number || "",
        sessionToken: session.session_token,
        consentGiven: session.consent_given,
        consentTime: session.consent_time,
        isVerified: session.is_verified,
        verificationScore: session.verification_score,
        expectedGuestCount: session.expected_guest_count,
        verifiedGuestCount: session.verified_guest_count,
        guestIndex: session.guest_index,
        requiresAdditionalGuest: session.requires_additional_guest,
        flowType,

        visitorFirstName: (session as any).visitor_first_name || (session as any).extracted_info?.visitor_first_name,
        visitorLastName: (session as any).visitor_last_name || (session as any).extracted_info?.visitor_last_name,
        visitorPhone: (session as any).visitor_phone || (session as any).extracted_info?.visitor_phone,
        visitorReason: (session as any).visitor_reason || (session as any).extracted_info?.visitor_reason,

        visitorAccessCode:
          (session as any).visitor_access_code ||
          (session as any).access_code ||
          (session as any).extracted_info?.access_code ||
          (session as any).accessCode ||
          (session as any).code ||
          undefined,
        visitorAccessGrantedAt: (session as any).visitor_access_granted_at || (session as any).extracted_info?.access_code_issued_at || undefined,
        visitorAccessExpiresAt: (session as any).visitor_access_expires_at || (session as any).extracted_info?.access_code_expires_at || undefined,

        propertyExternalId: (session as any).property_external_id || undefined,
        doorKey: (session as any).door_key || undefined,

        physicalRoom: (session as any).physical_room || undefined,
        roomAccessCode: (session as any).room_access_code || (session as any).roomAccessCode || undefined,
      });

      setPendingFlowType(flowType);

      setShowConsent(session.consent_given !== true);
      setStep(stepFromBackend(session.current_step));
      return true;
    } catch (err: any) {
      console.error(`[Verify] get_session attempt ${attempt + 1} failed:`, err?.message || err);

      if (attempt < RETRY_DELAYS.length) {
        const delay = RETRY_DELAYS[attempt];
        console.log(`[Verify] Retrying in ${delay}ms...`);
        await sleep(delay);
        return fetchSessionWithRetry(sessionToken, attempt + 1);
      }

      return false;
    }
  }, []);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const loadSession = async () => {
      if (!token || token === "new") {
        const params = new URLSearchParams(window.location.search);
        const flow = params.get("flow") === "visitor" ? "visitor" : "guest";
        console.log("[Verify] New session flow, showing consent for:", flow);
        setPendingFlowType(flow);
        setShowConsent(true);
        setIsLoading(false);
        return;
      }

      console.log("[Verify] Loading existing session:", token);

      await sleep(300);

      const success = await fetchSessionWithRetry(token);

      if (!success) {
        console.error("[Verify] All retries failed for token:", token);
        toast({
          title: "Session not found",
          description: "The session may have expired or failed to create. Please try again.",
          variant: "destructive",
        });
        navigate("/");
      }

      setIsLoading(false);
    };

    loadSession();
  }, [token, navigate, toast, fetchSessionWithRetry]);

  const updateData = (newData: Partial<VerificationData>) => {
    setData((prev) => ({ ...prev, ...newData }));
  };

  const handleConsent = (sessionToken: string, flowType?: FlowType) => {
    const finalFlow: FlowType = flowType === "visitor" ? "visitor" : "guest";

    setShowConsent(false);
    updateData({
      sessionToken,
      consentGiven: true,
      consentTime: new Date().toISOString(),
      flowType: finalFlow,
    });

    try {
      sessionStorage.setItem(`verify_flow_${sessionToken}`, finalFlow);
    } catch {
      // ignore
    }

    navigate(`/verify/${sessionToken}?flow=${finalFlow}`, { replace: true });
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-white">Loading session…</div>;
  }

  const isVisitorFlow = data.flowType === "visitor";

  return (
    <>
      {showConsent && (
        <ConsentModal
          flowType={pendingFlowType}
          existingSessionToken={token !== "new" ? token : undefined}
          onConsent={(sessionToken) => handleConsent(sessionToken, pendingFlowType)}
          onCancel={() => navigate("/")}
        />
      )}

      <div className="min-h-screen flex items-center justify-center p-4 pb-20">
        <div className="absolute top-4 right-4 z-50">
          <LanguageSwitcher />
        </div>

        <div className="w-full max-w-2xl">
          {!isVisitorFlow && <GuestProgressIndicator data={data} />}

          <AnimatePresence mode="wait">
            {step === 1 &&
              (isVisitorFlow ? (
                <VisitorWelcomeStep
                  data={data}
                  updateData={updateData}
                  onNext={() => setStep(2)}
                  onError={(e) => toast({ title: "Error", description: e.message })}
                />
              ) : (
                <WelcomeStep
                  data={data}
                  updateData={updateData}
                  onNext={() => setStep(2)}
                  onError={(e) => toast({ title: "Error", description: e.message })}
                />
              ))}

            {step === 2 && (
              <DocumentStep
                data={data}
                updateData={updateData}
                onNext={() => setStep(isVisitorFlow ? 4 : 3)}
                onBack={() => setStep(1)}
                onError={(e) => toast({ title: "Error", description: e.message })}
              />
            )}

            {step === 3 && (
              <SelfieStep
                data={data}
                updateData={updateData}
                onNext={() => setStep(4)}
                onNextGuest={() => {
                  updateData({
                    documentImage: undefined,
                    selfieImage: undefined,
                  });
                  setStep(2);
                }}
                onBack={() => setStep(2)}
                onError={(e) => toast({ title: "Error", description: e.message })}
              />
            )}

            {step === 4 &&
              (isVisitorFlow ? (
                <VisitorResultsStep data={data} onHome={() => navigate("/")} />
              ) : (
                <ResultsStep
                  data={data}
                  onRetry={() => navigate("/verify/new?flow=guest")}
                  onHome={() => navigate("/")}
                />
              ))}
          </AnimatePresence>
        </div>
      </div>

      <Footer />
    </>
  );
};

export default Verify;
