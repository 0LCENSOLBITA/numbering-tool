import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const editUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["admin", "user"]),
  newPassword: z.string().optional(),
  confirmPassword: z.string().optional(),
}).refine((data) => {
  if (data.newPassword && data.newPassword !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
}).refine((data) => {
  if (data.newPassword && data.newPassword.length < 6) {
    return false;
  }
  return true;
}, {
  message: "Password must be at least 6 characters",
  path: ["newPassword"],
});

type EditUserFormData = z.infer<typeof editUserSchema>;

interface EditUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  user: {
    id: string;
    user_id: string;
    email: string;
    full_name: string | null;
    first_name: string | null;
    last_name: string | null;
    role: "admin" | "user";
  } | null;
}

export function EditUserModal({ open, onOpenChange, onSuccess, user }: EditUserModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);

  const form = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: { name: "", email: "", role: "user", newPassword: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (user && open) {
      form.reset({
        name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || "",
        email: user.email,
        role: user.role,
        newPassword: "",
        confirmPassword: "",
      });
    }
  }, [user, open, form]);

  const handleSubmit = async (data: EditUserFormData) => {
    if (!user) return;
    setIsLoading(true);

    const fullName = data.name.trim();
    const nameParts = fullName.split(' ').filter(Boolean);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    const shortName = `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase() || firstName[0]?.toUpperCase() || '?';
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        first_name: firstName,
        last_name: lastName || null,
        full_name: fullName,
        short_name: shortName,
      })
      .eq("user_id", user.user_id);

    if (profileError) {
      toast({
        title: "Error updating user",
        description: profileError.message,
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Try update first, then insert if no row existed
    const { data: existingRole } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", user.user_id)
      .maybeSingle();

    let roleError;
    if (existingRole) {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: data.role })
        .eq("user_id", user.user_id);
      roleError = error;
    } else {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: user.user_id, role: data.role });
      roleError = error;
    }

    if (roleError) {
      toast({
        title: "Error updating role",
        description: roleError.message,
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Handle email and/or password change via edge function
    const emailChanged = data.email.trim() !== user.email;
    if (emailChanged || data.newPassword) {
      const body: Record<string, string> = { user_id: user.user_id };
      if (emailChanged) body.email = data.email.trim();
      if (data.newPassword) body.password = data.newPassword;

      const { error: authError } = await supabase.functions.invoke("admin-update-user", { body });

      if (authError) {
        toast({
          title: "Error updating user",
          description: authError.message,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Also update email in profiles table
      if (emailChanged) {
        await supabase.from("profiles").update({ email: data.email.trim() }).eq("user_id", user.user_id);
      }
    }

    toast({ title: "User updated successfully" });
    onSuccess();
    onOpenChange(false);
    setIsLoading(false);
  };

  const { isDirty } = form.formState;

  const handleCloseAttempt = (newOpen: boolean) => {
    if (!newOpen && isDirty) {
      setShowUnsavedDialog(true);
    } else {
      onOpenChange(newOpen);
    }
  };

  const handleLeave = () => {
    setShowUnsavedDialog(false);
    form.reset();
    onOpenChange(false);
  };

  const handleKeepEditing = () => {
    setShowUnsavedDialog(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleCloseAttempt}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="user@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              <p className="text-sm text-muted-foreground">Change Password (optional)</p>

              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Leave blank to keep current" {...field} />
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

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { form.reset(); onOpenChange(false); }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave this page?
              <br />
              Changes you made will not be saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2 sm:gap-0">
            <Button size="sm" variant="outline" className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={handleLeave}>
              Leave
            </Button>
            <Button size="sm" onClick={handleKeepEditing}>
              Keep Editing
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
