import { createCollection, type Collection } from "@tanstack/react-db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { client, orpc } from "@/orpc/client";
import { getQueryClient } from "@/integrations/tanstack-query/root-provider";

type MonitorItem = Awaited<ReturnType<typeof client.monitors.list>>[number];

type MonitorCreateInput = Parameters<typeof client.monitors.create>[0];
type MonitorUpdateInput = Parameters<typeof client.monitors.update>[0];
type MonitorUpdateChanges = Omit<MonitorUpdateInput, "id">;

const cache = new Map<string, Collection<MonitorItem>>();

export function getMonitorsCollection(orgId: string): Collection<MonitorItem> {
  const existing = cache.get(orgId);
  if (existing) return existing;

  const listOpts = orpc.monitors.list.queryOptions({
    input: { organizationId: orgId },
  });

  const collection = createCollection(
    queryCollectionOptions<MonitorItem>({
      queryKey: listOpts.queryKey,
      queryFn: () => client.monitors.list({ organizationId: orgId }),
      queryClient: getQueryClient(),
      getKey: (item) => item.id,
      onInsert: async ({ transaction }) => {
        const { modified } = transaction.mutations[0];
        await client.monitors.create(modified as unknown as MonitorCreateInput);
      },
      onUpdate: async ({ transaction }) => {
        const { original, changes } = transaction.mutations[0];
        await client.monitors.update({
          id: original.id,
          ...(changes as MonitorUpdateChanges),
        });
      },
      onDelete: async ({ transaction }) => {
        const { original } = transaction.mutations[0];
        await client.monitors.delete({ id: original.id });
      },
    }),
  );

  cache.set(orgId, collection);
  return collection;
}
