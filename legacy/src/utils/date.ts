import { TZDate } from '@date-fns/tz';
import { getYear, getMonth, getDate, getHours, subDays } from 'date-fns';

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