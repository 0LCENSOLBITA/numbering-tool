import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { generateShortName, getDisplayName } from "@/lib/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock, Mail, User } from "lucide-react";
import { format } from "date-fns";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(6, "New password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type PasswordFormData = z.infer<typeof passwordSchema>;

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const displayName = getDisplayName(profile, user?.email);

  const handlePasswordChange = async (data: PasswordFormData) => {
    setIsLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user?.email || "",
      password: data.currentPassword,
    });

    if (signInError) {
      toast({
        title: "Incorrect password",
        description: "The current password you entered is incorrect.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: data.newPassword,
    });

    if (error) {
      toast({
        title: "Error updating password",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Password updated successfully" });
      form.reset();
    }

    setIsLoading(false);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account settings and password
        </p>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Information Card */}
        <div className="rounded-xl bg-card p-6 space-y-6">
          <h2 className="text-lg font-semibold text-foreground">Profile Information</h2>

          <div className="space-y-5">
            <div>
              <label className="text-sm text-muted-foreground flex items-center gap-1.5 mb-1">
                <User className="h-3.5 w-3.5" />
                Name
              </label>
              <p className="text-foreground font-medium">{displayName}</p>
            </div>

            <div>
              <label className="text-sm text-muted-foreground flex items-center gap-1.5 mb-1">
                <Mail className="h-3.5 w-3.5" />
                Email Address
              </label>
              <p className="text-foreground font-medium">{user?.email}</p>
            </div>

            <div>
              <label className="text-sm text-muted-foreground flex items-center gap-1.5 mb-1">
                <Lock className="h-3.5 w-3.5" />
                Member Since
              </label>
              <p className="text-foreground font-medium">
                {user?.created_at
                  ? format(new Date(user.created_at), "MMM d, yyyy")
                  : "Unknown"}
              </p>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="rounded-xl bg-card p-6 space-y-6">
          <h2 className="text-lg font-semibold text-foreground">Change Password</h2>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handlePasswordChange)} className="space-y-5">
              <FormField
                control={form.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Update Password
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
