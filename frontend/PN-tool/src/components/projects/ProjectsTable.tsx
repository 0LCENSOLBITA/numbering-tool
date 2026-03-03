import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfYear } from "date-fns";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";
import { EditProjectModal } from "./EditProjectModal";
import { ALL_FIELDS, type FieldKey, type ExportProfile } from "./ProjectExportFilters";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Download, FileText, FileSpreadsheet, Loader2, CalendarIcon, SlidersHorizontal, Columns3 } from "lucide-react";
import { DeleteProjectDialog } from "./DeleteProjectDialog";
import { toast } from "sonner";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

const DATE_PRESETS = [
  { label: "Last 7 days", getValue: () => ({ start: subDays(new Date(), 7), end: new Date() }) },
  { label: "Last 30 days", getValue: () => ({ start: subDays(new Date(), 30), end: new Date() }) },
  { label: "This Month", getValue: () => ({ start: startOfMonth(new Date()), end: new Date() }) },
  { label: "Last Month", getValue: () => ({ start: startOfMonth(subMonths(new Date(), 1)), end: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: "Year to Date", getValue: () => ({ start: startOfYear(new Date()), end: new Date() }) },
];

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

interface ProjectsTableProps {
  projects: Project[];
  clients: Client[];
  profiles: ExportProfile[];
  isLoading?: boolean;
  onRefresh: () => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  clientFilter: string;
  onClientFilterChange: (value: string) => void;
  statusFilters: string[];
  onStatusFiltersChange: (value: string[]) => void;
  createdByFilter: string;
  onCreatedByFilterChange: (value: string) => void;
  startDate: Date | undefined;
  onStartDateChange: (date: Date | undefined) => void;
  endDate: Date | undefined;
  onEndDateChange: (date: Date | undefined) => void;
  selectedFields: FieldKey[];
  onSelectedFieldsChange: (fields: FieldKey[]) => void;
}

const PAGE_SIZE_OPTIONS = [10, 30, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 10;

// Map field keys to table column config
const COLUMN_MAP: Record<FieldKey, { header: string; className?: string }> = {
  project_number: { header: "Project #" },
  client_name: { header: "Client" },
  client_prefix: { header: "Client Prefix" },
  name: { header: "Project Name" },
  description: { header: "Description" },
  status: { header: "Status" },
  created_at: { header: "Created" },
  created_by_name: { header: "Created By" },
};

export function ProjectsTable({
  projects,
  clients,
  profiles,
  isLoading,
  onRefresh,
  searchTerm,
  onSearchChange,
  clientFilter,
  onClientFilterChange,
  statusFilters,
  onStatusFiltersChange,
  createdByFilter,
  onCreatedByFilterChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  selectedFields,
  onSelectedFieldsChange,
}: ProjectsTableProps) {
  const { isAdmin } = useAuth();
  const { toast: toastHook } = useToast();
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [isExporting, setIsExporting] = useState(false);
  const [deleteProject, setDeleteProject] = useState<Project | null>(null);

  const handleSearchChange = (value: string) => {
    setCurrentPage(1);
    onSearchChange(value);
  };
  const handleClientFilterChange = (value: string) => {
    setCurrentPage(1);
    onClientFilterChange(value);
  };

  const totalPages = Math.max(1, Math.ceil(projects.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedProjects = projects.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize
  );

  const visibleFields = selectedFields.filter((key) => key in COLUMN_MAP);
  const profileMap = new Map(profiles.map((p) => [p.user_id, p.full_name || p.email]));

  const getCellValue = (project: Project, key: FieldKey) => {
    switch (key) {
      case "project_number":
        return <span className="font-mono font-bold font-mono-project text-primary">{project.project_number}</span>;
      case "client_name":
        return project.clients.client_name;
      case "client_prefix":
        return <span className="font-mono text-muted-foreground">{project.clients.prefix}</span>;
      case "name":
        return <span className="font-medium">{project.project_name}</span>;
      case "description":
        return <span className="text-muted-foreground text-sm truncate max-w-[200px] block">{project.description || "—"}</span>;
      case "status":
        return <StatusBadge status={project.status} />;
      case "created_at":
        return <span className="text-muted-foreground">{format(new Date(project.created_at), "MMM d, yyyy")}</span>;
      case "created_by_name":
        return <span className="text-muted-foreground">{profileMap.get(project.created_by) || "—"}</span>;
      default:
        return "";
    }
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case "on_hold": return "On Hold";
      case "active": return "Active";
      case "completed": return "Completed";
      default: return status;
    }
  };

  const handleExport = async (exportFormat: "csv" | "xlsx") => {
    if (selectedFields.length === 0) {
      toast.error("Please select at least one field to export");
      return;
    }
    if (projects.length === 0) {
      toast.error("No data to export");
      return;
    }
    setIsExporting(true);

    try {
      const fieldOrder = ALL_FIELDS.filter((f) => selectedFields.includes(f.key));
      const headers = fieldOrder.map((f) => f.label);

      const exportData = projects;

      const rows = exportData.map((row) =>
        fieldOrder.map((f) => {
          switch (f.key) {
            case "project_number": return row.project_number;
            case "client_name": return row.clients?.client_name ?? "";
            case "client_prefix": return row.clients?.prefix ?? "";
            case "name": return row.project_name;
            case "description": return row.description ?? "";
            case "status": return formatStatus(row.status);
            case "created_at": return format(new Date(row.created_at), "yyyy-MM-dd");
            case "created_by_name": return profileMap.get(row.created_by) ?? "";
            default: return "";
          }
        })
      );

      if (exportFormat === "csv") {
        const escape = (v: string) => {
          if (v.includes(",") || v.includes('"') || v.includes("\n")) {
            return `"${v.replace(/"/g, '""')}"`;
          }
          return v;
        };
        const csvContent = [
          headers.map(escape).join(","),
          ...rows.map((r) => r.map((c) => escape(String(c))).join(",")),
        ].join("\n");
        const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
        triggerDownload(blob, `projects-export-${format(new Date(), "yyyy-MM-dd")}.csv`);
      } else {
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Projects");
        XLSX.writeFile(wb, `projects-export-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
      }

      toast.success("Export complete");
      // export complete
    } catch (err) {
      console.error(err);
      toast.error("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="rounded-xl bg-card p-6 space-y-4">
        {/* Section header */}
        <div className="flex items-center gap-2 mb-2">
          <Search className="w-5 h-5 text-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Project Database</h2>
        </div>
        {/* Toolbar: Search + Filters inline */}
        <div className="flex flex-wrap items-center gap-3 w-full">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-[600px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 h-9"
            />
          </div>

          {/* Primary filters: Client + Status side by side */}
          <Select value={clientFilter} onValueChange={handleClientFilterChange}>
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue placeholder="All Clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.client_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={statusFilters.length === 1 ? statusFilters[0] : "all"}
            onValueChange={(value) => {
              if (value === "all") {
                onStatusFiltersChange(["active", "on_hold", "completed"]);
              } else {
                onStatusFiltersChange([value]);
              }
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          {/* Secondary filters */}
          <div className="w-px h-6 bg-border" />
          <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("h-9 text-xs gap-1.5", createdByFilter === "all" && "text-muted-foreground")}>
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    {createdByFilter === "all" ? "All Users" : profileMap.get(createdByFilter) || "User"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-3 space-y-2" align="start">
                  <Label className="text-xs text-muted-foreground">Created By</Label>
                  <div
                    className={cn("text-sm cursor-pointer px-2 py-1 rounded hover:bg-secondary", createdByFilter === "all" && "font-medium bg-secondary")}
                    onClick={() => onCreatedByFilterChange("all")}
                  >
                    All Users
                  </div>
                  {profiles.map((p) => (
                    <div
                      key={p.user_id}
                      className={cn("text-sm cursor-pointer px-2 py-1 rounded hover:bg-secondary", createdByFilter === p.user_id && "font-medium bg-secondary")}
                      onClick={() => onCreatedByFilterChange(p.user_id)}
                    >
                      {p.full_name || p.email}
                    </div>
                  ))}
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("h-9 text-xs gap-1.5", !startDate && !endDate && "text-muted-foreground")}>
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {startDate && endDate
                      ? `${format(startDate, "MMM d")} – ${format(endDate, "MMM d")}`
                      : startDate
                        ? `From ${format(startDate, "MMM d")}`
                        : "Date Range"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3 space-y-3" align="start">
                  <div className="flex flex-wrap gap-1.5">
                    {DATE_PRESETS.map((preset) => (
                      <Badge
                        key={preset.label}
                        variant="outline"
                        className="cursor-pointer hover:bg-secondary transition-colors text-xs"
                        onClick={() => {
                          const { start, end } = preset.getValue();
                          onStartDateChange(start);
                          onEndDateChange(end);
                        }}
                      >
                        {preset.label}
                      </Badge>
                    ))}
                    {(startDate || endDate) && (
                      <Badge
                        variant="outline"
                        className="cursor-pointer hover:bg-destructive/10 text-destructive border-destructive/30 text-xs"
                        onClick={() => { onStartDateChange(undefined); onEndDateChange(undefined); }}
                      >
                        Clear
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Start</Label>
                      <Calendar mode="single" selected={startDate} onSelect={onStartDateChange} className="p-0 pointer-events-auto" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">End</Label>
                      <Calendar mode="single" selected={endDate} onSelect={onEndDateChange} className="p-0 pointer-events-auto" />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("h-9 text-xs gap-1.5", selectedFields.length === ALL_FIELDS.length && "text-muted-foreground")}>
                    <Columns3 className="h-3.5 w-3.5" />
                    {selectedFields.length === ALL_FIELDS.length ? "All Columns" : `${selectedFields.length} Columns`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-3 space-y-2" align="start">
                  <Label className="text-xs text-muted-foreground">Visible / Export Fields</Label>
                  <div className="flex items-center gap-2 pb-1 border-b">
                    <Checkbox
                      id="fields-toggle-all"
                      checked={selectedFields.length === ALL_FIELDS.length}
                      onCheckedChange={() =>
                        onSelectedFieldsChange(
                          selectedFields.length === ALL_FIELDS.length ? [] : ALL_FIELDS.map((f) => f.key)
                        )
                      }
                    />
                    <label htmlFor="fields-toggle-all" className="text-sm font-medium cursor-pointer">Select All</label>
                  </div>
                  {ALL_FIELDS.map((field) => (
                    <div key={field.key} className="flex items-center gap-2">
                      <Checkbox
                        id={`field-toggle-${field.key}`}
                        checked={selectedFields.includes(field.key)}
                        onCheckedChange={() =>
                          onSelectedFieldsChange(
                            selectedFields.includes(field.key)
                              ? selectedFields.filter((k) => k !== field.key)
                              : [...selectedFields, field.key]
                          )
                        }
                      />
                      <label htmlFor={`field-toggle-${field.key}`} className="text-sm cursor-pointer">{field.label}</label>
                    </div>
                  ))}
                </PopoverContent>
              </Popover>

          {/* Export – pushed to the right */}
          <div className="ml-auto flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs gap-1.5"
                  disabled={isExporting || projects.length === 0}
                >
                  {isExporting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Exporting…</>
                  ) : (
                    <><Download className="w-4 h-4" /> Export</>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport("csv")}>
                  <FileText className="w-4 h-4 mr-2" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("xlsx")}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Export as XLSX
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Showing count */}
        <p className="text-sm text-muted-foreground">
          Showing {projects.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1} to {Math.min(safeCurrentPage * pageSize, projects.length)} of {projects.length} projects
        </p>

        {/* Table */}
        <div className="overflow-hidden">
          <Table className="table-fixed w-full">
            <TableHeader>
              <TableRow>
                {visibleFields.map((key) => (
                  <TableHead key={key} className={COLUMN_MAP[key].className}>
                    {COLUMN_MAP[key].header}
                  </TableHead>
                ))}
                <TableHead className="w-[120px] text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: visibleFields.length + 1 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : paginatedProjects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={visibleFields.length + 1} className="text-center py-8 text-muted-foreground">
                    No projects found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedProjects.map((project) => (
                  <TableRow key={project.id} className="animate-fade-in">
                    {visibleFields.map((key) => (
                      <TableCell key={key}>{getCellValue(project, key)}</TableCell>
                    ))}
                    <TableCell>
                      <div className="flex justify-center gap-3">
                        <button
                          className="text-sm text-primary hover:text-primary/80 transition-colors"
                          onClick={() => setEditProject(project)}
                        >
                          Edit
                        </button>
                        {isAdmin && (
                          <button
                            className="text-sm text-destructive hover:text-destructive/80 transition-colors"
                            onClick={() => setDeleteProject(project)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </TableCell>
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
            {(() => {
              const pages: (number | "ellipsis")[] = [];
              const maxVisible = 10;
              if (totalPages <= maxVisible) {
                for (let i = 1; i <= totalPages; i++) pages.push(i);
              } else {
                // Always show first few, last few, and around current
                const start = Math.max(2, safeCurrentPage - 3);
                const end = Math.min(totalPages - 1, safeCurrentPage + 3);
                pages.push(1);
                if (start > 2) pages.push("ellipsis");
                for (let i = start; i <= end; i++) pages.push(i);
                if (end < totalPages - 1) pages.push("ellipsis");
                pages.push(totalPages);
              }
              return pages.map((p, idx) =>
                p === "ellipsis" ? (
                  <span key={`e-${idx}`} className="px-2 text-muted-foreground">…</span>
                ) : (
                  <Button
                    key={p}
                    variant={p === safeCurrentPage ? "default" : "outline"}
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setCurrentPage(p)}
                  >
                    {p}
                  </Button>
                )
              );
            })()}
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

      <EditProjectModal
        project={editProject}
        open={!!editProject}
        onOpenChange={(open) => !open && setEditProject(null)}
        onSuccess={onRefresh}
      />

      <DeleteProjectDialog
        projectId={deleteProject?.id || null}
        projectNumber={deleteProject?.project_number || ""}
        open={!!deleteProject}
        onOpenChange={(open) => !open && setDeleteProject(null)}
        onSuccess={onRefresh}
      />
    </>
  );
}
