import { useAuth } from "@/lib/auth";

export default function Profile() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
        <p className="text-muted-foreground mt-1">
          Profile management is currently disabled.
        </p>
      </div>

      <div className="rounded-xl bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Account</h2>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Email</p>
          <p className="font-medium">{user?.email || "Unknown user"}</p>
        </div>
      </div>
    </div>
  );
}