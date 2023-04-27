import { Doc, delDoc, listDocs, setDoc } from "@junobuild/core";
import { ActiveTimer, Log } from "../models/timesheets";
import { nanoid } from "nanoid";

let activeTimer: Doc<ActiveTimer> | undefined;

/// Returns an active timer if one exists.
export async function getActiveTimer(): Promise<ActiveTimer | null> {
  const docs = await listDocs<ActiveTimer>({
    collection: "timesheet-timers",
    filter: {},
  });
  if (docs.length) {
    activeTimer = docs.items[0];
    // Juno returns a string instead of a date object.
    return {
      ...activeTimer.data,
      in: new Date(activeTimer.data.in),
    };
  }
  activeTimer = undefined;
  return null;
}

/// Creates a new active timer and returns it. Ideally there's only one, so check first.
export async function createActiveTimer(): Promise<ActiveTimer> {
  const timer = { label: "", in: new Date() };
  const key = nanoid();
  const doc = await setDoc<ActiveTimer>({
    collection: "timesheet-timers",
    doc: {
      key,
      data: timer,
    },
  });
  activeTimer = doc;
  return timer;
}

// Sets the label of the active timer.
export async function setActiveTimerLabel(label: string): Promise<void> {
  if (!activeTimer) throw new Error("No active timer to set label for.");
  const result = await setDoc<ActiveTimer>({
    collection: "timesheet-timers",
    doc: {
      ...activeTimer,
      data: {
        ...activeTimer.data,
        label,
      },
    },
  });
  activeTimer = result;
}

// Ends the active timer by deleting the active timer doc and creating a log doc.
export async function endActiveTimer(): Promise<Doc<Log>> {
  if (!activeTimer) throw new Error("No active timer to end.");
  await delDoc<ActiveTimer>({
    collection: "timesheet-timers",
    doc: activeTimer,
  });
  const log = await setDoc<Log>({
    collection: "timesheet-logs",
    doc: {
      ...activeTimer,
      data: {
        ...activeTimer.data,
        in: new Date(activeTimer.data.in), // Juno returns a string instead of a date object.
        out: new Date(),
      },
    },
  });
  activeTimer = undefined;
  return log;
}

// Returns all logs.
export async function getLogs(): Promise<Doc<Log>[]> {
  const docs = await listDocs<Log>({
    collection: "timesheet-logs",
    filter: {},
  });
  return docs.items
    .map((doc) => ({
      ...doc,
      data: {
        ...doc.data,
        in: new Date(doc.data.in),
        out: new Date(doc.data.out),
      },
    }))
    .sort((a, b) => b.data.in.getTime() - a.data.in.getTime());
}

// Deletes a log.
export async function deleteLog(doc: Doc<Log>): Promise<void> {
  await delDoc<Log>({
    collection: "timesheet-logs",
    doc,
  });
}
