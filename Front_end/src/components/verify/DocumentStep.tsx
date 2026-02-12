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
  onBack: () => void;
  onError: (error: Error) => void;
};

const DocumentStep = ({ data, updateData, onNext, onBack, onError }: Props) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const { t } = useTranslation();

  const handleCapture = (imageData: string) => {
    console.log("[Document] Image captured");
    setCapturedImage(imageData);
  };

  const handleRetake = () => {
    console.log("[Document] Retaking photo");
    setCapturedImage(null);
  };

  const handleConfirmUpload = async () => {
    if (!capturedImage) return;

    if (!data.sessionToken) {
      onError(new Error("No session token found"));
      return;
    }

    setIsProcessing(true);
    console.log("[Document] Starting upload process...");

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

      console.log(`[Document] Optimized size: ${Math.round(optimizeResult.sizeBytes / 1024)}KB`);

      // Strip the data URI prefix to get clean base64
      const cleanBase64 = optimizeResult.dataUrl.replace(
        /^data:image\/\w+;base64,/,
        ""
      );

      console.log("[Document] Sending upload request...");

      const resolvedGuestName = (
        data.guestName || `${data.visitorFirstName || ""} ${data.visitorLastName || ""}`.trim()
      ).trim();

      const uploadPayload = {
        action: "upload_document" as const,
        session_token: data.sessionToken,
        image_data: cleanBase64,
        document_type: "passport",
        ...(resolvedGuestName ? { guest_name: resolvedGuestName } : {}),
        ...(data.roomNumber ? { room_number: data.roomNumber } : {}),
        ...(typeof data.guestIndex === "number" ? { guest_index: data.guestIndex } : {}),
      };

      const response = await api.verify(uploadPayload);

      if (response.success) {
        console.log("[Document] Upload successful, response:", response);
        
        // Extract visitor access code (returned by backend for visitor flow)
        const visitorAccessCode = 
          (response as any).visitor_access_code ||
          (response as any).access_code ||
          (response as any).data?.visitor_access_code ||
          (response as any).data?.access_code ||
          undefined;
        
        const visitorAccessGrantedAt = 
          (response as any).visitor_access_granted_at ||
          (response as any).data?.visitor_access_granted_at ||
          undefined;
          
        const visitorAccessExpiresAt = 
          (response as any).visitor_access_expires_at ||
          (response as any).data?.visitor_access_expires_at ||
          undefined;

        console.log("[Document] Visitor access code from response:", visitorAccessCode);
        
        updateData({ 
          documentImage: optimizeResult.dataUrl,
          ...(visitorAccessCode ? { visitorAccessCode } : {}),
          ...(visitorAccessGrantedAt ? { visitorAccessGrantedAt } : {}),
          ...(visitorAccessExpiresAt ? { visitorAccessExpiresAt } : {}),
        });
        
        toast({ title: "Document uploaded successfully!" });
        onNext();
      } else {
        throw new Error(response.error || "Failed to upload document");
      }
    } catch (error) {
      console.error("[Document] Upload error:", error);
      toast({
        title: "Failed to upload document",
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
        {t('document.back')}
      </Button>

      {/* Multi-guest progress banner - only show when Guest 1+ verified AND multi-guest session */}
      {data.verifiedGuestCount != null && 
       data.verifiedGuestCount > 0 && 
       data.expectedGuestCount != null && 
       data.expectedGuestCount >= 2 && (
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-6 text-center border border-white/20">
          <p className="text-white/90">
            {t('document.nextGuestMessage', {
              verified: data.verifiedGuestCount,
              next: data.verifiedGuestCount + 1
            })}
          </p>
        </div>
      )}

      <h2 className="text-3xl md:text-4xl font-thin text-white mb-4 text-center">
        {t('document.title')}
      </h2>
      <p className="text-white/80 text-center mb-8">
        {t('document.instruction')}
      </p>

      {isProcessing ? (
        <div className="text-center py-20">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full mx-auto mb-4"
          />
          <p className="text-white text-xl">{t('document.uploading')}</p>
        </div>
      ) : capturedImage ? (
        <div className="space-y-6">
          <div className="relative rounded-2xl overflow-hidden border-2 border-white/20">
            <img 
              src={capturedImage} 
              alt="Captured document" 
              className="w-full h-auto"
            />
          </div>
          <div className="flex gap-4">
            <Button
              onClick={handleRetake}
              variant="glass"
              className="flex-1"
            >
              {t('document.retake')}
            </Button>
            <Button
              onClick={handleConfirmUpload}
              variant="glass"
              className="flex-1"
            >
              {t('document.confirm')}
            </Button>
          </div>
        </div>
      ) : (
        <CameraCapture
          onCapture={handleCapture}
          facingMode="environment"
          overlayType="document"
        />
      )}
    </motion.div>
  );
};

export default DocumentStep;
