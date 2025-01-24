export const formatDate = (date: Date): string => {
  if (!date) return "-";
  return date.toISOString().split("T")[0];
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(amount);
};

export const formatSIN = (sin: string): string => {
  return sin.replace(/(\d{3})(\d{3})(\d{3})/, "$1-$2-$3");
};
