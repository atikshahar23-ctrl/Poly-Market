import { describe, it, expect, vi, beforeAll } from "vitest";

/**
 * timezone.test.ts
 *
 * Unit tests for israelTickMarkFormatter and israelTimeFormatter.
 * Both functions convert UTC timestamps to Israel-local (Asia/Jerusalem) label
 * strings. The critical correctness requirement is around Israel's twice-yearly
 * DST transitions:
 *   - Spring forward: last Friday before 2 April  (02:00 → 03:00, UTC+2 → UTC+3)
 *   - Fall back:      last Sunday of October      (02:00 → 01:00, UTC+3 → UTC+2)
 *
 * Transition instants by year (Israel DST dates shift each year):
 *   2024 spring-forward: 2024-03-29T00:00Z  (local: 29 Mar 03:00, Fri before 2 Apr)
 *   2024 fall-back:      2024-10-26T23:00Z  (local: 27 Oct 01:00, last Sun of Oct)
 *   2025 spring-forward: 2025-03-28T00:00Z  (local: 28 Mar 03:00, Fri before 2 Apr)
 *   2025 fall-back:      2025-10-25T23:00Z  (local: 26 Oct 01:00, last Sun of Oct)
 *   2026 spring-forward: 2026-03-27T00:00Z  (local: 27 Mar 03:00, Fri before 2 Apr)
 *   2026 fall-back:      2026-10-24T23:00Z  (local: 25 Oct 01:00, last Sun of Oct)
 */

beforeAll(() => {
  const probe = new Date("2024-01-15T10:00:00Z");
  const hour = parseInt(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Jerusalem",
      hour: "numeric",
      hour12: false,
    }).format(probe),
    10
  );
  if (hour !== 12) {
    throw new Error(
      `Full ICU timezone data is not available for 'Asia/Jerusalem'. ` +
        `Expected hour 12 for 10:00 UTC in winter (UTC+2 offset), but got ${hour}. ` +
        `Ensure Node.js is built with full ICU data (--with-intl=full-icu) or ` +
        `the NODE_ICU_DATA env var points to a full ICU dataset. ` +
        `All 19 timezone tests would produce wrong results without this.`
    );
  }
});

vi.mock("lightweight-charts", () => ({
  TickMarkType: {
    Year: 0,
    Month: 1,
    DayOfMonth: 2,
    Time: 3,
    TimeWithSeconds: 4,
  },
}));

import {
  israelTickMarkFormatter,
  israelTimeFormatter,
} from "./timezone";

const sec = (iso: string): number => Math.floor(new Date(iso).getTime() / 1000);

const YEAR = 0;
const MONTH = 1;
const DAY = 2;
const TIME = 3;
const TIME_SEC = 4;

