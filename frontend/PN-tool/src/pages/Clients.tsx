import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CreateClientInlineModal } from "@/components/projects/CreateClientInlineModal";
import { EditClientModal } from "@/components/clients/EditClientModal";
import { ImportClientsModal } from "@/components/clients/ImportClientsModal";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Upload, Loader2 } from "lucide-react";

interface Client {
  id: string;
  client_name: string;
  prefix: string;
  created_at: string;
}

const PAGE_SIZE = 10;

export default function Clients() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchClients = useCallback(async () => {
    setIsLoading(true);
    const API_BASE = "http://159.203.21.199/api";

    try {
      const res = await fetch(`${API_BASE}/clients?limit=1000&skip=0`);
      const data = await res.json();
      const clientsData = data?.data ?? [];

      // Map API response to UI structure
      let filtered = clientsData.map((c: any) => ({
        id: c._id,
        client_name: c.name,
        prefix: c.prefix,
        created_at: c.createdAt,
      }));

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(
          (c) =>
            c.client_name.toLowerCase().includes(term) ||
            c.prefix.toLowerCase().includes(term)
        );
      }
      setClients(filtered);
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
    setIsLoading(false);
  }, [searchTerm]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleClientCreated = () => {
    fetchClients();
    setShowCreateModal(false);
    toast({ title: "Client created successfully" });
  };

  const handleDeleteClient = async () => {
    if (!deletingClient) return;
    setIsDeleting(true);
    const API_BASE = "http://159.203.21.199/api";

    try {
      const res = await fetch(`${API_BASE}/clients/${deletingClient.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json();
        toast({ 
          title: "Error deleting client", 
          description: errorData?.error || "Unknown error", 
          variant: "destructive" 
        });
      } else {
        toast({ title: "Client deleted successfully" });
        fetchClients();
      }
    } catch (error: any) {
      toast({
        title: "Error deleting client",
        description: error.message,
        variant: "destructive",
      });
    }

    setDeletingClient(null);
    setIsDeleting(false);
  };

  const totalPages = Math.max(1, Math.ceil(clients.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedClients = clients.slice(
    (safeCurrentPage - 1) * PAGE_SIZE,
    safeCurrentPage * PAGE_SIZE
  );

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Client Management</h1>
          <p className="text-muted-foreground mt-1">
            Create, edit, and manage clients
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button variant="outline" onClick={() => setShowImportModal(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
          )}
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Client
          </Button>
        </div>
      </div>

      {/* Clients Card */}
      <div className="rounded-xl bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Search className="w-5 h-5 text-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Client List</h2>
        </div>
        <Input
          placeholder="Search clients..."
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
        />

        <div className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Name</TableHead>
                <TableHead className="w-[20%]">Prefix</TableHead>
                <TableHead className="w-[20%]">Created</TableHead>
                {isAdmin && <TableHead className="w-[20%] text-center">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    {isAdmin && <TableCell><Skeleton className="h-4 w-20" /></TableCell>}
                  </TableRow>
                ))
              ) : paginatedClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 4 : 3} className="text-center py-8 text-muted-foreground">
                    No clients found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedClients.map((client) => (
                  <TableRow key={client.id} className="animate-fade-in">
                    <TableCell className="font-medium">{client.client_name}</TableCell>
                    <TableCell className="font-mono font-bold font-mono-project text-primary">
                      {client.prefix}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(client.created_at), "M/d/yyyy")}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="flex justify-center gap-3">
                          <button
                            className="text-sm text-muted-foreground hover:text-primary transition-colors"
                            onClick={() => setEditClient(client)}
                          >
                            Edit
                          </button>
                          <button
                            className="text-sm text-destructive hover:text-destructive/80 transition-colors"
                            onClick={() => setDeletingClient(client)}
                          >
                            Delete
                          </button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1 pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage <= 1}
              className="text-sm"
            >
              « Previous
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Button
                key={p}
                variant={p === safeCurrentPage ? "default" : "outline"}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setCurrentPage(p)}
              >
                {p}
              </Button>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage >= totalPages}
              className="text-sm"
            >
              Next »
            </Button>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <CreateClientInlineModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={handleClientCreated}
      />

      {/* Edit Modal */}
      <EditClientModal
        client={editClient}
        open={!!editClient}
        onOpenChange={(open) => !open && setEditClient(null)}
        onSuccess={fetchClients}
      />

      {/* Import Modal */}
      <ImportClientsModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        onSuccess={() => {
          fetchClients();
          setShowImportModal(false);
        }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingClient} onOpenChange={(open) => !open && setDeletingClient(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold">{deletingClient?.client_name}</span>? This will also delete all associated projects. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteClient}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
