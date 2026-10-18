/**
 * Retry-After parsing (RFC 9110 §10.2.3). Internal: not re-exported from the
 * package entry point.
 */

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** IMF-fixdate (RFC 9110 §5.6.7): `Sun, 06 Nov 1994 08:49:37 GMT`, case-sensitive. */
const IMF_FIXDATE =
  /^([A-Z][a-z]{2}), (\d{2}) ([A-Z][a-z]{2}) (\d{4}) (\d{2}):(\d{2}):(\d{2}) GMT$/;

const isLeapYear = (year: number): boolean =>
  (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

const daysInMonth = (year: number, month: number): number =>
  month === 1 ? (isLeapYear(year) ? 29 : 28) : [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];

/**
 * Days since 1970-01-01 in the proleptic Gregorian calendar (month 0-based).
 * Plain arithmetic rather than Date.UTC, which maps years 0-99 to 1900-1999.
 */
const daysFromCivil = (year: number, month: number, day: number): number => {
  const y = month < 2 ? year - 1 : year;
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const mp = (month + 10) % 12;
  const doy = Math.floor((153 * mp + 2) / 5) + day - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
};

/**
 * Milliseconds since the epoch for a valid IMF-fixdate, else null. Fields are
 * range-checked against the calendar, not normalised, and the weekday must
 * match the date. A leap second (`:60`) is the start of the next UTC minute.
 * The obsolete RFC 850 and asctime forms are not accepted.
 */
const parseImfFixdate = (value: string): number | null => {
  const m = value.match(IMF_FIXDATE);
  if (m === null) return null;
  const [, wkd, dd, mon, yyyy, hh, mm, ss] = m;
  const weekday = WEEKDAYS.indexOf(wkd);
  const month = MONTHS.indexOf(mon);
  const year = Number(yyyy);
  const day = Number(dd);
  const hour = Number(hh);
  const minute = Number(mm);
  const second = Number(ss);
  if (weekday === -1 || month === -1) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;
  if (hour > 23 || minute > 59 || second > 60) return null;
  const days = daysFromCivil(year, month, day);
  // 1970-01-01 was a Thursday (4).
  if ((((days + 4) % 7) + 7) % 7 !== weekday) return null;
  return ((days * 24 + hour) * 60 + minute) * 60_000 + second * 1000;
};

/**
 * Retry-After as whole seconds from `now`: delta-seconds as-is; a valid
 * IMF-fixdate as the seconds until that time, rounded up and never negative;
 * anything else null.
 */
export const parseRetryAfter = (value: string | null, now: number = Date.now()): number | null => {
  if (value === null) return null;
  if (/^\d+$/.test(value)) return Number(value);
  const date = parseImfFixdate(value);
  return date === null ? null : Math.max(0, Math.ceil((date - now) / 1000));
};
