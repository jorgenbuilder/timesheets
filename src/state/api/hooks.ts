import { QueryClient, useMutation, useQuery } from "react-query";
import { deleteLog, getLogs } from "./raw";
import { Doc } from "@junobuild/core";
import { Log } from "../models/timesheets";

export const queryClient = new QueryClient();

export function useLogsQuery() {
  return useQuery("logs", getLogs);
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
