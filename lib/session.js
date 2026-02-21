export function inferStepFromSession(session) {
    if (!session) return "welcome";
    if (session?.current_step) return session.current_step;

    if (session?.is_verified === true || session?.verification_score != null) return "results";
    if (session?.selfie_url) return "results";
    if (session?.document_url) return "selfie";
    if (session?.guest_name || session?.room_number) return "document";
    return "welcome";
}
