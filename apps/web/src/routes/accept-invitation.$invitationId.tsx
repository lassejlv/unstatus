import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/session";

export const Route = createFileRoute("/accept-invitation/$invitationId")({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) {
      // User needs to log in first — they'll be redirected back after login
      throw Route.redirect({
        to: "/login",
      });
    }
  },
  component: AcceptInvitationPage,
});

function AcceptInvitationPage() {
  const { invitationId } = Route.useParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(true);

  useEffect(() => {
    authClient.organization
      .acceptInvitation({ invitationId })
      .then(() => {
        navigate({ to: "/dashboard", search: { tab: "overview" } });
      })
      .catch((err: any) => {
        setError(err?.message || "Failed to accept invitation. It may have expired or already been used.");
        setAccepting(false);
      });
  }, [invitationId, navigate]);

  if (accepting && !error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="size-5" />
          <p className="text-sm text-muted-foreground">Accepting invitation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Invitation failed</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full"
            onClick={() => navigate({ to: "/dashboard", search: { tab: "overview" } })}
          >
            Go to dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
