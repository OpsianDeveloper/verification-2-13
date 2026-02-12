import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { LogOut, TrendingUp, CheckCircle2, ShieldCheck, AlertCircle, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api, AdminStats, SessionRow } from "@/lib/api";
import { MOCK_SESSIONS, MOCK_ADMIN_STATS } from "@/lib/mockData";
import { useToast } from "@/hooks/use-toast";
import StatsCard from "@/components/admin/StatsCard";
import VerificationsTableStaff from "@/components/staff/VerificationsTableStaff";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useTranslation } from "react-i18next";

const STAFF_PASSWORD = "roomquest2025";
const SESSION_KEY = "staff_authenticated";

const StaffDashboard = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    const authenticated = sessionStorage.getItem(SESSION_KEY);
    if (authenticated === "true") {
      setIsAuthenticated(true);
      loadData();
    } else {
      setLoading(false);
    }
  }, []);

  // Set to true to use mock data for testing UI
  const USE_MOCK_DATA = true;

  const loadData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    if (USE_MOCK_DATA) {
      // Use mock data for UI testing
      console.log("[StaffDashboard] Using mock data for testing");
      setStats(MOCK_ADMIN_STATS);
      setSessions(MOCK_SESSIONS);
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
      return;
    }

    try {
      const [statsData, sessionsData] = await Promise.all([api.getAdminStats(), api.getAdminSessions()]);
      setStats(statsData);
      setSessions(sessionsData);
    } catch (error) {
      // Use mock data as fallback when API fails
      console.log("[StaffDashboard] API failed, using mock data");
      setStats(MOCK_ADMIN_STATS);
      setSessions(MOCK_SESSIONS);
      toast({
        title: "Using Demo Data",
        description: "Could not connect to server. Showing sample data.",
        variant: "default",
      });
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const handleRefresh = () => {
    loadData(true);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === STAFF_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, "true");
      setIsAuthenticated(true);
      loadData();
    } else {
      toast({
        title: "Access Denied",
        description: "Incorrect password",
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setIsAuthenticated(false);
    setPassword("");
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="absolute top-4 right-4 z-50">
          <LanguageSwitcher />
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
            <CardContent className="pt-8 pb-8 px-8">
              <h1 className="text-3xl font-bold text-white text-center mb-2">{t('staff.loginTitle')}</h1>
              <p className="text-white/80 text-center mb-8">{t('staff.loginSubtitle')}</p>
              <form onSubmit={handleLogin} className="space-y-5">
                <Input
                  type="password"
                  placeholder={t('staff.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white/10 backdrop-blur-sm border-white/30 text-white placeholder:text-white/60 h-12 text-base"
                />
                <Button type="submit" className="w-full gradient-button text-white h-12 text-base font-medium">
                  {t('staff.accessButton')}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  const todayVerifications = sessions.length;
  const successfulVerifications = sessions.filter((s) => s.is_verified).length;
  const failedVerifications = todayVerifications - successfulVerifications;
  const successRate = todayVerifications > 0 ? (successfulVerifications / todayVerifications) * 100 : 0;

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="absolute top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4"
        >
          <div>
            <h1 className="text-4xl font-thin text-white mb-2 font-poppins">{t('staff.title')}</h1>
            <p className="text-white/80">{t('staff.todayStats')}</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleRefresh}
              variant="outline"
              disabled={refreshing}
              className="glass-button"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              {t('staff.refresh')}
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="glass-button"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {t('staff.logout')}
            </Button>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full"
            />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatsCard
                icon={<TrendingUp className="w-12 h-12" strokeWidth={1.5} />}
                title={t('staff.totalVerifications')}
                value={todayVerifications.toString()}
              />
              <StatsCard
                icon={<CheckCircle2 className="w-12 h-12" strokeWidth={1.5} />}
                title={t('staff.successRate')}
                value={`${successRate.toFixed(1)}%`}
                progress={successRate}
              />
              <StatsCard
                icon={<ShieldCheck className="w-12 h-12" strokeWidth={1.5} />}
                title={t('staff.successfulVerifications')}
                value={successfulVerifications.toString()}
              />
              <StatsCard
                icon={<AlertCircle className="w-12 h-12" strokeWidth={1.5} />}
                title={t('staff.failedVerifications')}
                value={failedVerifications.toString()}
              />
            </div>

            <VerificationsTableStaff sessions={sessions} />
          </>
        )}
      </div>
    </div>
  );
};

export default StaffDashboard;
