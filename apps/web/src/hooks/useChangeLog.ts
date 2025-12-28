import { useQuery } from "@tanstack/react-query";
import { changeLogApi } from "@/lib/api";
import { ChangeLogEntry } from "@/types";

export function useChangeLog(params?: {
  change_type?: string;
  item_type?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["changelog", params],
    queryFn: async () => {
      const response = await changeLogApi.list(params);
      return response.data.data as ChangeLogEntry[];
    },
  });
}
