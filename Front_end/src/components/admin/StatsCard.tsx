import { motion } from "framer-motion";
import { ReactNode } from "react";

type Props = {
  icon: ReactNode;
  title: string;
  value: string;
  progress?: number;
};

const StatsCard = ({ icon, title, value, progress }: Props) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.03, y: -4 }}
      transition={{ duration: 0.2 }}
      className="glass rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="text-white/60">
          {icon}
        </div>
      </div>
      
      <h3 className="text-white/60 text-sm font-medium mb-2 tracking-wide uppercase">
        {title}
      </h3>
      
      <div className="text-4xl font-bold bg-gradient-to-r from-white via-white to-white/80 bg-clip-text text-transparent mb-4">
        {value}
      </div>
      
      {progress !== undefined && (
        <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-white/80 to-white/40"
          />
        </div>
      )}
    </motion.div>
  );
};

export default StatsCard;
