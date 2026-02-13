import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { LogIn, Users, Lock } from "lucide-react";
import Footer from "@/components/Footer";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import opsianLogo from "@/assets/opsian-logo.png";

const Landing = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState<"guest" | "visitor" | null>(null);

  const handleStartFlow = async (flowType: "guest" | "visitor") => {
    setIsLoading(flowType);
    try {
      const response = await api.verify(
        flowType === "visitor"
          ? { action: "start_visitor" }
          : {
            action: "start",
            flow_type: flowType,
          }
      );

      const token = response.session_token || response.verify_url?.split("/").pop();
      if (token) {
        // Store flow type in sessionStorage as fallback
        try {
          sessionStorage.setItem(`verify_flow_${token}`, flowType);
        } catch {
          // Ignore storage errors
        }
        navigate(`/verify/${token}?flow=${flowType}`);
      } else {
        throw new Error("No session token received");
      }
    } catch (error) {
      console.error(`[Landing] Failed to start ${flowType} flow:`, error);
      toast({
        title: t("common.error"),
        description: `Failed to start ${flowType} check-in. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="min-h-screen overflow-hidden relative">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-96 h-96 rounded-full bg-white/10 blur-3xl"
          animate={{
            x: [0, 100, 0],
            y: [0, -100, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{
            top: "10%",
            left: "10%",
          }}
        />
        <motion.div
          className="absolute w-96 h-96 rounded-full bg-white/10 blur-3xl"
          animate={{
            x: [0, -100, 0],
            y: [0, 100, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{
            bottom: "10%",
            right: "10%",
          }}
        />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12 pb-32">
        <div className="absolute top-4 right-4">
          <LanguageSwitcher />
        </div>
        {/* Hero Section */}
        <motion.div
          initial={{
            opacity: 0,
            y: -20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.6,
          }}
          className="text-center mb-16"
        >
          <img src={opsianLogo} alt="OPSIAN" className="h-16 md:h-24 mx-auto mb-6" />
          <p className="text-2xl text-white/90 mb-12 md:text-base">{t("landing.subtitle")}</p>

          {/* CTA Cards - Side by side on desktop, stacked on mobile */}
          <div className="max-w-3xl mx-auto mb-16">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Guest Check-In Card */}
              <motion.div
                whileHover={{ scale: isLoading ? 1 : 1.03 }}
                whileTap={{ scale: isLoading ? 1 : 0.97 }}
                className={`glass-hover rounded-3xl p-8 cursor-pointer transition-opacity ${isLoading && isLoading !== "guest" ? "opacity-50" : ""
                  }`}
                onClick={() => !isLoading && handleStartFlow("guest")}
              >
                <LogIn className="w-16 h-16 text-white mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2">
                  {isLoading === "guest" ? t("common.loading") : t("landing.startVerification")}
                </h3>
                <p className="text-white/80">{t("landing.startDescription")}</p>
              </motion.div>

              {/* Visitor Check-In Card */}
              <motion.div
                whileHover={{ scale: isLoading ? 1 : 1.03 }}
                whileTap={{ scale: isLoading ? 1 : 0.97 }}
                className={`glass-hover rounded-3xl p-8 cursor-pointer transition-opacity ${isLoading && isLoading !== "visitor" ? "opacity-50" : ""
                  }`}
                onClick={() => !isLoading && handleStartFlow("visitor")}
              >
                <Users className="w-16 h-16 text-white mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2">
                  {isLoading === "visitor" ? t("common.loading") : t("landing.visitorCheckIn")}
                </h3>
                <p className="text-white/80">{t("landing.visitorDescription")}</p>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Security Text */}
        <motion.div
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.6,
            delay: 0.3,
          }}
          className="text-center mb-20"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Lock className="w-4 h-4 text-white/60" />
            <p className="text-sm text-white/60">{t("landing.description")}</p>
          </div>
          <p className="text-xs text-white/40">Powered by Opsian</p>
        </motion.div>
      </div>

      <Footer />
    </div>
  );
};

export default Landing;