describe("israelTickMarkFormatter", () => {
  describe("regular winter time — UTC+2 (2024-01-15T10:30:00Z → Israel 12:30)", () => {
    const t = sec("2024-01-15T10:30:00Z");

    it("Year tick → '2024'", () => {
      expect(israelTickMarkFormatter(t, YEAR)).toBe("2024");
    });

    it("Month tick → 'Jan'", () => {
      expect(israelTickMarkFormatter(t, MONTH)).toBe("Jan");
    });

    it("DayOfMonth tick → '15 Jan'", () => {
      expect(israelTickMarkFormatter(t, DAY)).toBe("15 Jan");
    });

    it("Time tick → '12:30' (UTC+2 offset applied)", () => {
      expect(israelTickMarkFormatter(t, TIME)).toBe("12:30");
    });

    it("TimeWithSeconds tick → '12:30:00'", () => {
      expect(israelTickMarkFormatter(t, TIME_SEC)).toBe("12:30:00");
    });
  });

  describe("regular summer / DST time — UTC+3 (2024-07-15T10:30:00Z → Israel 13:30)", () => {
    const t = sec("2024-07-15T10:30:00Z");

    it("Time tick → '13:30' (UTC+3 offset applied)", () => {
      expect(israelTickMarkFormatter(t, TIME)).toBe("13:30");
    });

    it("Month tick → 'Jul'", () => {
      expect(israelTickMarkFormatter(t, MONTH)).toBe("Jul");
    });

    it("DayOfMonth tick → '15 Jul'", () => {
      expect(israelTickMarkFormatter(t, DAY)).toBe("15 Jul");
    });
  });

  describe("spring-forward boundary — 2024-03-29 (clocks jump 02:xx → 03:xx)", () => {
    it("just before: 2024-03-28T23:59:00Z → Israel 01:59 (still UTC+2)", () => {
      expect(israelTickMarkFormatter(sec("2024-03-28T23:59:00Z"), TIME)).toBe("01:59");
    });

    it("at transition: 2024-03-29T00:00:00Z → Israel 03:00 (UTC+3, 02:xx hour skipped)", () => {
      expect(israelTickMarkFormatter(sec("2024-03-29T00:00:00Z"), TIME)).toBe("03:00");
    });

    it("after transition: 2024-03-29T00:01:00Z → Israel 03:01 (UTC+3)", () => {
      expect(israelTickMarkFormatter(sec("2024-03-29T00:01:00Z"), TIME)).toBe("03:01");
    });
  });

  describe("fall-back boundary — 2024-10-27 (clocks roll back 02:00 → 01:00)", () => {
    it("just before fall-back: 2024-10-26T22:59:00Z → Israel 01:59 (UTC+3, still DST)", () => {
      expect(israelTickMarkFormatter(sec("2024-10-26T22:59:00Z"), TIME)).toBe("01:59");
    });

    it("at fall-back: 2024-10-26T23:00:00Z → Israel 01:00 (UTC+2, clock set back)", () => {
      expect(israelTickMarkFormatter(sec("2024-10-26T23:00:00Z"), TIME)).toBe("01:00");
    });

    it("after fall-back: 2024-10-26T23:01:00Z → Israel 01:01 (UTC+2)", () => {
      expect(israelTickMarkFormatter(sec("2024-10-26T23:01:00Z"), TIME)).toBe("01:01");
    });
  });

  describe("spring-forward boundary — 2025-03-28 (clocks jump 02:xx → 03:xx)", () => {
    it("just before: 2025-03-27T23:59:00Z → Israel 01:59 (still UTC+2)", () => {
      expect(israelTickMarkFormatter(sec("2025-03-27T23:59:00Z"), TIME)).toBe("01:59");
    });

    it("at transition: 2025-03-28T00:00:00Z → Israel 03:00 (UTC+3, 02:xx hour skipped)", () => {
      expect(israelTickMarkFormatter(sec("2025-03-28T00:00:00Z"), TIME)).toBe("03:00");
    });

    it("after transition: 2025-03-28T00:01:00Z → Israel 03:01 (UTC+3)", () => {
      expect(israelTickMarkFormatter(sec("2025-03-28T00:01:00Z"), TIME)).toBe("03:01");
    });
  });

  describe("fall-back boundary — 2025-10-26 (clocks roll back 02:00 → 01:00)", () => {
    it("just before fall-back: 2025-10-25T22:59:00Z → Israel 01:59 (UTC+3, still DST)", () => {
      expect(israelTickMarkFormatter(sec("2025-10-25T22:59:00Z"), TIME)).toBe("01:59");
    });

    it("at fall-back: 2025-10-25T23:00:00Z → Israel 01:00 (UTC+2, clock set back)", () => {
      expect(israelTickMarkFormatter(sec("2025-10-25T23:00:00Z"), TIME)).toBe("01:00");
    });

    it("after fall-back: 2025-10-25T23:01:00Z → Israel 01:01 (UTC+2)", () => {
      expect(israelTickMarkFormatter(sec("2025-10-25T23:01:00Z"), TIME)).toBe("01:01");
    });
  });

  describe("spring-forward boundary — 2026-03-27 (clocks jump 02:xx → 03:xx)", () => {
    it("just before: 2026-03-26T23:59:00Z → Israel 01:59 (still UTC+2)", () => {
      expect(israelTickMarkFormatter(sec("2026-03-26T23:59:00Z"), TIME)).toBe("01:59");
    });

    it("at transition: 2026-03-27T00:00:00Z → Israel 03:00 (UTC+3, 02:xx hour skipped)", () => {
      expect(israelTickMarkFormatter(sec("2026-03-27T00:00:00Z"), TIME)).toBe("03:00");
    });

    it("after transition: 2026-03-27T00:01:00Z → Israel 03:01 (UTC+3)", () => {
      expect(israelTickMarkFormatter(sec("2026-03-27T00:01:00Z"), TIME)).toBe("03:01");
    });
  });

  describe("fall-back boundary — 2026-10-25 (clocks roll back 02:00 → 01:00)", () => {
    it("just before fall-back: 2026-10-24T22:59:00Z → Israel 01:59 (UTC+3, still DST)", () => {
      expect(israelTickMarkFormatter(sec("2026-10-24T22:59:00Z"), TIME)).toBe("01:59");
    });

    it("at fall-back: 2026-10-24T23:00:00Z → Israel 01:00 (UTC+2, clock set back)", () => {
      expect(israelTickMarkFormatter(sec("2026-10-24T23:00:00Z"), TIME)).toBe("01:00");
    });

    it("after fall-back: 2026-10-24T23:01:00Z → Israel 01:01 (UTC+2)", () => {
      expect(israelTickMarkFormatter(sec("2026-10-24T23:01:00Z"), TIME)).toBe("01:01");
    });
  });
});

