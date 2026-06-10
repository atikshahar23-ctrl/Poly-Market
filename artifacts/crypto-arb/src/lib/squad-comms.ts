import { useSyncExternalStore } from "react";

/**
 * Live "squad comms" — a tiny module-level pub/sub feed that the Scalp Squad
 * publishes its coordination chatter to (entries, exits, hand-offs, backup
 * calls, freed-capital recycling). It lives OUTSIDE React context on purpose:
 * the headless auto-trader engine pushes to it on real trade transitions, and
 * only the Bot Command Center's comms panel subscribes — so chatter never
 * triggers a re-render of the whole app, just the feed that shows it.
 */
export type SquadMessageKind = "entry" | "exit" | "info" | "backup";

export interface SquadMessage {
  id: string;
  /** epoch-ms the message was published. */
  at: number;
  /** Squad member id, or "squad" for coordinator-level chatter. */
  memberId: string;
  kind: SquadMessageKind;
  /** i18n key of the line template (localized + interpolated at render). */
  textKey: string;
  /** Raw, un-localized tokens interpolated into the template at render time. */
  tokens?: Record<string, string>;
}

const MAX_MESSAGES = 40;
let messages: SquadMessage[] = [];
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

/** Publish one chatter line; newest first, capped to the last MAX_MESSAGES. */
export function pushSquadMessage(msg: {
  memberId: string;
  kind: SquadMessageKind;
  textKey: string;
  tokens?: Record<string, string>;
  at?: number;
}): void {
  const full: SquadMessage = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: msg.at ?? Date.now(),
    memberId: msg.memberId,
    kind: msg.kind,
    textKey: msg.textKey,
    tokens: msg.tokens,
  };
  messages = [full, ...messages].slice(0, MAX_MESSAGES);
  emit();
}

/** Wipe the feed (UI "clear" button). */
export function clearSquadMessages(): void {
  if (messages.length === 0) return;
  messages = [];
  emit();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): SquadMessage[] {
  return messages;
}

/** Subscribe a component to the live squad comms feed. */
export function useSquadComms(): SquadMessage[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * Wrap a volatile token (ticker, direction, $amount, %) in a Unicode
 * first-strong isolate so it doesn't visually reorder inside an RTL Hebrew
 * line. The string equivalent of a <bdi> element.
 */
export function squadIso(s: string | number): string {
  return `\u2068${s}\u2069`;
}
