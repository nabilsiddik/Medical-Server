/**
 * Helper to identify demo user accounts that are restricted to read-only access.
 */
export const isDemoUser = (email?: string | null, isDemoFlag?: boolean): boolean => {
  if (isDemoFlag) return true;
  if (!email) return false;
  const lower = email.toLowerCase().trim();
  return (
    lower.startsWith("demo.") ||
    lower.includes("demo.doctor") ||
    lower.includes("demo.patient") ||
    lower === "demo.doctor@chamber.com" ||
    lower === "demo.patient@chamber.com"
  );
};

