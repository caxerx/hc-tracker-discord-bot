import { TZDate } from "@date-fns/tz";
import {
  getYear,
  getMonth,
  getDate,
  getHours,
  subDays,
  addDays,
  format,
  startOfWeek,
  subWeeks,
  endOfWeek,
  formatDate,
  subMonths,
  endOfMonth,
  startOfMonth,
} from "date-fns";

export function getServerToday(): TZDate {
  const todayLocal = new Date();
  const hours = getHours(todayLocal);
  const year = getYear(todayLocal);
  const month = getMonth(todayLocal);
  const day = getDate(todayLocal);
  const utcToday = new TZDate(year, month, day, "UTC");

  // server reset hc at 5am, so if it's before 5am, use yesterday's date
  if (hours < 5) {
    return subDays(utcToday, 1);
  }
  return utcToday;
}

export function getLast7Days() {
  const dates: { label: string; value: string }[] = [];
  const today = getServerToday();

  for (let i = 0; i < 7; i++) {
    const date = addDays(today, -i);
    const dateStr = format(date, "yyyy-MM-dd");
    dates.push({ label: dateStr, value: dateStr });
  }

  return dates;
}

// A function that returns the last 6 weeks, starting from the current week, the first day of week is Monday
export function getLast6Weeks() {
  const weeks: {
    label: string;
    startDate: string;
    endDate: string;
    value: string;
  }[] = [];
  const today = getServerToday();
  const thisWeek = startOfWeek(today, { weekStartsOn: 1 });

  for (let i = 0; i < 6; i++) {
    const week = subWeeks(thisWeek, i);

    const weekStart = startOfWeek(week, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(week, { weekStartsOn: 1 });
    const weekLabel = `${format(weekStart, "yyyy-MM-dd")} - ${format(weekEnd, "yyyy-MM-dd")}`;
    const weekValue = format(weekStart, "yyyy-MM-dd");

    weeks.push({
      label: weekLabel,
      startDate: format(weekStart, "yyyy-MM-dd"),
      endDate: format(weekEnd, "yyyy-MM-dd"),
      value: weekValue,
    });
  }
  return weeks;
}

export function getLast6Months() {
  const months: { label: string; value: string }[] = [];
  const today = getServerToday();
  const thisMonth = startOfMonth(today);

  for (let i = 0; i < 6; i++) {
    const month = subMonths(thisMonth, i);
    const monthStart = startOfMonth(month);
    const monthLabel = `${format(monthStart, "yyyy-MM")}`;
    const monthValue = format(monthStart, "yyyy-MM-dd");

    months.push({ label: monthLabel, value: monthValue });
  }

  return months;
}
