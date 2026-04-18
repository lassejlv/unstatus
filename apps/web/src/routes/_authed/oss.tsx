import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { orpc, client } from "@/orpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Copy, Github } from "lucide-react";

export const Route = createFileRoute("/_authed/oss")({
  component: OssPage,
});

function OssPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <div>
        <Link
          to="/dashboard"
          search={{ tab: "overview" }}
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to dashboard
        </Link>
        <h1 className="text-lg font-semibold tracking-tight">OSS Program</h1>
        <p className="text-sm text-muted-foreground">
          Maintainers of active open-source projects get{" "}
          <strong className="text-foreground">6 months of the Scale plan on us</strong>.
          Submit your repo below and we'll review within a few days.
        </p>
      </div>

      <ApplyCard />
      <MyApplicationsSection />
    </div>
  );
}

function ApplyCard() {
  const qc = useQueryClient();

  const eligibleOrgsQuery = useQuery(orpc.oss.listEligibleOrgs.queryOptions());
  const orgs = eligibleOrgsQuery.data ?? [];

  const [organizationId, setOrganizationId] = useState<string>("");
  const [githubRepo, setGithubRepo] = useState("");
  const [reason, setReason] = useState("");
  const [website, setWebsite] = useState("");

  useEffect(() => {
    if (!organizationId && orgs.length > 0) {
      setOrganizationId(orgs[0].id);
    }
  }, [orgs, organizationId]);

  const apply = useMutation({
    mutationFn: () =>
      client.oss.apply({
        organizationId,
        githubRepo: githubRepo.trim(),
        reason: reason.trim(),
        website: website.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: orpc.oss.myApplications.queryOptions().queryKey,
      });
      toast.success("Application submitted");
      setGithubRepo("");
      setReason("");
      setWebsite("");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to submit application");
    },
  });

  if (eligibleOrgsQuery.isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (orgs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Apply for the OSS program</CardTitle>
          <CardDescription>
            You need to be an <strong>admin</strong> or <strong>owner</strong> of an
            organization to apply.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Create an organization first, then come back here.
          </p>
        </CardContent>
        <CardFooter className="border-t">
          <Button asChild size="sm" variant="outline">
            <Link to="/dashboard/settings" search={{ tab: "organizations" }}>
              Manage organizations
            </Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  const reasonLen = reason.trim().length;
  const repoValid = /^https?:\/\/github\.com\/[^/\s]+\/[^/\s]+\/?$/.test(
    githubRepo.trim(),
  );
  const canSubmit =
    !!organizationId
    && repoValid
    && reasonLen >= 20
    && !apply.isPending;

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Apply for the OSS program</CardTitle>
        <CardDescription>Tell us about your project.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Organization</Label>
          <Select value={organizationId} onValueChange={setOrganizationId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select an organization" />
            </SelectTrigger>
            <SelectContent>
              {orgs.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            The org that will receive the 6-month Scale grant.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>GitHub repository</Label>
          <Input
            value={githubRepo}
            onChange={(e) => setGithubRepo(e.target.value)}
            placeholder="https://github.com/owner/repo"
          />
          {githubRepo && !repoValid && (
            <p className="text-xs text-destructive">
              Must look like https://github.com/owner/repo
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Why does your project qualify?</Label>
          <Textarea
            rows={5}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="A few sentences about the project, its users, and why it needs Scale features."
          />
          <p className="text-xs text-muted-foreground">
            {reasonLen} / 2000 characters (min 20)
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>
            Website <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://your-project.dev"
          />
        </div>
      </CardContent>
      <CardFooter className="justify-end border-t">
        <Button
          size="sm"
          disabled={!canSubmit}
          onClick={() => apply.mutate()}
        >
          {apply.isPending ? "Submitting..." : "Submit application"}
        </Button>
      </CardFooter>
    </Card>
  );
}

function MyApplicationsSection() {
  const { data, isLoading } = useQuery(orpc.oss.myApplications.queryOptions());

  if (isLoading) {
    return <Skeleton className="h-20 w-full" />;
  }
  if (!data || data.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-medium">Your applications</h2>
      <div className="flex flex-col gap-3">
        {data.map((app) => (
          <ApplicationRow key={app.id} app={app} />
        ))}
      </div>
    </div>
  );
}

type ApplicationRowProps = {
  app: {
    id: string;
    status: string;
    githubRepo: string;
    website: string | null;
    createdAt: Date | string;
    reviewNotes: string | null;
    discountCode: string | null;
    discountExpiresAt: Date | string | null;
    organization: { id: string; name: string; slug: string };
  };
};

function ApplicationRow({ app }: ApplicationRowProps) {
  const submitted = new Date(app.createdAt).toLocaleDateString();
  const variant =
    app.status === "approved"
      ? "success"
      : app.status === "rejected"
        ? "destructive"
        : "warning";

  const handleCopy = () => {
    if (!app.discountCode) return;
    navigator.clipboard.writeText(app.discountCode);
    toast.success("Copied");
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium">
                {app.organization.name}
              </span>
              <Badge variant={variant}>{app.status}</Badge>
            </div>
            <a
              href={app.githubRepo}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 truncate text-xs text-muted-foreground hover:text-foreground"
            >
              <Github className="size-3" />
              {app.githubRepo}
            </a>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {submitted}
          </span>
        </div>

        {app.status === "approved" && app.discountCode && (
          <div className="rounded-md border bg-muted/30 p-3">
            <p className="mb-2 text-xs text-muted-foreground">Your discount code</p>
            <div className="flex items-center gap-2">
              <code className="rounded border bg-background px-2 py-1 font-mono text-sm font-semibold">
                {app.discountCode}
              </code>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2"
                onClick={handleCopy}
              >
                <Copy className="size-3.5" />
              </Button>
            </div>
            {app.discountExpiresAt && (
              <p className="mt-2 text-xs text-muted-foreground">
                Expires{" "}
                <strong className="text-foreground">
                  {new Date(app.discountExpiresAt).toLocaleDateString()}
                </strong>
                . Use it at{" "}
                <Link
                  to="/dashboard/billing"
                  className="underline hover:text-foreground"
                >
                  Billing
                </Link>{" "}
                to unlock 6 months of Scale.
              </p>
            )}
          </div>
        )}

        {app.status === "rejected" && app.reviewNotes && (
          <div className="rounded-md border bg-muted/30 p-3">
            <p className="mb-1 text-xs text-muted-foreground">Reviewer note</p>
            <p className="text-sm">{app.reviewNotes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
