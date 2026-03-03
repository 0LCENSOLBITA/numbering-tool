import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MetricCard } from "@/components/projects/MetricCard";
import { ProjectsTable } from "@/components/projects/ProjectsTable";
import { CreateProjectModal } from "@/components/projects/CreateProjectModal";
import { ImportProjectsModal } from "@/components/projects/ImportProjectsModal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderKanban, TrendingUp, Building2, Plus, Upload, PauseCircle, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ALL_FIELDS, type FieldKey, type ExportProfile } from "@/components/projects/ProjectExportFilters";

type ProjectStatus = "active" | "on_hold" | "completed";

interface Client {
  id: string;
  client_name: string;
  prefix: string;
}

interface Project {
  id: string;
  project_number: string;
  project_name: string;
  description: string | null;
  status: ProjectStatus;
  created_at: string;
  created_by: string;
  clients: Client;
}

export default function Index() {
  const { isAdmin } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [profiles, setProfiles] = useState<ExportProfile[]>([]);
  const [isTableLoading, setIsTableLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [statusFilters, setStatusFilters] = useState<string[]>(["active", "on_hold", "completed"]);
  const [createdByFilter, setCreatedByFilter] = useState("all");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [selectedFields, setSelectedFields] = useState<FieldKey[]>(["project_number", "client_name", "name", "status", "created_at"]);

  // Separate counts for metrics (not limited by 1000-row cap)
  const [totalProjectsCount, setTotalProjectsCount] = useState(0);
  const [activeProjectsCount, setActiveProjectsCount] = useState(0);
  const [onHoldProjectsCount, setOnHoldProjectsCount] = useState(0);
  const [completedProjectsCount, setCompletedProjectsCount] = useState(0);

  const fetchCounts = useCallback(async () => {
    const [{ count: total }, { count: active }, { count: onHold }, { count: completed }] = await Promise.all([
      supabase.from("projects").select("*", { count: "exact", head: true }),
      supabase.from("projects").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("projects").select("*", { count: "exact", head: true }).eq("status", "on_hold"),
      supabase.from("projects").select("*", { count: "exact", head: true }).eq("status", "completed"),
    ]);
    setTotalProjectsCount(total ?? 0);
    setActiveProjectsCount(active ?? 0);
    setOnHoldProjectsCount(onHold ?? 0);
    setCompletedProjectsCount(completed ?? 0);
  }, []);

  const fetchData = useCallback(async () => {
    setIsTableLoading(true);

    // Fetch clients & profiles
    const [{ data: clientsData }, { data: profilesData }] = await Promise.all([
      supabase.from("clients").select("id, client_name, prefix").order("client_name"),
      supabase.from("profiles").select("user_id, full_name, email").order("full_name"),
    ]);

    if (clientsData) setClients(clientsData);
    if (profilesData) setProfiles(profilesData);

    // Fetch ALL projects using pagination to bypass 1000-row limit
    let allProjects: Project[] = [];
    const PAGE = 1000;
    let from = 0;
    let keepFetching = true;

    while (keepFetching) {
      let query = supabase
        .from("projects")
        .select(`
          id,
          project_number,
          project_name,
          description,
          status,
          created_at,
          created_by,
          clients (id, client_name, prefix)
        `)
        .order("created_at", { ascending: false })
        .range(from, from + PAGE - 1);

      if (clientFilter !== "all") {
        query = query.eq("client_id", clientFilter);
      }

      if (statusFilters.length > 0 && statusFilters.length < 3) {
        query = query.in("status", statusFilters as any);
      }

      if (createdByFilter !== "all") {
        query = query.eq("created_by", createdByFilter);
      }

      if (startDate) {
        query = query.gte("created_at", startDate.toISOString());
      }

      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte("created_at", endOfDay.toISOString());
      }

      const { data } = await query;
      const batch = (data ?? []) as unknown as Project[];
      allProjects = allProjects.concat(batch);

      if (batch.length < PAGE) {
        keepFetching = false;
      } else {
        from += PAGE;
      }
    }

    let filtered = allProjects;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.project_number.toLowerCase().includes(term) ||
          p.project_name.toLowerCase().includes(term) ||
          p.clients.client_name.toLowerCase().includes(term)
      );
    }

    setProjects(filtered);
    setIsTableLoading(false);
  }, [clientFilter, statusFilters, createdByFilter, startDate, endDate, searchTerm]);

  useEffect(() => {
    fetchData();
    fetchCounts();
  }, [fetchData, fetchCounts]);

  const totalClients = clients.length;

  // Determine which metric to show based on status filter
  const getStatusMetric = () => {
    const isSingleStatus = statusFilters.length === 1;
    if (isSingleStatus && statusFilters[0] === "on_hold") {
      return { title: "On Hold Projects", value: onHoldProjectsCount, icon: <PauseCircle className="w-6 h-6" /> };
    }
    if (isSingleStatus && statusFilters[0] === "completed") {
      return { title: "Completed Projects", value: completedProjectsCount, icon: <CheckCircle2 className="w-6 h-6" /> };
    }
    return { title: "Active Projects", value: activeProjectsCount, icon: <TrendingUp className="w-6 h-6" /> };
  };

  const statusMetric = getStatusMetric();


  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Project Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage your projects and generate unique project numbers
          </p>
        </div>
        <div className="flex gap-3">
          {isAdmin && (
            <Button variant="outline" onClick={() => setShowImportModal(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Import Data
            </Button>
          )}
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Total Projects"
          value={totalProjectsCount}
          icon={<FolderKanban className="w-6 h-6" />}
          gradient="projects"
        />
        <MetricCard
          title={statusMetric.title}
          value={statusMetric.value}
          icon={statusMetric.icon}
          gradient="active"
        />
        <MetricCard
          title="Total Clients"
          value={totalClients}
          icon={<Building2 className="w-6 h-6" />}
          gradient="clients"
        />
      </div>

      {/* Projects Table */}
      <ProjectsTable
        projects={projects}
        clients={clients}
        profiles={profiles}
        isLoading={isTableLoading}
        onRefresh={() => fetchData()}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        clientFilter={clientFilter}
        onClientFilterChange={setClientFilter}
        statusFilters={statusFilters}
        onStatusFiltersChange={setStatusFilters}
        createdByFilter={createdByFilter}
        onCreatedByFilterChange={setCreatedByFilter}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
        selectedFields={selectedFields}
        onSelectedFieldsChange={setSelectedFields}
      />

      {/* Create Modal */}
      <CreateProjectModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={() => fetchData()}
      />

      <ImportProjectsModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        onSuccess={() => fetchData()}
      />
    </div>
  );
}
