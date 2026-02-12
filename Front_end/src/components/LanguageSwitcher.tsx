import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'th' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className="text-white/80 hover:text-white hover:bg-white/10"
    >
      <Globe className="h-4 w-4 mr-2" />
      {i18n.language === 'en' ? 'ไทย' : 'EN'}
    </Button>
  );
};

export default LanguageSwitcher;
