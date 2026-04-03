import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
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
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authed/account")({
  component: AccountPage,
});

function AccountPage() {
  const { data: session } = authClient.useSession();
  const user = session?.user;

  if (!user) return null;

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
        <h1 className="text-lg font-semibold tracking-tight">Account</h1>
        <p className="text-sm text-muted-foreground">
          Manage your personal account settings.
        </p>
      </div>

      <ProfileSection user={user} />
      <DangerZone user={user} />
    </div>
  );
}

function ProfileSection({
  user,
}: {
  user: { id: string; name: string; email: string; image?: string | null };
}) {
  const [name, setName] = useState(user.name);
  const [saving, setSaving] = useState(false);

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Profile</CardTitle>
        <CardDescription>Your personal information.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Avatar size="lg">
            {user.image && <AvatarImage src={user.image} />}
            <AvatarFallback>{user.name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Email</Label>
          <Input value={user.email} disabled />
          <p className="text-[11px] text-muted-foreground">
            Email cannot be changed for OAuth accounts.
          </p>
        </div>
      </CardContent>
      <CardFooter className="justify-end border-t">
        <Button
          size="sm"
          disabled={saving || name === user.name || !name}
          onClick={async () => {
            setSaving(true);
            try {
              await authClient.updateUser({ name });
              toast.success("Profile updated");
            } catch (err: any) {
              toast.error(err.message || "Failed to update profile");
            } finally {
              setSaving(false);
            }
          }}
        >
          Save changes
        </Button>
      </CardFooter>
    </Card>
  );
}

function DangerZone({
  user,
}: {
  user: { email: string };
}) {
  const navigate = useNavigate();
  const [confirmEmail, setConfirmEmail] = useState("");
  const [deleting, setDeleting] = useState(false);

  const emailMatches = confirmEmail.toLowerCase() === user.email.toLowerCase();

  return (
    <Card className="border-destructive/30">
      <CardHeader className="border-b">
        <CardTitle className="text-destructive">Danger zone</CardTitle>
        <CardDescription>
          Permanently delete your account and all associated data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">Delete account</span>
            <span className="text-xs text-muted-foreground">
              This will permanently delete your account, all organizations you own, and their data.
            </span>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                Delete account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete your account, your personal organization,
                  and all organizations you own — including their monitors, status pages,
                  incidents, and subscribers. Active subscriptions will be cancelled.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex flex-col gap-1.5 px-6">
                <Label className="text-sm">
                  Type <span className="font-mono font-semibold">{user.email}</span> to confirm
                </Label>
                <Input
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  placeholder={user.email}
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setConfirmEmail("")}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={!emailMatches || deleting}
                  onClick={async (e) => {
                    e.preventDefault();
                    setDeleting(true);
                    try {
                      await authClient.deleteUser();
                      toast.success("Account deleted");
                      navigate({ to: "/" });
                    } catch (err: any) {
                      toast.error(err.message || "Failed to delete account");
                      setDeleting(false);
                    }
                  }}
                >
                  {deleting ? "Deleting..." : "Delete my account"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
