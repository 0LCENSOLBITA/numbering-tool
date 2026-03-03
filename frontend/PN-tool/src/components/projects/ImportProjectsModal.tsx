import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, FileSpreadsheet, AlertCircle } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { Alert, AlertDescription } from "@/components/ui/alert";

type ProjectStatus = "active" | "on_hold" | "completed";

interface ImportRow {
  project_number: string;
  client_name: string;
  project_name: string;
  status: ProjectStatus;
  created_at: string;
}

interface ParseError {
  row: number;
  message: string;
}

interface ImportProjectsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const VALID_STATUSES: ProjectStatus[] = ["active", "on_hold", "completed"];

function normalizeStatus(raw: string): ProjectStatus {
  const s = raw?.toString().trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (VALID_STATUSES.includes(s as ProjectStatus)) return s as ProjectStatus;
  if (s === "onhold" || s === "on hold") return "on_hold";
  return "active";
}

function normalizeHeaders(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};

  headers.forEach((h, i) => {
    const key = h?.toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

    if (key.includes("project") && key.includes("number")) map["project_number"] = i;
    else if (key.includes("client")) map["client_name"] = i;
    else if (key.includes("project") && key.includes("name")) map["project_name"] = i;
    else if (key === "name" && !("project_name" in map)) map["project_name"] = i;
    else if (key.includes("status")) map["status"] = i;
    else if (
      map["created_at"] === undefined &&
      (key === "created_at" || key === "created" || key === "created_date" || key === "date_created" || key.startsWith("created_"))
    ) {
      map["created_at"] = i;
    }
  });

  return map;
}

function parseDate(val: unknown): string {
  const fallback = () => new Date().toISOString();

  if (val === null || val === undefined) return fallback();

  // Handle Date objects (from XLSX with cellDates: true)
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? fallback() : val.toISOString();
  }

  const toIsoFromParts = (year: number, month: number, day: number, hour = 0, minute = 0, second = 0) => {
    const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
    const isValidDate =
      !isNaN(date.getTime()) &&
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day;
    return isValidDate ? date.toISOString() : null;
  };

  const parseExcelSerial = (serial: number) => {
    const parsed = XLSX.SSF.parse_date_code(serial);
    if (!parsed?.y || !parsed?.m || !parsed?.d) return null;
    return toIsoFromParts(parsed.y, parsed.m, parsed.d, parsed.H || 0, parsed.M || 0, Math.floor(parsed.S || 0));
  };

  // Handle numeric Excel serial date
  if (typeof val === "number") {
    return parseExcelSerial(val) ?? fallback();
  }

  const raw = String(val).trim();
  if (!raw) return fallback();

  // Clean common spreadsheet wrappers: leading apostrophe and surrounding quotes
  const cleaned = raw
    .replace(/^'+/, "")
    .replace(/^"(.*)"$/, "$1")
    .replace(/\u00A0/g, " ")
    .trim();

  if (!cleaned) return fallback();

  // Handle stringified Excel serial values
  if (/^\d+(\.\d+)?$/.test(cleaned)) {
    return parseExcelSerial(Number(cleaned)) ?? fallback();
  }

  // Handle Postgres-style timestamps from sheets (e.g. "2025-06-29 14:11:48.000000+00")
  const pgMatch = cleaned.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?(?:(Z)|([+-]\d{2})(?::?(\d{2}))?)?$/i,
  );
  if (pgMatch) {
    const year = Number(pgMatch[1]);
    const month = Number(pgMatch[2]);
    const day = Number(pgMatch[3]);
    const hour = Number(pgMatch[4]);
    const minute = Number(pgMatch[5]);
    const second = Number(pgMatch[6]);
    const micro = pgMatch[7] || "0";
    const ms = Number(micro.padEnd(6, "0").slice(0, 3));

    const isZulu = Boolean(pgMatch[8]);
    const offsetHourRaw = pgMatch[9];
    const offsetMinuteRaw = pgMatch[10] || "0";
    const offsetMinutes = isZulu
      ? 0
      : offsetHourRaw
        ? Number(offsetHourRaw) * 60 + (Number(offsetHourRaw) >= 0 ? Number(offsetMinuteRaw) : -Number(offsetMinuteRaw))
        : 0;

    const utcMs = Date.UTC(year, month - 1, day, hour, minute, second, ms) - offsetMinutes * 60_000;
    const parsedPg = new Date(utcMs);
    if (!isNaN(parsedPg.getTime())) return parsedPg.toISOString();
  }

  // Fix timezone format like "+00" -> "+00:00" and support space-separated datetime
  const normalizedTz = cleaned.replace(" ", "T").replace(/(\.\d{3})\d+/, "$1").replace(/([+-]\d{2})$/, "$1:00");
  const nativeParsed = new Date(normalizedTz);
  if (!isNaN(nativeParsed.getTime())) return nativeParsed.toISOString();

  // Handle common sheet formats explicitly (dd/MM/yyyy, MM/dd/yyyy, dd-MM-yyyy, etc.)
  const partsMatch = cleaned.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
  if (partsMatch) {
    const first = Number(partsMatch[1]);
    const second = Number(partsMatch[2]);
    let year = Number(partsMatch[3]);
    if (year < 100) year += 2000;

    // If ambiguous (both <=12), prefer day-first because spreadsheets are commonly dd/MM/yyyy.
    const day = first > 12 || (first <= 12 && second <= 12) ? first : second;
    const month = first > 12 || (first <= 12 && second <= 12) ? second : first;

    return toIsoFromParts(year, month, day) ?? fallback();
  }

  return fallback();
}

