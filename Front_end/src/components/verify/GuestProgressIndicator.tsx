import { useTranslation } from "react-i18next";
import { VerificationData } from "@/pages/Verify";

type Props = {
  data: VerificationData;
};

/**
 * Displays "Guest X of Y" progress indicator during multi-guest verification.
 * Only renders when expectedGuestCount >= 2.
 */
const GuestProgressIndicator = ({ data }: Props) => {
  const { t } = useTranslation();

  // Only show if there are 2+ guests expected
  if (!data.expectedGuestCount || data.expectedGuestCount < 2) {
    return null;
  }

  // Calculate current guest from verified count (more reliable than guestIndex)
  // Current guest = verifiedGuestCount + 1, capped at expectedGuestCount
  const verifiedCount = data.verifiedGuestCount ?? 0;
  const totalGuests = data.expectedGuestCount;
  const currentGuest = Math.min(verifiedCount + 1, totalGuests);

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 mb-4 text-center">
      <p className="text-white/90 text-sm font-medium">
        {t('verify.guestProgress', { current: currentGuest, total: totalGuests })}
      </p>
    </div>
  );
};

export default GuestProgressIndicator;
