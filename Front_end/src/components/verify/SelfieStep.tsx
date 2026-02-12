import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { VerificationData } from "@/pages/Verify";
import CameraCapture from "@/components/CameraCapture";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { optimizeImageWithGuardrails } from "@/lib/image";

type Props = {
  data: VerificationData;
  updateData: (data: Partial<VerificationData>) => void;
  onNext: () => void;
  onNextGuest: () => void;
  onBack: () => void;
  onError: (error: Error) => void;
};

// Helper to parse boolean from various formats
const parseBool = (val: unknown): boolean => {
  if (typeof val === "boolean") return val;
  if (val === "true" || val === 1) return true;
  return false;
};

// Helper to parse number from various formats
const parseNum = (val: unknown): number | undefined => {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const n = parseInt(val, 10);
    return isNaN(n) ? undefined : n;
  }
  return undefined;
};

const SelfieStep = ({ data, updateData, onNext, onNextGuest, onBack, onError }: Props) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const { t } = useTranslation();

  const handleCapture = (imageData: string) => {
    console.log("[Selfie] Image captured");
    setCapturedImage(imageData);
  };

  const handleRetake = () => {
    console.log("[Selfie] Retaking photo");
    setCapturedImage(null);
  };

  const handleConfirmUpload = async () => {
    if (!capturedImage) return;

    if (!data.sessionToken) {
      onError(new Error("No session token found"));
      return;
    }

    setIsProcessing(true);
    console.log("[Selfie] Starting verification process...");

    try {
      // Optimize image before upload
      const optimizeResult = await optimizeImageWithGuardrails(capturedImage);

      if (!optimizeResult.success) {
        const errorResult = optimizeResult as { success: false; errorMessage: string };
        toast({
          title: "Image too large",
          description: errorResult.errorMessage,
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      console.log(`[Selfie] Optimized size: ${Math.round(optimizeResult.sizeBytes / 1024)}KB`);

      // Strip the data URI prefix to get clean base64
      const cleanBase64 = optimizeResult.dataUrl.replace(
        /^data:image\/\w+;base64,/,
        ""
      );

      console.log("[Selfie] Sending verification request...");

      const verifyPayload = {
        action: "verify_face" as const,
        session_token: data.sessionToken,
        selfie_data: cleanBase64,
        image_data: cleanBase64,
        ...(typeof data.guestIndex === "number" ? { guest_index: data.guestIndex } : {}),
      };

      const response = await api.verify(verifyPayload);

      console.log("[Selfie] Raw verify_face response:", JSON.stringify(response, null, 2));

      // Extract from response OR response.data (resilient parsing)
      const responseData = response.data || {};

      // Parse scores defensively from flat fields or nested data
      const livenessScore = responseData.liveness_score ?? response.liveness_score;
      const faceMatchScore = responseData.face_match_score ?? response.face_match_score;
      const verificationScore = responseData.verification_score ?? response.verification_score;
      const isVerified = parseBool(responseData.is_verified ?? response.is_verified);

      // Parse multi-guest fields from BOTH locations with type coercion
      const guestVerifiedRaw = responseData.guest_verified ?? response.guest_verified;
      // IMPORTANT: guest_verified may not exist yet - fallback to is_verified
      const guestVerified = guestVerifiedRaw !== undefined 
        ? parseBool(guestVerifiedRaw) 
        : isVerified;
      
      const requiresAdditionalGuestRaw = responseData.requires_additional_guest ?? response.requires_additional_guest;
      const verifiedGuestCountRaw = responseData.verified_guest_count ?? response.verified_guest_count;
      const expectedGuestCountRaw = responseData.expected_guest_count ?? response.expected_guest_count;
      const guestIndexRaw = responseData.guest_index ?? response.guest_index;

      console.log("[Selfie] guest_verified resolution:", {
        rawValue: guestVerifiedRaw,
        fallbackUsed: guestVerifiedRaw === undefined,
        finalValue: guestVerified,
        isVerified,
      });

      console.log("[Selfie] Parsed from verify_face:", {
        guestVerified,
        requiresAdditionalGuestRaw,
        verifiedGuestCountRaw,
        expectedGuestCountRaw,
        guestIndexRaw,
      });

      // IMPORTANT: If guest_verified is false, do NOT advance - allow retake immediately
      if (!guestVerified) {
        console.log("[Selfie] Guest verification FAILED, allowing retake");
        toast({
          title: t('selfie.verificationFailed'),
          description: t('selfie.retakeSelfie'),
          variant: "destructive",
        });
        setCapturedImage(null); // Clear for retake
        setIsProcessing(false);
        return; // EXIT - do NOT update state or advance
      }

      // Guest verified! Now refresh session to get authoritative state
      console.log("[Selfie] Guest verified, fetching authoritative session state...");
      const sessionRes = await api.verify({
        action: "get_session",
        session_token: data.sessionToken,
      });

      console.log("[Selfie] Raw get_session response:", JSON.stringify(sessionRes, null, 2));

      const session = sessionRes.session;

      // Extract visitor access code from response (for visitor flow)
      const visitorAccessCode = (response as any).access_code || 
                                (responseData as any).access_code ||
                                (session as any)?.visitor_access_code;

      if (!session) {
        console.error("[Selfie] No session in get_session response");
        // Fallback: use verify_face response values
        const fallbackRequiresAdditional = parseBool(requiresAdditionalGuestRaw);
        const fallbackVerifiedCount = parseNum(verifiedGuestCountRaw) ?? 1;
        const fallbackExpectedCount = parseNum(expectedGuestCountRaw) ?? 1;

        updateData({
          selfieImage: optimizeResult.dataUrl,
          livenessScore,
          faceMatchScore,
          verificationScore,
          isVerified,
          guestVerified: true,
          requiresAdditionalGuest: fallbackRequiresAdditional,
          verifiedGuestCount: fallbackVerifiedCount,
          expectedGuestCount: fallbackExpectedCount,
          visitorAccessCode,
        });

        if (fallbackRequiresAdditional) {
          toast({
            title: t('selfie.guestVerified', {
              verified: fallbackVerifiedCount,
              next: fallbackVerifiedCount + 1,
            }),
          });
          onNextGuest();
        } else {
          toast({ title: t('selfie.identityVerified') });
          onNext();
        }
        return;
      }

      // Parse authoritative multi-guest fields from session
      const authRequiresAdditionalGuest = parseBool(session.requires_additional_guest);
      const authVerifiedGuestCount = parseNum(session.verified_guest_count) ?? 0;
      const authExpectedGuestCount = parseNum(session.expected_guest_count) ?? 1;
      const authGuestIndex = parseNum(session.guest_index);

      console.log("[Selfie] Authoritative session state:", {
        authRequiresAdditionalGuest,
        authVerifiedGuestCount,
        authExpectedGuestCount,
        authGuestIndex,
        currentStep: session.current_step,
      });

      // Extract Cloudbeds integration fields
      const physicalRoom = 
        (response as any).physical_room || 
        (responseData as any).physical_room ||
        (session as any)?.physical_room;
      
      const roomAccessCode = 
        (response as any).room_access_code || 
        (responseData as any).room_access_code ||
        (session as any)?.room_access_code;

      // Update state with verified data (including visitor access code and Cloudbeds fields)
      updateData({
        selfieImage: optimizeResult.dataUrl,
        livenessScore,
        faceMatchScore,
        verificationScore,
        isVerified,
        guestVerified: true,
        requiresAdditionalGuest: authRequiresAdditionalGuest,
        verifiedGuestCount: authVerifiedGuestCount,
        expectedGuestCount: authExpectedGuestCount,
        guestIndex: authGuestIndex,
        visitorAccessCode: visitorAccessCode || (session as any).visitor_access_code,
        physicalRoom,
        roomAccessCode,
      });

      // ROUTING based on authoritative session state
      if (authRequiresAdditionalGuest) {
        // More guests needed - loop back to document step
        console.log("[Selfie] Additional guest required, looping to document step");
        toast({
          title: t('selfie.guestVerified', {
            verified: authVerifiedGuestCount,
            next: authVerifiedGuestCount + 1,
          }),
        });
        onNextGuest();
      } else {
        // All guests verified - go to results
        console.log("[Selfie] All guests verified, proceeding to results");
        toast({ title: t('selfie.identityVerified') });
        onNext();
      }
    } catch (error) {
      console.error("[Selfie] Verification error:", error);
      toast({
        title: "Failed to verify identity",
        description: (error as Error).message,
        variant: "destructive",
      });
      onError(error as Error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="glass rounded-3xl p-8 md:p-12"
    >
      <Button
        variant="ghost"
        onClick={onBack}
        className="text-white hover:bg-white/20 mb-4"
        disabled={isProcessing}
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        {t('selfie.back')}
      </Button>

      <h2 className="text-3xl md:text-4xl font-thin text-white mb-4 text-center">
        {t('selfie.title')}
      </h2>
      <p className="text-white/80 text-center mb-8">
        {t('selfie.instruction')}
      </p>

      {isProcessing ? (
        <div className="text-center py-20">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full mx-auto mb-4"
          />
          <p className="text-white text-xl">{t('selfie.verifying')}</p>
          <p className="text-white/70 text-lg mt-2">{t('selfie.processingTM30')}</p>
        </div>
      ) : capturedImage ? (
        <div className="space-y-6">
          <div className="relative rounded-2xl overflow-hidden border-2 border-white/20">
            <img 
              src={capturedImage} 
              alt="Captured selfie" 
              className="w-full h-auto"
            />
          </div>
          <div className="flex gap-4">
            <Button
              onClick={handleRetake}
              variant="glass"
              className="flex-1"
            >
              {t('selfie.retake')}
            </Button>
            <Button
              onClick={handleConfirmUpload}
              variant="glass"
              className="flex-1"
            >
              {t('selfie.confirm')}
            </Button>
          </div>
        </div>
      ) : (
        <CameraCapture
          onCapture={handleCapture}
          facingMode="user"
          overlayType="face"
        />
      )}
    </motion.div>
  );
};

export default SelfieStep;
