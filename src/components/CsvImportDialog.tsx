import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Upload, X, FileSpreadsheet, Loader2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Papa from "papaparse";
import * as XLSX from "xlsx";

interface Props {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

export default function CsvImportDialog({ open, onClose, onImported }: Props) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);

  if (!open) return null;

  const processData = (data: any[]) => {
    if (data.length === 0) return;
    setColumns(Object.keys(data[0]));
    setRows(data);
  };

  const handleFile = (file: File) => {
    setFileName(file.name);
    setDone(false);

    if (file.name.endsWith(".csv")) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => processData(result.data),
      });
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const wb = XLSX.read(e.target?.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);
        processData(data);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleImport = async () => {
    if (rows.length === 0) return;
    setImporting(true);

    const records = rows.map(row => ({
      status: (row.status as string) || "pending",
      payload: row,
    }));

    // Batch insert in chunks of 100
    for (let i = 0; i < records.length; i += 100) {
      const chunk = records.slice(i, i + 100);
      const { error } = await supabase.from("ekv_records").insert(chunk);
      if (error) {
        toast({ title: "Import failed", description: error.message, variant: "destructive" });
        setImporting(false);
        return;
      }
    }

    setImporting(false);
    setDone(true);
    toast({ title: "Import complete", description: `${records.length} records imported` });
    onImported();
  };

  const reset = () => {
    setRows([]);
    setColumns([]);
    setFileName("");
    setDone(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={reset}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-brand-navy-600" />
            <h2 className="text-sm font-semibold text-foreground">Import CSV / Excel</h2>
          </div>
          <button onClick={reset} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-4">
          {rows.length === 0 ? (
            <div
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-brand-navy-300 transition-colors"
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">Click to select a CSV or Excel file</p>
              <p className="text-xs text-muted-foreground mt-1">Supports .csv, .xlsx, .xls</p>
              <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-foreground"><span className="font-semibold">{fileName}</span> — {rows.length} rows, {columns.length} columns</p>
                {done && <CheckCircle className="w-5 h-5 text-green-600" />}
              </div>
              <div className="bg-muted/50 border border-border rounded-xl overflow-auto max-h-60">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      {columns.slice(0, 6).map(c => (
                        <th key={c} className="text-left px-3 py-2 font-semibold text-muted-foreground whitespace-nowrap">{c}</th>
                      ))}
                      {columns.length > 6 && <th className="px-3 py-2 text-muted-foreground">+{columns.length - 6} more</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.slice(0, 5).map((r, i) => (
                      <tr key={i}>
                        {columns.slice(0, 6).map(c => (
                          <td key={c} className="px-3 py-2 text-foreground whitespace-nowrap truncate max-w-[150px]">{String(r[c] ?? "")}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > 5 && <p className="text-xs text-muted-foreground">Showing 5 of {rows.length} rows</p>}
            </>
          )}
        </div>

        {rows.length > 0 && !done && (
          <div className="px-5 py-4 border-t border-border flex justify-end gap-3">
            <button onClick={reset} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
            <button onClick={handleImport} disabled={importing} className="flex items-center gap-2 px-4 py-2 bg-brand-navy-800 text-primary-foreground text-sm font-medium rounded-xl hover:bg-brand-navy-700 disabled:opacity-50 transition-colors">
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Import {rows.length} records
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
