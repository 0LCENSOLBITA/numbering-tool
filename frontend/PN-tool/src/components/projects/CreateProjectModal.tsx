import { useState, useEffect, useRef } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, X } from "lucide-react";
import { CreateClientInlineModal } from "./CreateClientInlineModal";

interface Client {
  id: string;
  client_name: string;
  prefix: string;
}

const projectSchema = z.object({
  clientId: z.string().min(1, "Please select a client"),
  name: z.string().min(1, "Project name is required").max(200),
  description: z.string().max(1000).optional(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface CreateProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateProjectModal({ open, onOpenChange, onSuccess }: CreateProjectModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [projectNumber, setProjectNumber] = useState<string>("");
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingCreatedClientId, setPendingCreatedClientId] = useState<string | null>(null);

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: { clientId: "", name: "", description: "" },
  });

  const { isDirty } = form.formState;

  const selectedClientId = form.watch("clientId");

  useEffect(() => {
    if (open) {
      fetchClients();
      form.reset();
      setProjectNumber("");
      setPendingCreatedClientId(null);
    }
  }, [open]);

  useEffect(() => {
    if (selectedClientId) {
      generateProjectNumber(selectedClientId);
    } else {
      setProjectNumber("");
    }
  }, [selectedClientId]);

  const fetchClients = async () => {
    const { data } = await supabase
      .from("clients")
      .select("id, client_name, prefix")
      .order("client_name");
    
    if (data) {
      setClients(data);
    }
  };

  const generateProjectNumber = async (clientId: string) => {
    const { data, error } = await supabase.rpc("generate_project_number", {
      _client_id: clientId,
    });

    if (!error && data) {
      setProjectNumber(data);
    }
  };

  const handleSubmit = async (data: ProjectFormData) => {
    if (!user || !projectNumber) return;

    setIsLoading(true);

    const { error } = await supabase.from("projects").insert({
      project_number: projectNumber,
      client_id: data.clientId,
      project_name: data.name,
      description: data.description || null,
      created_by: user.id,
    });

    if (error) {
      toast({
        title: "Error creating project",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Project created successfully" });
      setPendingCreatedClientId(null); // Clear since project was saved
      onSuccess();
      onOpenChange(false);
    }

    setIsLoading(false);
  };

  const handleClientCreated = (newClient: Client) => {
    // First update the clients list
    setClients((prev) => [...prev, newClient].sort((a, b) => a.client_name.localeCompare(b.client_name)));
    setPendingCreatedClientId(newClient.id);
    setShowCreateClient(false);
    
    // Use setTimeout to ensure state updates have been applied before setting form value
    setTimeout(() => {
      form.setValue("clientId", newClient.id, { shouldDirty: true, shouldValidate: true });
      generateProjectNumber(newClient.id);
    }, 0);
  };

  const hasUnsavedChanges = isDirty || pendingCreatedClientId !== null;

  const handleCloseAttempt = (newOpen: boolean) => {
    if (!newOpen && hasUnsavedChanges) {
      setShowUnsavedDialog(true);
    } else {
      onOpenChange(newOpen);
    }
  };

  const handleLeave = async () => {
    // Delete the pending client if it was created but project not saved
    if (pendingCreatedClientId) {
      await supabase.from("clients").delete().eq("id", pendingCreatedClientId);
    }
    setShowUnsavedDialog(false);
    setPendingCreatedClientId(null);
    onOpenChange(false);
  };

  const handleSaveChanges = () => {
    setShowUnsavedDialog(false);
    form.handleSubmit(handleSubmit)();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleCloseAttempt}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Select a client to generate a unique project number.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <div className="flex gap-2">
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select a client" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clients.length === 0 ? (
                            <div className="py-6 text-center text-sm text-muted-foreground/60">
                              No clients to display
                            </div>
                          ) : (
                            clients.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.client_name} ({client.prefix})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setShowCreateClient(true)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {projectNumber && (
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground mb-1">Project Number</p>
                  <p className="text-2xl font-mono font-bold text-primary font-mono-project">
                    {projectNumber}
                  </p>
                </div>
              )}

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Enter project name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter project description"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading || !projectNumber}>
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Project
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <CreateClientInlineModal
        open={showCreateClient}
        onOpenChange={setShowCreateClient}
        onSuccess={handleClientCreated}
      />

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
            <Button size="sm" onClick={handleSaveChanges} disabled={!projectNumber}>
              Keep Editing
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
