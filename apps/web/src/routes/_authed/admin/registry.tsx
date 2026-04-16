import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orpc, client } from "@/orpc/client";
import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { StatusDot } from "@/components/ui/status-dot";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authed/admin/registry")({
  component: AdminRegistryPage,
});

const CATEGORIES = [
  "hosting", "cdn", "database", "api", "devtools", "cloud", "payments", "communication", "auth",
] as const;

type ServiceForm = {
  name: string;
  slug: string;
  category: string;
  website: string;
  logoUrl: string;
  statusPageUrl: string;
  statusPageApiUrl: string;
  parserType: string;
  pollInterval: string;
  active: boolean;
};

const emptyForm: ServiceForm = {
  name: "",
  slug: "",
  category: "api",
  website: "",
  logoUrl: "",
  statusPageUrl: "",
  statusPageApiUrl: "",
  parserType: "atlassian",
  pollInterval: "300",
  active: true,
};

function AdminRegistryPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceForm>(emptyForm);

  const listOpts = orpc.admin.listRegistryServices.queryOptions({
    input: { search: search || undefined },
  });
  const { data: services, isLoading } = useQuery(listOpts);

  const createService = useMutation({
    mutationFn: (data: ServiceForm) =>
      client.admin.createRegistryService({
        ...data,
        website: data.website || undefined,
        logoUrl: data.logoUrl || undefined,
        statusPageUrl: data.statusPageUrl || undefined,
        statusPageApiUrl: data.statusPageApiUrl || undefined,
        pollInterval: Number(data.pollInterval),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: listOpts.queryKey });
      setCreateOpen(false);
      setForm(emptyForm);
      toast.success("Service created");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateService = useMutation({
    mutationFn: (data: ServiceForm & { id: string }) =>
      client.admin.updateRegistryService({
        id: data.id,
        name: data.name,
        slug: data.slug,
        category: data.category,
        website: data.website || undefined,
        logoUrl: data.logoUrl || undefined,
        statusPageUrl: data.statusPageUrl || undefined,
        statusPageApiUrl: data.statusPageApiUrl || undefined,
        parserType: data.parserType,
        pollInterval: Number(data.pollInterval),
        active: data.active,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: listOpts.queryKey });
      setEditId(null);
      toast.success("Service updated");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteService = useMutation({
    mutationFn: (id: string) => client.admin.deleteRegistryService({ id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: listOpts.queryKey });
      toast.success("Service deleted");
    },
    onError: (err) => toast.error(err.message),
  });

  function openEdit(service: NonNullable<typeof services>[number]) {
    setForm({
      name: service.name,
      slug: service.slug,
      category: service.category,
      website: service.website ?? "",
      logoUrl: service.logoUrl ?? "",
      statusPageUrl: service.statusPageUrl ?? "",
      statusPageApiUrl: service.statusPageApiUrl ?? "",
      parserType: service.parserType,
      pollInterval: service.pollInterval.toString(),
      active: service.active,
    });
    setEditId(service.id);
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <PageHeader
        title="Registry Services"
        description={`${services?.length ?? 0} services`}
      >
        <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (v) setForm(emptyForm); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-1 size-4" />Add Service</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Registry Service</DialogTitle></DialogHeader>
            <ServiceFormFields form={form} setForm={setForm} />
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button disabled={!form.name || !form.slug || createService.isPending} onClick={() => createService.mutate(form)}>
                {createService.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <SearchInput
        value={search}
        onValueChange={setSearch}
        placeholder="Search services..."
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>Status</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Parser</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Last Fetched</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  <TableCell><Skeleton className="size-5 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="ml-auto h-5 w-16" /></TableCell>
                </TableRow>
              ))
            ) : services?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No services found.
                </TableCell>
              </TableRow>
            ) : (
              services?.map((service) => (
                <TableRow key={service.id}>
                  <TableCell>
                    <StatusDot
                      status={service.currentStatus as "operational" | "degraded_performance" | "partial_outage" | "major_outage" | "maintenance" | undefined}
                      size="sm"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{service.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">{service.slug}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{service.category}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{service.parserType}</TableCell>
                  <TableCell>
                    {service.active ? (
                      <Badge variant="secondary">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {service.lastFetchedAt
                      ? new Date(service.lastFetchedAt).toLocaleString()
                      : "Never"}
                    {service.lastFetchError && (
                      <p className="max-w-[150px] truncate text-destructive" title={service.lastFetchError}>
                        {service.lastFetchError}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => openEdit(service)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive hover:text-destructive">
                            <Trash2 className="size-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete service?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete "{service.name}" and all its status history.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteService.mutate(service.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editId} onOpenChange={(v) => { if (!v) setEditId(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Registry Service</DialogTitle></DialogHeader>
          <ServiceFormFields form={form} setForm={setForm} />
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button
              disabled={!form.name || !form.slug || updateService.isPending}
              onClick={() => editId && updateService.mutate({ ...form, id: editId })}
            >
              {updateService.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ServiceFormFields({
  form,
  setForm,
}: {
  form: ServiceForm;
  setForm: (f: ServiceForm) => void;
}) {
  const set = (key: keyof ServiceForm, value: string | boolean) =>
    setForm({ ...form, [key]: value });

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Name</Label>
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} className="h-8 text-xs" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Slug</Label>
          <Input value={form.slug} onChange={(e) => set("slug", e.target.value)} className="h-8 text-xs font-mono" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Category</Label>
          <Select value={form.category} onValueChange={(v) => set("category", v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Parser Type</Label>
          <Select value={form.parserType} onValueChange={(v) => set("parserType", v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="atlassian">Atlassian</SelectItem>
              <SelectItem value="custom_json">Custom JSON</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Website</Label>
        <Input value={form.website} onChange={(e) => set("website", e.target.value)} className="h-8 text-xs" placeholder="https://example.com" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Logo URL</Label>
        <Input value={form.logoUrl} onChange={(e) => set("logoUrl", e.target.value)} className="h-8 text-xs" placeholder="https://..." />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Status Page URL</Label>
        <Input value={form.statusPageUrl} onChange={(e) => set("statusPageUrl", e.target.value)} className="h-8 text-xs" placeholder="https://status.example.com" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Status Page API URL</Label>
        <Input value={form.statusPageApiUrl} onChange={(e) => set("statusPageApiUrl", e.target.value)} className="h-8 text-xs" placeholder="https://status.example.com/api/v2/summary.json" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Poll Interval (seconds)</Label>
          <Input type="number" value={form.pollInterval} onChange={(e) => set("pollInterval", e.target.value)} className="h-8 text-xs" />
        </div>
        <div className="flex items-center gap-2 pt-5">
          <Switch checked={form.active} onCheckedChange={(v) => set("active", v)} />
          <Label className="text-xs">Active</Label>
        </div>
      </div>
    </div>
  );
}
