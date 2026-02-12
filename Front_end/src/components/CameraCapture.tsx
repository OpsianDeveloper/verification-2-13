import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

type Props = {
  onCapture: (imageData: string) => void;
  facingMode: "user" | "environment";
  overlayType: "face" | "document";
};

const CameraCapture = ({ onCapture, facingMode, overlayType }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      setIsLoading(true);
      setError("");
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error("Camera error:", err);
      setError("Camera access denied. Please enable camera permissions in your browser settings.");
      setIsLoading(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
  };

  const captureImage = () => {
    console.log('🎥 captureImage called');
    if (!videoRef.current || !canvasRef.current) {
      console.log('❌ Missing video or canvas ref');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) {
      console.log('❌ No canvas context');
      return;
    }

    console.log('📐 Video dimensions:', video.videoWidth, 'x', video.videoHeight);

    // Set canvas dimensions to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to JPEG blob first, then to base64 via FileReader
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          console.log('❌ Failed to generate image blob');
          return;
        }

        console.log('📦 Blob generated:', blob.type, 'size:', blob.size);

        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result;
          if (typeof result !== 'string') {
            console.log('❌ FileReader result is not a string');
            return;
          }

          const imageData = result;
          console.log('📸 Image captured via FileReader, data URL length:', imageData.length);
          console.log('📸 Image data preview:', imageData.substring(0, 50));

          if (!imageData.startsWith('data:image/jpeg;base64,')) {
            console.warn('⚠️ Image is not JPEG format:', imageData.substring(0, 30));
          }

          stopCamera();
          console.log('🎬 Calling onCapture callback');
          onCapture(imageData);
        };

        reader.onerror = (error) => {
          console.error('💥 FileReader error while reading blob:', error);
        };

        reader.readAsDataURL(blob);
      },
      "image/jpeg",
      0.95
    );
  };

  const handleCapture = () => {
    console.log('🔘 Capture button clicked, starting countdown');
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === 1) {
          console.log('⏰ Countdown finished, capturing image...');
          clearInterval(interval);
          captureImage();
          return null;
        }
        console.log('⏰ Countdown:', prev - 1);
        return prev! - 1;
      });
    }, 1000);
  };

  if (error) {
    return (
      <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-white text-lg">{error}</p>
        <Button
          onClick={startCamera}
          className="mt-4 gradient-button"
        >
          {t('common.ok')}
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative rounded-2xl overflow-hidden bg-black/20 aspect-video">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
            <p className="text-white text-lg">{t('common.loading')}</p>
          </div>
        )}
        
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />

        {/* Overlay Guide */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {overlayType === "face" ? (
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-64 h-64 border-4 border-white/50 rounded-full"
            />
          ) : (
            <motion.div
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-80 h-52 border-4 border-white/50 rounded-xl"
            />
          )}
        </div>

        {/* Countdown */}
        <AnimatePresence>
          {countdown && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-black/30"
            >
              <div className="text-9xl font-bold text-white">
                {countdown}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <Button
        onClick={handleCapture}
        disabled={isLoading || countdown !== null}
        variant="glass"
        className="w-full h-14 text-lg font-bold mt-6"
      >
        <Camera className="w-5 h-5 mr-2" />
        {overlayType === "face" ? t('selfie.captureButton') : t('document.captureButton')}
      </Button>

      <p className="text-white/60 text-center mt-4">
        {overlayType === "face"
          ? t('selfie.instruction')
          : t('document.instruction')}
      </p>
    </div>
  );
};

export default CameraCapture;
