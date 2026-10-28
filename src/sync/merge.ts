// Merging this device's data with the cloud copy. Items merge one by one: the most recently
// edited copy of each event/profile wins, deletions win over older edits (tombstones), and
// settings follow whichever side changed them last. Device-only data (reminder delivery log,
// cached dates, notices) never leaves the device. The user's own songs and poojas sync like events.
import { upgrade } from '../data/traditions';
import type { AppState, BirthProfile, FamilyEvent, MyPooja, MySong, Settings } from '../data/types';

/** The part of the app state that is stored in the cloud. */
export interface SyncedState {
  v: 1;
  events: FamilyEvent[];
  profiles: BirthProfile[];
  /** Absent in cloud copies saved before own songs and poojas existed. */
  mySongs?: MySong[];
  myPoojas?: MyPooja[];
  settings: Settings;
  settingsUpdatedAt?: string;
  tombstones: Record<string, string>;
}

export function toSynced(s: AppState): SyncedState {
  return { v: 1, events: s.events, profiles: s.profiles, mySongs: s.mySongs ?? [], myPoojas: s.myPoojas ?? [], settings: s.settings, settingsUpdatedAt: s.settingsUpdatedAt, tombstones: s.tombstones ?? {} };
}

const ts = (x?: string) => (x ? Date.parse(x) || 0 : 0);

function mergeById<T extends { id: string; updatedAt?: string }>(a: T[], b: T[], tomb: Record<string, string>): T[] {
  const out = new Map<string, T>();
  for (const item of [...a, ...b]) {
    const cur = out.get(item.id);
    if (!cur || ts(item.updatedAt) > ts(cur.updatedAt)) out.set(item.id, item);
  }
  // A deletion removes the item unless it was edited again after being deleted.
  return [...out.values()].filter((x) => !(x.id in tomb) || ts(x.updatedAt) > ts(tomb[x.id]));
}

export function mergeStates(local: SyncedState, remote: SyncedState | null): SyncedState {
  if (!remote) return local;
  // A cloud copy saved by an older version may still use the separate Andhra/Telangana calendars.
  remote = upgrade(remote);
  const tombstones = { ...remote.tombstones };
  for (const [id, t] of Object.entries(local.tombstones)) if (!tombstones[id] || ts(t) > ts(tombstones[id])) tombstones[id] = t;
  const localNewer = ts(local.settingsUpdatedAt) >= ts(remote.settingsUpdatedAt);
  return {
    v: 1,
    events: mergeById(local.events, remote.events, tombstones),
    profiles: mergeById(local.profiles, remote.profiles, tombstones),
    mySongs: mergeById(local.mySongs ?? [], remote.mySongs ?? [], tombstones),
    myPoojas: mergeById(local.myPoojas ?? [], remote.myPoojas ?? [], tombstones),
    settings: { ...(localNewer ? local.settings : remote.settings), onboarded: local.settings.onboarded || remote.settings.onboarded },
    settingsUpdatedAt: localNewer ? local.settingsUpdatedAt : remote.settingsUpdatedAt,
    tombstones,
  };
}

export function sameSynced(a: SyncedState, b: SyncedState): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
