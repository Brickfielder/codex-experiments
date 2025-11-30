export const isInCurrentMonth = (dateValue?: string | null): boolean => {
  if (!dateValue) return false;

  const parsedDate = new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) return false;

  const now = new Date();

  return (
    parsedDate.getUTCFullYear() === now.getUTCFullYear() &&
    parsedDate.getUTCMonth() === now.getUTCMonth()
  );
};
