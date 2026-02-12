import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiBaseUrl, setApiBaseUrl } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [apiUrl, setApiUrl] = useState(getApiBaseUrl());

  const handleSave = () => {
    try {
      setApiBaseUrl(apiUrl);
      toast({
        title: "Settings saved",
        description: "API base URL has been updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-cover bg-center p-4 md:p-8" style={{ backgroundImage: 'url(/background.png)' }}>
      <div className="container mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6 mb-8"
        >
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <SettingsIcon className="w-8 h-8 text-white" />
            <h1 className="text-3xl md:text-4xl font-bold text-white">
              Settings
            </h1>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-8"
        >
          <h2 className="text-2xl font-bold text-white mb-6">API Configuration</h2>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="apiUrl" className="text-white text-lg">
                API Base URL
              </Label>
              <Input
                id="apiUrl"
                type="url"
                placeholder="http://localhost:3000"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                className="h-12 text-lg bg-white/10 border-white/20 text-white placeholder:text-white/50"
              />
              <p className="text-white/60 text-sm">
                Enter the base URL of your backend API. This will be used for all API requests.
              </p>
            </div>

            <div className="bg-white/10 border border-white/20 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-2">Required Endpoints:</h3>
              <ul className="text-white/80 text-sm space-y-1">
                <li>• POST /api/verify</li>
                <li>• GET /api/admin/stats</li>
                <li>• GET /api/admin/sessions</li>
              </ul>
            </div>

            <Button
              onClick={handleSave}
              className="w-full h-12 text-lg font-bold gradient-button hover:opacity-90 transition-opacity"
            >
              <Save className="w-5 h-5 mr-2" />
              Save Settings
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Settings;
