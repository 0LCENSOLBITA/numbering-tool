import { useState, useEffect, useCallback } from "react";
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
    const API_BASE = "http://159.203.21.199/api";
    try {
      const [totalRes, activeRes, onHoldRes, completedRes] = await Promise.all([
        fetch(`${API_BASE}/projects?limit=1&skip=0`),
        fetch(`${API_BASE}/projects?status=active&limit=1&skip=0`),
        fetch(`${API_BASE}/projects?status=on_hold&limit=1&skip=0`),
        fetch(`${API_BASE}/projects?status=completed&limit=1&skip=0`),
      ]);

      const totalData = await totalRes.json();
      const activeData = await activeRes.json();
      const onHoldData = await onHoldRes.json();
      const completedData = await completedRes.json();

      setTotalProjectsCount(totalData?.pagination?.total ?? 0);
      setActiveProjectsCount(activeData?.pagination?.total ?? 0);
      setOnHoldProjectsCount(onHoldData?.pagination?.total ?? 0);
      setCompletedProjectsCount(completedData?.pagination?.total ?? 0);
    } catch (error) {
      console.error("Error fetching project counts:", error);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setIsTableLoading(true);
    const API_BASE = "http://159.203.21.199/api";

    try {
      // Fetch clients & profiles
      const [clientsRes, profilesRes] = await Promise.all([
        fetch(`${API_BASE}/clients?limit=1000&skip=0`),
        fetch(`${API_BASE}/users?limit=1000&skip=0`),
      ]);

      const clientsDataRes = await clientsRes.json();
      const profilesDataRes = await profilesRes.json();

      const clientsData = clientsDataRes?.data ?? [];
      const profilesData = profilesDataRes?.data ?? [];

      // Map API response to UI structure
      const mappedClients = clientsData.map((c: any) => ({
        id: c._id,
        client_name: c.name,
        prefix: c.prefix,
      }));

      const mappedProfiles = profilesData.map((p: any) => ({
        user_id: p._id,
        full_name: p.display_name || p.first_name,
        email: p.email,
      }));

      setClients(mappedClients);
      setProfiles(mappedProfiles);

      // Fetch ALL projects using pagination
      let allProjects: Project[] = [];
      const PAGE = 100;
      let skip = 0;
      let keepFetching = true;

      while (keepFetching) {
        // Build query parameters
        const params = new URLSearchParams();
        params.append("limit", PAGE.toString());
        params.append("skip", skip.toString());

        if (clientFilter !== "all") {
          params.append("client_id", clientFilter);
        }

        if (statusFilters.length > 0 && statusFilters.length < 3) {
          params.append("status", statusFilters[0]);
        }

        // Note: created_by filtering would need API support
        // if (createdByFilter !== "all") {
        //   params.append("created_by", createdByFilter);
        // }

        const url = `${API_BASE}/projects?${params.toString()}`;
        const res = await fetch(url);
        const projectsDataRes = await res.json();
        const projectsData = projectsDataRes?.data ?? [];

        // Map API response to UI structure
        const batch = projectsData.map((p: any) => ({
          id: p._id,
          project_number: p.project_number,
          project_name: p.name,
          description: p.description,
          status: p.status,
          created_at: p.createdAt,
          created_by: p.created_by instanceof Object ? p.created_by._id : p.created_by,
          clients: {
            id: p.client_id instanceof Object ? p.client_id._id : p.client_id,
            client_name: p.client_id instanceof Object ? p.client_id.name : "",
            prefix: p.client_id instanceof Object ? p.client_id.prefix : "",
          },
        }));

        allProjects = allProjects.concat(batch);

        if (batch.length < PAGE) {
          keepFetching = false;
        } else {
          skip += PAGE;
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
    } catch (error) {
      console.error("Error fetching data:", error);
    }

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
