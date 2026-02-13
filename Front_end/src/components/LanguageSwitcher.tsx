import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';

const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();

  const toggleLanguage = () => {
    const current = i18n.resolvedLanguage || i18n.language || 'en';
    const isEnglish = current.startsWith('en');
    const newLang = isEnglish ? 'th' : 'en';

    i18n.changeLanguage(newLang);
    localStorage.setItem('opsian_lang', newLang);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className="text-white hover:text-white hover:bg-white/10"
    >
      <Globe className="h-4 w-4 mr-2" />
      {t('common.current_language_name')}
    </Button>
  );
};

export default LanguageSwitcher;
