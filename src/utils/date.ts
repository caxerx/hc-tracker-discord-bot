import { TZDate } from '@date-fns/tz';
import { getYear, getMonth, getDay, getDate } from 'date-fns';

export function getUtcToday(): TZDate {
    const todayLocal = new Date();
    const year = getYear(todayLocal);
    const month = getMonth(todayLocal);
    const day = getDate(todayLocal);
    return new TZDate(year, month, day, "UTC");
}