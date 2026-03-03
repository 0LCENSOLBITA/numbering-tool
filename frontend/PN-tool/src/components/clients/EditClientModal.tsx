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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle } from "lucide-react";

interface Client {
  id: string;
  client_name: string;
  prefix: string;
}

const clientSchema = z.object({
  name: z.string().min(1, "Client name is required").max(100),
  prefix: z
    .string()
    .min(2, "Prefix must be at least 2 characters")
    .max(10, "Prefix must be 10 characters or less")
    .regex(/^[A-Z0-9/]+$/, "Prefix must be uppercase letters, numbers, or / only"),
});

type ClientFormData = z.infer<typeof clientSchema>;

interface EditClientModalProps {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditClientModal({
  client,
  open,
  onOpenChange,
  onSuccess,
}: EditClientModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [projectCount, setProjectCount] = useState(0);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: { name: "", prefix: "" },
  });

  const currentPrefix = form.watch("prefix");
  const prefixChanged = client && currentPrefix !== client.prefix;

  useEffect(() => {
    if (client && open) {
      form.reset({
        name: client.client_name,
        prefix: client.prefix,
      });
      
      // Fetch project count for this client
      supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("client_id", client.id)
        .then(({ count }) => {
          setProjectCount(count || 0);
        });
    }
  }, [client, open]);

  const handleSubmit = async (data: ClientFormData) => {
    if (!client) return;

    setIsLoading(true);

    const { error } = await supabase
      .from("clients")
      .update({
        client_name: data.name,
        prefix: data.prefix.toUpperCase(),
      })
      .eq("id", client.id);

    if (error) {
      if (error.message.includes("unique")) {
        toast({
          title: "Prefix already exists",
          description: "Please choose a different prefix.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error updating client",
          description: error.message,
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Client updated successfully",
        description: prefixChanged
          ? `All ${projectCount} project numbers have been updated.`
          : undefined,
      });
      onSuccess();
      onOpenChange(false);
    }

    setIsLoading(false);
  };

  if (!client) return null;

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && form.formState.isDirty) {
      setShowUnsavedDialog(true);
      return;
    }
    onOpenChange(newOpen);
  };

  const handleLeave = () => {
    setShowUnsavedDialog(false);
    form.reset();
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription>
              Update client details. Changing the prefix will update all existing project numbers.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Corporation" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="prefix"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Prefix <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input
                        placeholder="ACME"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        className="font-mono uppercase"
                      />
                    </FormControl>
                    <FormDescription>
                      Used in project numbers (e.g., {field.value || "ACME"}-0001)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {prefixChanged && projectCount > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Changing the prefix will update {projectCount} existing project
                    number{projectCount !== 1 ? "s" : ""} from{" "}
                    <span className="font-mono font-bold">{client.prefix}-XXXX</span> to{" "}
                    <span className="font-mono font-bold">{currentPrefix}-XXXX</span>.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
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
        <AlertDialogContent className="z-[100]">
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave this page?
              <br />
              Changes you made will not be saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              size="sm"
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={handleLeave}
            >
              Leave
            </Button>
            <Button size="sm" onClick={() => setShowUnsavedDialog(false)}>
              Keep Editing
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
