import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { client } from "@/orpc/client";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import z from "zod";

const searchSchema = z.object({
  token: z.string(),
  action: z.enum(["verify", "unsubscribe"]).default("verify"),
});

export const Route = createFileRoute("/status/$slug/verify")({
  validateSearch: searchSchema,
  component: VerifyPage,
});

function VerifyPage() {
  const { token, action } = Route.useSearch();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        if (action === "unsubscribe") {
          await client.publicStatus.unsubscribe({ token });
          setMessage("You have been unsubscribed from status updates.");
        } else {
          await client.publicStatus.verifySubscription({ token });
          setMessage("Your email has been verified. You will now receive status updates.");
        }
        setStatus("success");
      } catch {
        setMessage("This link is invalid or has already been used.");
        setStatus("error");
      }
    };
    run();
  }, [token, action]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            {status === "loading" ? "Processing..." : status === "success" ? (action === "unsubscribe" ? "Unsubscribed" : "Verified") : "Error"}
          </CardTitle>
          <CardDescription>
            {status === "loading" ? (
              <Spinner className="size-4" />
            ) : (
              message
            )}
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
