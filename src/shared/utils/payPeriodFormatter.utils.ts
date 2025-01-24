import { PayPeriodType } from "@/entities/PayPeriod";

export const getPayPeriodCode = (
  date: Date,
  periodType: PayPeriodType
): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const half = periodType === PayPeriodType.FIRST_HALF ? "A" : "B";
  return `${year}${month}${half}`;
};
