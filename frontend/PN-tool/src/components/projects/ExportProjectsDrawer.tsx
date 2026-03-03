import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfYear } from "date-fns";
import { CalendarIcon, ChevronRight, Download, FileSpreadsheet, FileText, Loader2, X } from "lucide-react";
import * as XLSX from "xlsx";

interface ExportProjectsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentClientFilter: string;
  currentStatusFilter: string;
}

interface ExportClient {
  id: string;
  client_name: string;
  prefix: string;
}

interface ExportProfile {
  user_id: string;
  full_name: string | null;
  email: string;
}

const ALL_FIELDS = [
  { key: "project_number", label: "Project Number" },
  { key: "client_name", label: "Client Name" },
  { key: "client_prefix", label: "Client Prefix" },
  { key: "name", label: "Project Name" },
  { key: "description", label: "Description" },
  { key: "status", label: "Status" },
  { key: "created_at", label: "Created Date" },
  { key: "created_by_name", label: "Created By" },
] as const;

type FieldKey = (typeof ALL_FIELDS)[number]["key"];

const DATE_PRESETS = [
  { label: "Last 7 days", getValue: () => ({ start: subDays(new Date(), 7), end: new Date() }) },
  { label: "Last 30 days", getValue: () => ({ start: subDays(new Date(), 30), end: new Date() }) },
  { label: "This Month", getValue: () => ({ start: startOfMonth(new Date()), end: new Date() }) },
  { label: "Last Month", getValue: () => ({ start: startOfMonth(subMonths(new Date(), 1)), end: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: "Year to Date", getValue: () => ({ start: startOfYear(new Date()), end: new Date() }) },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
] as const;

export function ExportProjectsDrawer({
  open,
  onOpenChange,
  currentClientFilter,
  currentStatusFilter,
}: ExportProjectsDrawerProps) {
  // Filter state
  const [clientFilter, setClientFilter] = useState("all");
  const [createdByFilter, setCreatedByFilter] = useState("all");
  const [statusFilters, setStatusFilters] = useState<string[]>(["active", "on_hold", "completed"]);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  // Field selection
  const [selectedFields, setSelectedFields] = useState<FieldKey[]>(ALL_FIELDS.map((f) => f.key));
  const [fieldsOpen, setFieldsOpen] = useState(false);

  // Format
  const [exportFormat, setExportFormat] = useState<"csv" | "xlsx">("csv");

  // Data
  const [clients, setClients] = useState<ExportClient[]>([]);
  const [profiles, setProfiles] = useState<ExportProfile[]>([]);
  const [recordCount, setRecordCount] = useState(0);
  const [isCountLoading, setIsCountLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Pre-fill from page filters when drawer opens
  useEffect(() => {
    if (open) {
      setClientFilter(currentClientFilter);
      if (currentStatusFilter !== "all") {
        setStatusFilters([currentStatusFilter]);
      } else {
        setStatusFilters(["active", "on_hold", "completed"]);
      }
      setCreatedByFilter("all");
      setStartDate(undefined);
      setEndDate(undefined);
      setSelectedFields(ALL_FIELDS.map((f) => f.key));
      setExportFormat("csv");
      setFieldsOpen(false);
    }
  }, [open, currentClientFilter, currentStatusFilter]);

  // Fetch clients & profiles on open
  useEffect(() => {
    if (!open) return;
    const fetchMeta = async () => {
      const [{ data: c }, { data: p }] = await Promise.all([
        supabase.from("clients").select("id, client_name, prefix").order("client_name"),
        supabase.from("profiles").select("user_id, full_name, email").order("full_name"),
      ]);
      if (c) setClients(c);
      if (p) setProfiles(p);
    };
    fetchMeta();
  }, [open]);

  // Build query for count & export
  const buildQuery = useCallback(
    (selectStr: string, forCount = false) => {
      let query = supabase.from("projects").select(selectStr, forCount ? { count: "exact", head: true } : {});
      if (clientFilter !== "all") query = query.eq("client_id", clientFilter);
      if (createdByFilter !== "all") query = query.eq("created_by", createdByFilter);
      if (statusFilters.length > 0 && statusFilters.length < 3) {
        query = query.in("status", statusFilters as any);
      }
      if (startDate) query = query.gte("created_at", startDate.toISOString());
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte("created_at", endOfDay.toISOString());
      }
      return query.order("created_at", { ascending: false });
    },
    [clientFilter, createdByFilter, statusFilters, startDate, endDate]
  );

  // Live count
  useEffect(() => {
    if (!open) return;
    const fetchCount = async () => {
      setIsCountLoading(true);
      const { count } = await buildQuery("*", true);
      setRecordCount(count ?? 0);
      setIsCountLoading(false);
    };
    fetchCount();
  }, [open, buildQuery]);

  // Status toggle
  const toggleStatus = (value: string) => {
    setStatusFilters((prev) => (prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]));
  };

  const allStatusSelected = statusFilters.length === 3;
  const toggleAllStatus = () => {
    setStatusFilters(allStatusSelected ? [] : ["active", "on_hold", "completed"]);
  };

  // Field toggle
  const toggleField = (key: FieldKey) => {
    setSelectedFields((prev) => (prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]));
  };
  const allFieldsSelected = selectedFields.length === ALL_FIELDS.length;
  const toggleAllFields = () => {
    setSelectedFields(allFieldsSelected ? [] : ALL_FIELDS.map((f) => f.key));
  };

  // Date preset
  const applyPreset = (preset: (typeof DATE_PRESETS)[number]) => {
    const { start, end } = preset.getValue();
    setStartDate(start);
    setEndDate(end);
  };

  // Format status for display
  const formatStatus = (status: string) => {
    switch (status) {
      case "on_hold": return "On Hold";
      case "active": return "Active";
      case "completed": return "Completed";
      default: return status;
    }
  };

  // Export handler
  const handleExport = async () => {
    if (selectedFields.length === 0) {
      toast.error("Please select at least one field to export");
      return;
    }
    setIsExporting(true);

    try {
      const { data, error } = await buildQuery(`
        id,
        project_number,
        project_name,
        description,
        status,
        created_at,
        created_by,
        clients (client_name, prefix)
      `);

      if (error) throw error;
      if (!data || data.length === 0) {
        toast.error("No data to export");
        setIsExporting(false);
        return;
      }

      // Build profile lookup
      const profileMap = new Map(profiles.map((p) => [p.user_id, p.full_name || p.email]));

      // Map rows to selected fields
      const fieldOrder = ALL_FIELDS.filter((f) => selectedFields.includes(f.key));
      const headers = fieldOrder.map((f) => f.label);

      const rows = (data as any[]).map((row) =>
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
        const csvContent = [headers.map(escape).join(","), ...rows.map((r) => r.map((c: string) => escape(String(c))).join(","))].join("\n");
        const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
        triggerDownload(blob, `projects-export-${format(new Date(), "yyyy-MM-dd")}.csv`);
      } else {
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Projects");
        XLSX.writeFile(wb, `projects-export-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
      }

      toast.success("Export complete");
      onOpenChange(false);
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

  const exportDisabled = recordCount === 0 || selectedFields.length === 0 || isExporting;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[460px] p-0 flex flex-col gap-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b">
          <SheetTitle className="text-xl font-bold text-foreground">Export Projects</SheetTitle>
          <SheetDescription className="text-muted-foreground mt-1">
            Download filtered and structured project data
          </SheetDescription>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Section 1: Export Filters */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Export Filters</h3>

            {/* Client */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Client</Label>
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.client_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Created By */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Created By</Label>
              <Select value={createdByFilter} onValueChange={setCreatedByFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {profiles.map((p) => (
                    <SelectItem key={p.user_id} value={p.user_id}>
                      {p.full_name || p.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="status-all"
                    checked={allStatusSelected}
                    onCheckedChange={toggleAllStatus}
                  />
                  <label htmlFor="status-all" className="text-sm font-medium cursor-pointer">Select All</label>
                </div>
                {STATUS_OPTIONS.map((s) => (
                  <div key={s.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`status-${s.value}`}
                      checked={statusFilters.includes(s.value)}
                      onCheckedChange={() => toggleStatus(s.value)}
                    />
                    <label htmlFor={`status-${s.value}`} className="text-sm cursor-pointer">{s.label}</label>
                  </div>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Date Range (Created Date)</Label>
              <div className="grid grid-cols-2 gap-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("justify-start text-left font-normal h-9 text-sm", !startDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {startDate ? format(startDate, "MMM d, yyyy") : "Start Date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("justify-start text-left font-normal h-9 text-sm", !endDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {endDate ? format(endDate, "MMM d, yyyy") : "End Date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {DATE_PRESETS.map((preset) => (
                  <Badge
                    key={preset.label}
                    variant="outline"
                    className="cursor-pointer hover:bg-secondary transition-colors text-xs"
                    onClick={() => applyPreset(preset)}
                  >
                    {preset.label}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Live count */}
            <div className="rounded-md bg-muted/50 border px-3 py-2">
              <p className="text-sm text-muted-foreground">
                {isCountLoading ? (
                  <span className="flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Counting…</span>
                ) : (
                  <><span className="font-semibold text-foreground">{recordCount}</span> project{recordCount !== 1 ? "s" : ""} will be exported.</>
                )}
              </p>
            </div>
          </div>

          <Separator />

          {/* Section 2: Customize Fields */}
          <Collapsible open={fieldsOpen} onOpenChange={setFieldsOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-sm font-semibold text-foreground hover:text-primary transition-colors">
              <ChevronRight className={cn("h-4 w-4 transition-transform", fieldsOpen && "rotate-90")} />
              Export Fields
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-2">
              <div className="flex items-center gap-2 pb-1">
                <Checkbox id="fields-all" checked={allFieldsSelected} onCheckedChange={toggleAllFields} />
                <label htmlFor="fields-all" className="text-sm font-medium cursor-pointer">Select All</label>
              </div>
              {ALL_FIELDS.map((field) => (
                <div key={field.key} className="flex items-center gap-2">
                  <Checkbox
                    id={`field-${field.key}`}
                    checked={selectedFields.includes(field.key)}
                    onCheckedChange={() => toggleField(field.key)}
                  />
                  <label htmlFor={`field-${field.key}`} className="text-sm cursor-pointer">{field.label}</label>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* Section 3: Export Format */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Format</h3>
            <RadioGroup value={exportFormat} onValueChange={(v) => setExportFormat(v as "csv" | "xlsx")} className="space-y-2">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="csv" id="format-csv" />
                <label htmlFor="format-csv" className="flex items-center gap-2 text-sm cursor-pointer">
                  <FileText className="h-4 w-4 text-muted-foreground" /> CSV
                </label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="xlsx" id="format-xlsx" />
                <label htmlFor="format-xlsx" className="flex items-center gap-2 text-sm cursor-pointer">
                  <FileSpreadsheet className="h-4 w-4 text-muted-foreground" /> XLSX
                </label>
              </div>
            </RadioGroup>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="border-t px-6 py-4 flex items-center justify-between bg-card">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={exportDisabled}>
            {isExporting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Preparing file…</>
            ) : (
              <><Download className="mr-2 h-4 w-4" /> Export {exportFormat.toUpperCase()}</>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
