import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const Terms = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen py-8 px-4 pb-20">
      <div className="absolute top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>
      <div className="container mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-3xl p-8"
        >
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-6 text-white hover:text-white/80"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('terms.back')}
          </Button>

          <h1 className="text-4xl font-thin text-white mb-8">
            {t('terms.title')}
          </h1>

          <ScrollArea className="h-[calc(100vh-300px)]">
            <div className="space-y-6 text-white/90 pr-4">
              <section>
                <h2 className="text-2xl font-semibold text-white mb-3">{t('terms.section1Title')}</h2>
                <p className="leading-relaxed">{t('terms.section1Text')}</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-3">{t('terms.section2Title')}</h2>
                <p className="leading-relaxed">{t('terms.section2Text')}</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-3">{t('terms.section3Title')}</h2>
                <p className="leading-relaxed mb-2">{t('terms.section3Intro')}</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>{t('terms.section3Item1')}</li>
                  <li>{t('terms.section3Item2')}</li>
                  <li>{t('terms.section3Item3')}</li>
                  <li>{t('terms.section3Item4')}</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-3">{t('terms.section4Title')}</h2>
                <p className="leading-relaxed mb-2">{t('terms.section4Intro')}</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>{t('terms.section4Item1')}</li>
                  <li>{t('terms.section4Item2')}</li>
                  <li>{t('terms.section4Item3')}</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-3">{t('terms.section5Title')}</h2>
                <p className="leading-relaxed">{t('terms.section5Text')}</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-3">{t('terms.section6Title')}</h2>
                <p className="leading-relaxed mb-2">{t('terms.section6Intro')}</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>{t('terms.section6Item1')}</li>
                  <li>{t('terms.section6Item2')}</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-3">{t('terms.section7Title')}</h2>
                <p className="leading-relaxed">{t('terms.section7Text')}</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-3">{t('terms.section8Title')}</h2>
                <p className="leading-relaxed">
                  {t('terms.section8Text')}{" "}
                  <a href={`mailto:${t('common.email')}`} className="text-white underline">
                    {t('common.email')}
                  </a>
                </p>
              </section>
            </div>
          </ScrollArea>
        </motion.div>
      </div>
    </div>
  );
};

export default Terms;
