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
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ImportRow {
  client_name: string;
  prefix: string;
  created_at: string;
}

interface ParseError {
  row: number;
  message: string;
}

interface ImportClientsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function normalizeHeaders(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  headers.forEach((h, i) => {
    const key = h?.toString().trim().toLowerCase().replace(/[\s_-]+/g, "_");
    if (key.includes("prefix")) map["prefix"] = i;
    else if (key.includes("client") || key.includes("name")) map["name"] = i;
    else if (key.includes("created") || key.includes("date")) map["created_at"] = i;
  });
  return map;
}

function parseDate(val: unknown): string {
  if (!val) return new Date().toISOString();
  if (typeof val === "number") {
    const date = XLSX.SSF.parse_date_code(val);
    return new Date(date.y, date.m - 1, date.d).toISOString();
  }
  const parsed = new Date(String(val));
  return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

export function ImportClientsModal({ open, onOpenChange, onSuccess }: ImportClientsModalProps) {
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

        for (let i = 1; i < rawData.length; i++) {
          const r = rawData[i] as unknown[];
          if (!r || r.length === 0 || r.every((c) => !c)) continue;

          const client_name = headerMap["name"] !== undefined ? String(r[headerMap["name"]] || "").trim() || "Missing" : "Missing";
          const prefix = headerMap["prefix"] !== undefined ? String(r[headerMap["prefix"]] || "").trim() || "Missing" : client_name.replace(/[^a-zA-Z]/g, "").substring(0, 4).toUpperCase() || "UNK";
          const createdRaw = headerMap["created_at"] !== undefined ? r[headerMap["created_at"]] : null;

          parsedRows.push({
            client_name,
            prefix: prefix.toUpperCase(),
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
      const findKey = (patterns: string[]) =>
        keys.find((k) => patterns.some((p) => k.toLowerCase().replace(/[\s_-]+/g, "_").includes(p)));

      const nameKey = findKey(["client_name", "clientname", "client", "name"]);
      const prefixKey = findKey(["prefix"]);
      const dateKey = findKey(["created_at", "createdat", "created", "date"]);

      const client_name = String(obj[nameKey || ""] || "").trim() || "Missing";
      const prefix = String(obj[prefixKey || ""] || "").trim() || client_name.replace(/[^a-zA-Z]/g, "").substring(0, 4).toUpperCase() || "UNK";
      const createdRaw = obj[dateKey || ""];

      parsedRows.push({
        client_name,
        prefix: prefix.toUpperCase(),
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
      const inserts = rows.map((r) => ({
        client_name: r.client_name,
        prefix: r.prefix,
        created_at: r.created_at,
        created_by: user.id,
      }));

      const { error } = await supabase.from("clients").insert(inserts);

      if (error) {
        toast({ title: "Import failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: `Successfully imported ${rows.length} client(s)` });
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
      <DialogContent className="sm:max-w-[650px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Clients</DialogTitle>
          <DialogDescription>
            Upload an Excel (.xlsx/.xls), CSV, or JSON file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
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

          {rows.length > 0 && (
            <div className="space-y-2 overflow-hidden flex-1 flex flex-col">
              <p className="text-sm font-medium">Preview</p>
              <div className="rounded-lg border bg-card overflow-auto flex-1">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client Name</TableHead>
                    <TableHead>Prefix</TableHead>
                    <TableHead>Created At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{row.client_name}</TableCell>
                      <TableCell className="font-mono font-bold text-primary">{row.prefix}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(row.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-2">
            <p className="text-sm text-muted-foreground">
              {rows.length > 0 ? `${rows.length} client(s) ready to import` : "No data loaded"}
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
