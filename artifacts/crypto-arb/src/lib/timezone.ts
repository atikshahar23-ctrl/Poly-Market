import {
  TickMarkType,
  type Time,
  type TickMarkFormatter,
  type TimeFormatterFn,
} from "lightweight-charts";

const TIME_ZONE = "Asia/Jerusalem";

/**
 * lightweight-charts renders the time axis/crosshair in UTC and has no native
 * timezone support. Rather than shifting timestamps (which collides on the DST
 * fall-back hour and breaks the strictly-ascending series invariant), we keep
 * timestamps in pure UTC and only *format* the axis tick marks and crosshair
 * label in Asia/Jerusalem local time. This is DST-correct year-round and leaves
 * the underlying data (markers, live updates, ordering) untouched.
 */

function asDate(time: Time): Date {
  // All charts in this app use UTCTimestamp (seconds since epoch).
  return new Date((time as number) * 1000);
}

const yearFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, year: "numeric" });
const monthFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, month: "short" });
const dayFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, day: "numeric", month: "short" });
const timeFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hour12: false });
const timeSecFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
const fullFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });

/** Axis tick-mark labels in Israel local time, matching the default tick granularity. */
export const israelTickMarkFormatter: TickMarkFormatter = (time, tickMarkType) => {
  const d = asDate(time);
  switch (tickMarkType) {
    case TickMarkType.Year:
      return yearFmt.format(d);
    case TickMarkType.Month:
      return monthFmt.format(d);
    case TickMarkType.DayOfMonth:
      return dayFmt.format(d);
    case TickMarkType.Time:
      return timeFmt.format(d);
    case TickMarkType.TimeWithSeconds:
      return timeSecFmt.format(d);
    default:
      return timeFmt.format(d);
  }
};

/** Crosshair vertical-line time label in Israel local time. */
export const israelTimeFormatter: TimeFormatterFn = (time) => fullFmt.format(asDate(time));
