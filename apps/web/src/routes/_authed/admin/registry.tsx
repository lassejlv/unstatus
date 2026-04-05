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
import { Search, Plus, Pencil, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authed/admin/registry")({
  component: AdminRegistryPage,
});

const CATEGORIES = [
  "hosting", "cdn", "database", "api", "devtools", "cloud", "payments", "communication", "auth",
] as const;

const STATUS_COLORS: Record<string, string> = {
  operational: "bg-green-500",
  degraded_performance: "bg-yellow-500",
  partial_outage: "bg-orange-500",
  major_outage: "bg-red-500",
  maintenance: "bg-blue-500",
};

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
  const { data: services } = useQuery(listOpts);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Registry Services</h1>
          <p className="text-sm text-muted-foreground">{services?.length ?? 0} services</p>
        </div>
        <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (v) setForm(emptyForm); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="size-4 mr-1" />Add Service</Button>
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
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search services..."
          className="pl-9"
        />
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2 text-left font-medium">Status</th>
              <th className="px-4 py-2 text-left font-medium">Name</th>
              <th className="px-4 py-2 text-left font-medium">Category</th>
              <th className="px-4 py-2 text-left font-medium">Parser</th>
              <th className="px-4 py-2 text-left font-medium">Active</th>
              <th className="px-4 py-2 text-left font-medium">Last Fetched</th>
              <th className="px-4 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {services?.map((service) => (
              <tr key={service.id} className="border-b hover:bg-muted/30">
                <td className="px-4 py-2.5">
                  <span className={`inline-block size-2 rounded-full ${STATUS_COLORS[service.currentStatus ?? ""] ?? "bg-gray-400"}`} />
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-col">
                    <span className="font-medium">{service.name}</span>
                    <span className="text-xs text-muted-foreground font-mono">{service.slug}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <Badge variant="outline" className="text-[10px]">{service.category}</Badge>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground text-xs">{service.parserType}</td>
                <td className="px-4 py-2.5">
                  {service.active ? (
                    <Badge variant="secondary" className="text-[10px]">Active</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">Inactive</Badge>
                  )}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground text-xs">
                  {service.lastFetchedAt
                    ? new Date(service.lastFetchedAt).toLocaleString()
                    : "Never"}
                  {service.lastFetchError && (
                    <p className="text-destructive truncate max-w-[150px]" title={service.lastFetchError}>
                      {service.lastFetchError}
                    </p>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">
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
                </td>
              </tr>
            ))}
            {services?.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No services found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