export function ImportProjectsModal({ open, onOpenChange, onSuccess }: ImportProjectsModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [errors, setErrors] = useState<ParseError[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [fileName, setFileName] = useState("");
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  const hasData = rows.length > 0 || fileName !== "";

  const reset = () => {
    setRows([]);
    setErrors([]);
    setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = (newOpen: boolean) => {
    if (!newOpen && hasData) {
      setShowDiscardDialog(true);
      return;
    }
    if (!newOpen) reset();
    onOpenChange(newOpen);
  };

  const handleDiscard = () => {
    setShowDiscardDialog(false);
    reset();
    onOpenChange(false);
  };

  const parseFile = async (file: File) => {
    reset();
    setFileName(file.name);
    const ext = file.name.split(".").pop()?.toLowerCase();

    try {
      if (ext === "json") {
        const text = await file.text();
        const json = JSON.parse(text);
        const arr = Array.isArray(json) ? json : [json];
        parseRowObjects(arr);
      } else {
        // CSV or Excel
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: "array", cellDates: true });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });

        if (rawData.length < 2) {
          setErrors([{ row: 0, message: "File must have a header row and at least one data row." }]);
          return;
        }

        const headerMap = normalizeHeaders(rawData[0] as string[]);

        const parsedRows: ImportRow[] = [];
        const parseErrors: ParseError[] = [];

        if (headerMap["created_at"] === undefined) {
          parseErrors.push({
            row: 0,
            message: "created_at column not found. Accepted headers include: created_at, created at, created date.",
          });
        }

        for (let i = 1; i < rawData.length; i++) {
          const r = rawData[i] as unknown[];
          if (!r || r.length === 0 || r.every((c) => !c)) continue;

          const projectNumber = headerMap["project_number"] !== undefined ? String(r[headerMap["project_number"]] || "").trim() : "Missing";
          const clientName = headerMap["client_name"] !== undefined ? String(r[headerMap["client_name"]] || "").trim() : "Missing";
          const projectName = headerMap["project_name"] !== undefined ? String(r[headerMap["project_name"]] || "").trim() : "Missing";
          const statusRaw = headerMap["status"] !== undefined ? String(r[headerMap["status"]] || "active") : "active";
          const createdRaw = headerMap["created_at"] !== undefined ? r[headerMap["created_at"]] : null;

          const status = normalizeStatus(statusRaw);

          parsedRows.push({
            project_number: projectNumber || "Missing",
            client_name: clientName || "Missing",
            project_name: projectName || "Missing",
            status,
            created_at: parseDate(createdRaw),
          });
        }

        setRows(parsedRows);
        setErrors(parseErrors);
      }
    } catch (e) {
      setErrors([{ row: 0, message: `Failed to parse file: ${(e as Error).message}` }]);
    }
  };

  const parseRowObjects = (arr: Record<string, unknown>[]) => {
    const parsedRows: ImportRow[] = [];
    const parseErrors: ParseError[] = [];

    arr.forEach((obj, i) => {
      const keys = Object.keys(obj);
      const findKey = (patterns: string[]) => keys.find((k) => patterns.some((p) => k.toLowerCase().replace(/[\s_-]+/g, "_").includes(p)));

      const pnKey = findKey(["project_number", "projectnumber", "project_no"]);
      const cnKey = findKey(["client_name", "clientname", "client"]);
      const nameKey = findKey(["project_name", "projectname", "name"]);
      const statusKey = findKey(["status"]);
      const dateKey = findKey(["created_at", "createdat", "created_date", "date_created", "created"]);

      const projectNumber = pnKey ? String(obj[pnKey] || "").trim() || "Missing" : "Missing";
      const clientName = cnKey ? String(obj[cnKey] || "").trim() || "Missing" : "Missing";
      const projectName = nameKey ? String(obj[nameKey] || "").trim() || "Missing" : "Missing";
      const statusRaw = String(obj[statusKey || ""] || "active").trim();
      const createdRaw = obj[dateKey || ""];

      const status = normalizeStatus(statusRaw);

      parsedRows.push({
        project_number: projectNumber,
        client_name: clientName,
        project_name: projectName,
        status,
        created_at: parseDate(createdRaw),
      });
    });

    setRows(parsedRows);
    setErrors(parseErrors);
  };

  const handleImport = async () => {
    if (!user || rows.length === 0) return;
    setIsImporting(true);

    try {
      // Get existing clients
      const { data: existingClients } = await supabase
        .from("clients")
        .select("id, client_name, prefix");

      const clientMap = new Map<string, string>();
      existingClients?.forEach((c) => clientMap.set(c.client_name.toLowerCase(), c.id));

      // Find unique client names that don't exist
      const uniqueNewClients = [...new Set(rows.map((r) => r.client_name))]
        .filter((name) => !clientMap.has(name.toLowerCase()));

      // Create missing clients with prefix from first 3 uppercase letters
      for (const name of uniqueNewClients) {
        const prefix = name.replace(/[^a-zA-Z0-9/]/g, "").substring(0, 3).toUpperCase() || "UNK";
        const { data: newClient, error } = await supabase
          .from("clients")
          .insert({ client_name: name, prefix, created_by: user.id })
          .select("id, client_name")
          .single();

        if (newClient) {
          clientMap.set(name.toLowerCase(), newClient.id);
        } else if (error) {
          // If duplicate prefix, reuse an existing client for now
          if (error.code === "23505") {
            const { data: existingByName } = await supabase
              .from("clients")
              .select("id")
              .eq("client_name", name)
              .maybeSingle();

            if (existingByName) {
              clientMap.set(name.toLowerCase(), existingByName.id);
              continue;
            }

            const { data: existingByPrefix } = await supabase
              .from("clients")
              .select("id")
              .eq("prefix", prefix)
              .maybeSingle();

            if (existingByPrefix) {
              clientMap.set(name.toLowerCase(), existingByPrefix.id);
              continue;
            }
          }
          toast({ title: `Failed to create client "${name}"`, description: error.message, variant: "destructive" });
          setIsImporting(false);
          return;
        }
      }

      // Build project inserts, deduplicating by project_number (last row wins)
      const deduped = new Map<string, typeof rows[0]>();
      rows.forEach((r) => deduped.set(r.project_number, r));

      // Handle duplicate project names by appending a suffix
      const nameCounts = new Map<string, number>();
      const projectInserts = Array.from(deduped.values()).map((r) => {
        const nameKey = r.project_name.toLowerCase();
        const count = nameCounts.get(nameKey) || 0;
        nameCounts.set(nameKey, count + 1);
        const finalName = count === 0 ? r.project_name : `${r.project_name} ${count}`;
        return {
          project_number: r.project_number,
          client_id: clientMap.get(r.client_name.toLowerCase())!,
          project_name: finalName,
          status: r.status,
          created_at: r.created_at,
          created_by: null,
        };
      });

      const { error } = await supabase.from("projects").upsert(projectInserts, {
        onConflict: "project_number",
        ignoreDuplicates: false,
      });

      if (error) {
        toast({ title: "Import failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: `Successfully imported ${rows.length} project(s)` });
        onSuccess();
        reset();
        onOpenChange(false);
      }
    } catch (e) {
      toast({ title: "Import error", description: (e as Error).message, variant: "destructive" });
    }

    setIsImporting(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[750px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Projects</DialogTitle>
          <DialogDescription>
            Upload an Excel (.xlsx/.xls), CSV, or JSON file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* File Upload */}
          <div
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) parseFile(file);
              }}
            />
            <FileSpreadsheet className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            {fileName ? (
              <p className="text-sm font-medium">{fileName}</p>
            ) : (
              <>
                <p className="text-sm font-medium">Click to upload a file</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supports .xlsx, .xls, .csv, .json
                </p>
              </>
            )}
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc pl-4 space-y-1 text-sm">
                  {errors.map((e, i) => (
                    <li key={i}>
                      {e.row > 0 ? `Row ${e.row}: ` : ""}{e.message}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Preview Table */}
          {rows.length > 0 && (
            <div className="space-y-2 overflow-hidden flex-1 flex flex-col">
              <p className="text-sm font-medium">Preview</p>
              <div className="rounded-lg border bg-card overflow-auto flex-1">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project Number</TableHead>
                    <TableHead>Client Prefix</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono font-bold text-primary">{row.project_number}</TableCell>
                      <TableCell>{row.client_name}</TableCell>
                      <TableCell className="font-medium">{row.project_name}</TableCell>
                      <TableCell>
                        <StatusBadge status={row.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">{new Date(row.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between items-center pt-2">
            <p className="text-sm text-muted-foreground">
              {rows.length > 0 ? `${rows.length} project(s) ready to import` : "No data loaded"}
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={isImporting || rows.length === 0}>
                {isImporting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Upload className="w-4 h-4 mr-2" />
                Import {rows.length > 0 ? `(${rows.length})` : ""}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>

      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent className="z-[100]">
          <AlertDialogHeader>
            <AlertDialogTitle>Discard Import?</AlertDialogTitle>
            <AlertDialogDescription>
              Your loaded import data will be discarded.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button size="sm" className="border border-destructive bg-background text-destructive hover:bg-destructive/10" onClick={handleDiscard}>
              Discard
            </Button>
            <Button size="sm" onClick={() => setShowDiscardDialog(false)}>
              Keep Editing
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