describe("israelTimeFormatter (crosshair label)", () => {
  it("winter: 2024-01-15T10:30:00Z → '15 Jan, 12:30' (UTC+2)", () => {
    expect(israelTimeFormatter(sec("2024-01-15T10:30:00Z"))).toBe("15 Jan, 12:30");
  });

  it("summer: 2024-07-15T10:30:00Z → '15 Jul, 13:30' (UTC+3)", () => {
    expect(israelTimeFormatter(sec("2024-07-15T10:30:00Z"))).toBe("15 Jul, 13:30");
  });

  it("spring-forward: 2024-03-29T00:00:00Z → '29 Mar, 03:00' (no 02:xx label possible)", () => {
    expect(israelTimeFormatter(sec("2024-03-29T00:00:00Z"))).toBe("29 Mar, 03:00");
  });

  it("fall-back (at transition): 2024-10-26T23:00:00Z → '27 Oct, 01:00' (UTC+2 after rollback)", () => {
    expect(israelTimeFormatter(sec("2024-10-26T23:00:00Z"))).toBe("27 Oct, 01:00");
  });

  it("fall-back (one hour after): 2024-10-27T00:00:00Z → '27 Oct, 02:00' (UTC+2)", () => {
    expect(israelTimeFormatter(sec("2024-10-27T00:00:00Z"))).toBe("27 Oct, 02:00");
  });

  it("2025 spring-forward: 2025-03-28T00:00:00Z → '28 Mar, 03:00' (no 02:xx label possible)", () => {
    expect(israelTimeFormatter(sec("2025-03-28T00:00:00Z"))).toBe("28 Mar, 03:00");
  });

  it("2025 fall-back (at transition): 2025-10-25T23:00:00Z → '26 Oct, 01:00' (UTC+2 after rollback)", () => {
    expect(israelTimeFormatter(sec("2025-10-25T23:00:00Z"))).toBe("26 Oct, 01:00");
  });

  it("2025 fall-back (one hour after): 2025-10-26T00:00:00Z → '26 Oct, 02:00' (UTC+2)", () => {
    expect(israelTimeFormatter(sec("2025-10-26T00:00:00Z"))).toBe("26 Oct, 02:00");
  });

  it("2026 spring-forward: 2026-03-27T00:00:00Z → '27 Mar, 03:00' (no 02:xx label possible)", () => {
    expect(israelTimeFormatter(sec("2026-03-27T00:00:00Z"))).toBe("27 Mar, 03:00");
  });

  it("2026 fall-back (at transition): 2026-10-24T23:00:00Z → '25 Oct, 01:00' (UTC+2 after rollback)", () => {
    expect(israelTimeFormatter(sec("2026-10-24T23:00:00Z"))).toBe("25 Oct, 01:00");
  });

  it("2026 fall-back (one hour after): 2026-10-25T00:00:00Z → '25 Oct, 02:00' (UTC+2)", () => {
    expect(israelTimeFormatter(sec("2026-10-25T00:00:00Z"))).toBe("25 Oct, 02:00");
  });
});
