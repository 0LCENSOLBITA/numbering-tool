import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfYear } from "date-fns";
import { CalendarIcon, ChevronRight } from "lucide-react";

export const ALL_FIELDS = [
  { key: "project_number", label: "Project Number" },
  { key: "client_name", label: "Client Name" },
  { key: "client_prefix", label: "Client Prefix" },
  { key: "name", label: "Project Name" },
  { key: "description", label: "Description" },
  { key: "status", label: "Status" },
  { key: "created_at", label: "Created Date" },
  { key: "created_by_name", label: "Created By" },
] as const;

export type FieldKey = (typeof ALL_FIELDS)[number]["key"];

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

export interface ExportProfile {
  user_id: string;
  full_name: string | null;
  email: string;
}

interface ProjectExportFiltersProps {
  profiles: ExportProfile[];
  createdByFilter: string;
  onCreatedByFilterChange: (value: string) => void;
  statusFilters: string[];
  onStatusFiltersChange: (value: string[]) => void;
  startDate: Date | undefined;
  onStartDateChange: (date: Date | undefined) => void;
  endDate: Date | undefined;
  onEndDateChange: (date: Date | undefined) => void;
  selectedFields: FieldKey[];
  onSelectedFieldsChange: (fields: FieldKey[]) => void;
}

export function ProjectExportFilters({
  profiles,
  createdByFilter,
  onCreatedByFilterChange,
  statusFilters,
  onStatusFiltersChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  selectedFields,
  onSelectedFieldsChange,
}: ProjectExportFiltersProps) {
  const [fieldsOpen, setFieldsOpen] = useState(false);

  const allStatusSelected = statusFilters.length === 3;
  const toggleAllStatus = () => {
    onStatusFiltersChange(allStatusSelected ? [] : ["active", "on_hold", "completed"]);
  };
  const toggleStatus = (value: string) => {
    onStatusFiltersChange(
      statusFilters.includes(value)
        ? statusFilters.filter((s) => s !== value)
        : [...statusFilters, value]
    );
  };

  const allFieldsSelected = selectedFields.length === ALL_FIELDS.length;
  const toggleAllFields = () => {
    onSelectedFieldsChange(allFieldsSelected ? [] : ALL_FIELDS.map((f) => f.key));
  };
  const toggleField = (key: FieldKey) => {
    onSelectedFieldsChange(
      selectedFields.includes(key)
        ? selectedFields.filter((f) => f !== key)
        : [...selectedFields, key]
    );
  };

  const applyPreset = (preset: (typeof DATE_PRESETS)[number]) => {
    const { start, end } = preset.getValue();
    onStartDateChange(start);
    onEndDateChange(end);
  };

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Created By */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Created By</Label>
          <Select value={createdByFilter} onValueChange={onCreatedByFilterChange}>
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

        {/* Date Range */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Date Range (Created Date)</Label>
          <div className="grid grid-cols-2 gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("justify-start text-left font-normal h-9 text-xs", !startDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                  {startDate ? format(startDate, "MMM d, yyyy") : "Start Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={startDate} onSelect={onStartDateChange} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("justify-start text-left font-normal h-9 text-xs", !endDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                  {endDate ? format(endDate, "MMM d, yyyy") : "End Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={endDate} onSelect={onEndDateChange} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex flex-wrap gap-1.5">
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
      </div>

      {/* Status checkboxes */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Status</Label>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <div className="flex items-center gap-2">
            <Checkbox id="status-all" checked={allStatusSelected} onCheckedChange={toggleAllStatus} />
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

      {/* Export Fields */}
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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
