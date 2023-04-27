import { QueryClient, useMutation, useQuery } from "react-query";
import {
  createActiveTimer,
  deleteLog,
  endActiveTimer,
  getActiveTimer,
  getLogs,
} from "./raw";
import { Doc } from "@junobuild/core";
import { ActiveTimer, Log } from "../models/timesheets";
import { useStore } from "../stores/timers";
import { setActiveTimerLabel } from "./raw";

export const queryClient = new QueryClient();

export function useLogsQuery() {
  return useQuery("logs", getLogs, {
    staleTime: 1000 * 10,
    refetchOnMount: false,
  });
}

export function useActiveTimerQuery() {
  return useQuery("activeTimer", getActiveTimer);
}

export function useStartTimerMutation() {
  return useMutation({
    mutationFn: createActiveTimer,

    // Using onMutate to provide optimistic updates.
    onMutate() {
      queryClient.cancelQueries("activeTimer");

      // Optimistically add a blank timer record to zustand and the query cache.
      queryClient.setQueryData<ActiveTimer>("activeTimer", {
        in: new Date(),
        label: "",
      });
      useStore.setState({ state: { running: { in: new Date(), label: "" } } });
    },

    onSuccess(timer) {
      // Replace the optimistic timer with the real one.
      queryClient.setQueryData("activeTimer", timer);

      // Update zustand with the real timer, keeping any changes made while fetching.
      const { state } = useStore.getState();
      if (!("running" in state)) return; // We've left the running state, nothing to do.
      const {
        running: { label },
      } = state;
      if (!label || label === timer.label) return;
      useStore.setState({ state: { running: { ...timer, label } } });
      setActiveTimerLabel(label); // Update the label on the server.
    },

    onError(err) {
      console.error("Error creating timer", err);
      queryClient.invalidateQueries("activeTimer");
      useStore.setState({ state: { idle: null } });
    },
  });
}

export function useEndTimerMutation() {
  return useMutation({
    mutationFn: endActiveTimer,

    // Using onMutate to provide optimistic updates.
    onMutate() {
      queryClient.cancelQueries("activeTimer");
      queryClient.cancelQueries("logs");

      const { state } = useStore.getState();
      if (!("running" in state)) throw new Error("No active timer to end.");
      const { running: timer } = state;

      // Optimistically remove the timer from zustand and the query cache.
      queryClient.setQueryData("activeTimer", null);
      useStore.setState({ state: { idle: null } });

      // Optimistically add a new log to the query cache.
      const logs = queryClient.getQueryData<Doc<Log>[]>("logs");
      const newLog: Doc<Log> = {
        key: "new",
        data: { ...timer, out: new Date() },
      };
      queryClient.setQueryData("logs", [newLog, ...(logs ?? [])]);

      return { timer };
    },

    onSuccess(log) {
      // Replace the optimistic log with the real one.
      const logs = queryClient.getQueryData<Doc<Log>[]>("logs");
      const update = logs?.map((l) => (l.key === "new" ? log : l));
      queryClient.setQueryData("logs", update);
    },

    onError(err, _, context) {
      console.error("Error ending timer", err);
      queryClient.invalidateQueries("activeTimer");
      queryClient.invalidateQueries("logs");
      if (!context?.timer)
        throw new Error("No timer object to recover in failure.");
      useStore.setState({ state: { running: context.timer } });
    },
  });
}

export function useDeleteLog() {
  return useMutation({
    mutationFn: deleteLog,

    // Using onMutate to provide optimistic updates.
    async onMutate(deletingLog) {
      await queryClient.cancelQueries("logs");
      const existingLogs = queryClient.getQueryData<Doc<Log>[]>("logs");
      const updatedLogs = existingLogs?.filter(
        (log) => log.key !== deletingLog.key
      );
      queryClient.setQueryData("logs", updatedLogs);
      return { deletingLog, existingLogs };
    },

    // Rollback optimistic updates if a failure occurs.
    onError(err, deletingLog, context) {
      console.error(`Error deleting log ${deletingLog.key}`, err);
      queryClient.setQueryData("logs", context?.existingLogs);
    },

    // Always refetch after error or success.
    onSettled() {
      queryClient.invalidateQueries("logs");
    },
  });
}
