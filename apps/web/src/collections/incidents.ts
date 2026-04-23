import { createCollection, type Collection } from "@tanstack/react-db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { client, orpc } from "@/orpc/client";
import { getQueryClient } from "@/integrations/tanstack-query/root-provider";

type IncidentItem = Awaited<ReturnType<typeof client.incidents.listByOrg>>[number];

type IncidentCreateInput = Parameters<typeof client.incidents.create>[0];
type IncidentUpdateInput = Parameters<typeof client.incidents.update>[0];

const cache = new Map<string, Collection<IncidentItem>>();

export function getIncidentsCollection(orgId: string): Collection<IncidentItem> {
  const existing = cache.get(orgId);
  if (existing) return existing;

  const listOpts = orpc.incidents.listByOrg.queryOptions({
    input: { organizationId: orgId },
  });

  const collection = createCollection(
    queryCollectionOptions<IncidentItem>({
      queryKey: listOpts.queryKey,
      queryFn: () => client.incidents.listByOrg({ organizationId: orgId }),
      queryClient: getQueryClient(),
      getKey: (item) => item.id,
      onInsert: async ({ transaction }) => {
        const { modified } = transaction.mutations[0];
        await client.incidents.create(modified as unknown as IncidentCreateInput);
      },
      onUpdate: async ({ transaction }) => {
        const { original, modified } = transaction.mutations[0];
        const latestUpdate = modified.updates[0];
        await client.incidents.update({
          id: original.id,
          status: modified.status as IncidentUpdateInput["status"],
          message: latestUpdate?.message ?? "",
        });
      },
      onDelete: async ({ transaction }) => {
        const { original } = transaction.mutations[0];
        await client.incidents.delete({ id: original.id });
      },
    }),
  );

  cache.set(orgId, collection);
  return collection;
}
