import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, DollarSign, Users, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatsCard from "@/components/admin/StatsCard";
import VerificationsTable from "@/components/admin/VerificationsTable";
import { api, SessionRow, AdminStats } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    totalVerifications: 0,
    successfulVerifications: 0,
    successRate: 0,
    totalCost: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [statsData, sessionsData] = await Promise.all([
        api.getAdminStats(),
        api.getAdminSessions(),
      ]);
      setStats(statsData);
      setSessions(sessionsData);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load admin data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cover bg-center p-4 md:p-8" style={{ backgroundImage: 'url(/background.png)' }}>
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6 mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/")}
                className="text-white hover:bg-white/20"
              >
                <ArrowLeft className="w-6 h-6" />
              </Button>
              <h1 className="text-3xl md:text-4xl font-bold text-white">
                {t('admin.dashboard')}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/settings")}
                className="text-white hover:bg-white/20"
              >
                <SettingsIcon className="w-6 h-6" />
              </Button>
            </div>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="text-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full mx-auto mb-4"
            />
            <p className="text-white text-xl">{t('admin.loadingDashboard')}</p>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <StatsCard
                icon={<Users className="w-12 h-12" strokeWidth={1.5} />}
                title={t('admin.totalVerificationsToday')}
                value={stats.totalVerifications.toString()}
              />
              <StatsCard
                icon={<TrendingUp className="w-12 h-12" strokeWidth={1.5} />}
                title={t('admin.successRate')}
                value={`${stats.successRate}%`}
                progress={stats.successRate}
              />
              <StatsCard
                icon={<DollarSign className="w-12 h-12" strokeWidth={1.5} />}
                title={t('admin.apiCostToday')}
                value={`$${stats.totalCost.toFixed(2)}`}
              />
            </div>

            {/* Verifications Table */}
            <VerificationsTable sessions={sessions} />
          </>
        )}
      </div>
    </div>
  );
};

export default Admin;
