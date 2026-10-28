// Pure date helpers. Days are "YYYY-MM-DD" keys in local time so nothing
// drifts across time zones or between server and client renders.
import { getActiveLang, type Lang } from "./i18n";

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
export const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3));
export const MONTHS_ZH = [
  "1月",
  "2月",
  "3月",
  "4月",
  "5月",
  "6月",
  "7月",
  "8月",
  "9月",
  "10月",
  "11月",
  "12月",
];
export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const WEEKDAYS_SHORT = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
export const WEEKDAYS_ZH = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
export const WEEKDAYS_SHORT_ZH = ["日", "一", "二", "三", "四", "五", "六"];

export function monthNames(lang: Lang = getActiveLang()): string[] {
  return lang === "zh" ? MONTHS_ZH : MONTHS;
}

export function weekdayShortNames(lang: Lang = getActiveLang()): string[] {
  return lang === "zh" ? WEEKDAYS_SHORT_ZH : WEEKDAYS_SHORT;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function toKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, n: number): string {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

export function addMonths(key: string, n: number): string {
  const d = fromKey(key);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return toKey(d);
}

export function dayOfWeek(key: string): number {
  return fromKey(key).getDay();
}

export function startOfWeek(key: string, weekStartsOn: 0 | 1 = 0): string {
  const dow = dayOfWeek(key);
  const diff = (dow - weekStartsOn + 7) % 7;
  return addDays(key, -diff);
}

export function weekDays(key: string, weekStartsOn: 0 | 1 = 0): string[] {
  const start = startOfWeek(key, weekStartsOn);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function startOfMonth(key: string): string {
  return key.slice(0, 8) + "01";
}

export function daysInMonth(key: string): number {
  const d = fromKey(key);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

/** 6×7 grid of days covering the month of `key`. */
export function monthGrid(key: string, weekStartsOn: 0 | 1 = 0): string[] {
  const first = startOfWeek(startOfMonth(key), weekStartsOn);
  return Array.from({ length: 42 }, (_, i) => addDays(first, i));
}

/** ISO-8601 week number of the given day. */
export function isoWeek(key: string): number {
  const d = fromKey(key);
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dayNr = (target.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const diff = (target.getTime() - firstThursday.getTime()) / 86400000;
  return 1 + Math.round((diff - 3 + ((firstThursday.getDay() + 6) % 7)) / 7);
}

export function diffDays(a: string, b: string): number {
  return Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86400000);
}

export function rangeKeys(from: string, to: string): string[] {
  const n = diffDays(from, to);
  if (n < 0) return [];
  return Array.from({ length: n + 1 }, (_, i) => addDays(from, i));
}

export function isWeekend(key: string): boolean {
  const d = dayOfWeek(key);
  return d === 0 || d === 6;
}

export function monthName(key: string, lang: Lang = getActiveLang()): string {
  return monthNames(lang)[fromKey(key).getMonth()];
}

/** Short month label, e.g. "Nov" / "11月". */
export function monthShort(key: string, lang: Lang = getActiveLang()): string {
  const m = fromKey(key).getMonth();
  return lang === "zh" ? MONTHS_ZH[m] : MONTHS_SHORT[m];
}

/** Short weekday label, e.g. "SUN" / "日". */
export function weekdayShort(key: string, lang: Lang = getActiveLang()): string {
  return weekdayShortNames(lang)[dayOfWeek(key)];
}

/** Short weekday label from a Date, kept for callers that already have one. */
export function weekdayShortFromDate(d: Date, lang: Lang = getActiveLang()): string {
  return weekdayShortNames(lang)[d.getDay()];
}

export function formatLong(key: string, lang: Lang = getActiveLang()): string {
  const d = fromKey(key);
  if (lang === "zh") return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function formatShort(key: string, lang: Lang = getActiveLang()): string {
  const d = fromKey(key);
  if (lang === "zh") return `${d.getMonth() + 1}月${d.getDate()}日`;
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

/** Month and day only, e.g. "Nov 10" / "11月10日". */
export function formatMonthDay(key: string, lang: Lang = getActiveLang()): string {
  return formatShort(key, lang);
}

export function formatWeekday(key: string, lang: Lang = getActiveLang()): string {
  return lang === "zh" ? WEEKDAYS_ZH[dayOfWeek(key)] : WEEKDAYS[dayOfWeek(key)];
}

export function formatRange(from: string, to: string, lang: Lang = getActiveLang()): string {
  const a = fromKey(from);
  const b = fromKey(to);
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) {
    if (lang === "zh") return `${a.getMonth() + 1}月${a.getDate()}日 – ${b.getDate()}日`;
    return `${MONTHS_SHORT[a.getMonth()]} ${a.getDate()} – ${b.getDate()}`;
  }
  return `${formatShort(from, lang)} – ${formatShort(to, lang)}`;
}

export function formatTime(minutes: number, format: "24h" | "12h" = "24h", lang: Lang = getActiveLang()): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (minutes === 1440) return format === "24h" ? "24:00" : lang === "zh" ? "上午 12:00" : "12:00 AM";
  if (format === "24h") return `${pad(h)}:${pad(mm)}`;
  const suffix = lang === "zh" ? (h < 12 ? "上午" : "下午") : h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return lang === "zh" ? `${suffix} ${h12}:${pad(mm)}` : `${h12}:${pad(mm)} ${suffix}`;
}

export function formatTimeRange(start: number, end: number, format: "24h" | "12h" = "24h", lang: Lang = getActiveLang()) {
  return `${formatTime(start, format, lang)} – ${formatTime(end, format, lang)}`;
}

export function parseTime(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function timeInputValue(minutes: number): string {
  const m = Math.min(minutes, 1439);
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export function relativeTime(iso: string, now: number, lang: Lang = getActiveLang()): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const min = Math.floor(diff / 60000);
  if (lang === "zh") {
    if (min < 1) return "刚刚";
    if (min < 60) return `${min}分钟前`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h}小时前`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}天前`;
    const date = new Date(iso);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  }
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const date = new Date(iso);
  return `${MONTHS_SHORT[date.getMonth()]} ${date.getDate()}`;
}
