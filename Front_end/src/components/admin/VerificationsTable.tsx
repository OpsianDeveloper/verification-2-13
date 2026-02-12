import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { SessionRow } from "@/lib/api";

type Props = {
  sessions: SessionRow[];
};

const VerificationsTable = ({ sessions }: Props) => {
  const { t } = useTranslation();
  
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 1000 / 60);
    
    if (diffMinutes < 1) return t('admin.table.justNow');
    if (diffMinutes < 60) return t('admin.table.minutesAgo', { count: diffMinutes });
    if (diffMinutes < 1440) return t('admin.table.hoursAgo', { count: Math.floor(diffMinutes / 60) });
    return date.toLocaleDateString();
  };

  const getStatusBadge = (session: SessionRow) => {
    if (session.is_verified === null) {
      return (
        <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-300 border-yellow-500/50">
          <Clock className="w-3 h-3 mr-1" />
          {t('admin.table.pending')}
        </Badge>
      );
    }
    if (session.is_verified) {
      return (
        <Badge variant="secondary" className="bg-green-500/20 text-green-300 border-green-500/50">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          {t('admin.table.verified')}
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="bg-red-500/20 text-red-300 border-red-500/50">
        <XCircle className="w-3 h-3 mr-1" />
        {t('admin.table.failed')}
      </Badge>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-6"
    >
      <h2 className="text-2xl font-bold text-white mb-6">{t('admin.recentVerifications')}</h2>
      
      <div className="space-y-4">
        {sessions.map((session, index) => (
          <motion.div
            key={session.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="glass rounded-xl p-4 hover:bg-white/15 transition-colors"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-white font-semibold text-lg">
                    {session.guest_name}
                  </span>
                  {getStatusBadge(session)}
                </div>
                <div className="flex items-center gap-4 text-white/60 text-sm">
                  <span>{t('admin.table.room')} {session.room_number}</span>
                  <span>•</span>
                  <span>{formatTime(session.created_at)}</span>
                </div>
              </div>
              
              {session.verification_score !== null && (
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">
                      {session.verification_score}%
                    </div>
                    <div className="text-white/60 text-xs">{t('admin.table.matchScore')}</div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default VerificationsTable;
