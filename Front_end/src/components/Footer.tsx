import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const Footer = () => {
  const { t } = useTranslation();
  
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 glass border-t border-white/10">
      <div className="container mx-auto px-4 py-3">
        <div className="flex flex-wrap justify-between items-center gap-x-6 gap-y-2 text-xs text-white/70">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link
              to="/privacy-policy"
              className="hover:text-white hover:underline transition-colors"
            >
              {t('footer.privacyPolicy')}
            </Link>
            <span className="hidden sm:inline text-white/40">•</span>
            <Link
              to="/data-retention"
              className="hover:text-white hover:underline transition-colors"
            >
              {t('footer.dataRetention')}
            </Link>
            <span className="hidden sm:inline text-white/40">•</span>
            <Link
              to="/terms"
              className="hover:text-white hover:underline transition-colors"
            >
              {t('footer.termsOfUse')}
            </Link>
          </div>
          <div className="text-white/60">
            {t('footer.copyright')}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
