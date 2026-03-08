import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UploadFile {
  file: File;
  id: string;
  status: "queued" | "uploading" | "done" | "error";
  progress: number;
  error?: string;
  recordId?: string;
}

export default function LetterUploadPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const pdfFiles = Array.from(newFiles).filter(f => f.type === "application/pdf");
    if (pdfFiles.length === 0) {
      toast({ title: "Only PDF files are accepted", variant: "destructive" });
      return;
    }
    const uploads: UploadFile[] = pdfFiles.map(f => ({
      file: f,
      id: crypto.randomUUID(),
      status: "queued",
      progress: 0,
    }));
    setFiles(prev => [...prev, ...uploads]);
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const uploadAll = async () => {
    const queued = files.filter(f => f.status === "queued");
    if (queued.length === 0) return;

    for (const uf of queued) {
      setFiles(prev => prev.map(f => f.id === uf.id ? { ...f, status: "uploading", progress: 30 } : f));

      try {
        const filePath = `${user?.id}/${Date.now()}_${uf.file.name}`;
        const { error: storageError } = await supabase.storage.from("letters").upload(filePath, uf.file);
        if (storageError) throw storageError;

        setFiles(prev => prev.map(f => f.id === uf.id ? { ...f, progress: 60 } : f));

        const { data: urlData } = supabase.storage.from("letters").getPublicUrl(filePath);
        const pdfUrl = urlData.publicUrl;

        const { data: record, error: dbError } = await supabase.from("letter_records").insert({
          pdf_url: pdfUrl,
          status: "pending",
          scan_status: "pending",
          process_status: "pending",
          uploaded_by: user?.id,
          uploader_name: user?.email ?? "Unknown",
          uploaded_at: new Date().toISOString(),
        }).select("id").single();

        if (dbError) throw dbError;

        setFiles(prev => prev.map(f => f.id === uf.id ? { ...f, status: "done", progress: 100, recordId: record.id } : f));
      } catch (err: any) {
        setFiles(prev => prev.map(f => f.id === uf.id ? { ...f, status: "error", error: err.message } : f));
      }
    }

    toast({ title: "Upload complete", description: `${queued.length} file(s) processed` });
  };

  const queuedCount = files.filter(f => f.status === "queued").length;

  return (
    <div className="p-3 md:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground tracking-tight">Upload Scan Letters</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Drag and drop PDF files or click to browse</p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 ${
          dragActive
            ? "border-brand-navy-500 bg-brand-navy-50"
            : "border-border bg-card hover:border-brand-navy-300 hover:bg-muted/30"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
        <Upload className={`w-10 h-10 mx-auto mb-3 ${dragActive ? "text-brand-navy-500" : "text-muted-foreground"}`} />
        <p className="text-sm font-medium text-foreground">Drop PDF files here or click to browse</p>
        <p className="text-xs text-muted-foreground mt-1">Only .pdf files are accepted</p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">{files.length} file(s)</p>
            {queuedCount > 0 && (
              <button
                onClick={uploadAll}
                className="px-4 py-2 bg-brand-navy-800 text-primary-foreground text-sm font-medium rounded-xl hover:bg-brand-navy-700 transition-colors shadow-sm"
              >
                Upload {queuedCount} file(s)
              </button>
            )}
          </div>

          <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
            {files.map((uf) => (
              <div key={uf.id} className="flex items-center gap-3 px-4 py-3">
                <FileText className="w-5 h-5 text-brand-red-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{uf.file.name}</p>
                  <p className="text-xs text-muted-foreground">{(uf.file.size / 1024).toFixed(0)} KB</p>
                  {uf.status === "uploading" && (
                    <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-brand-navy-500 rounded-full transition-all duration-300" style={{ width: `${uf.progress}%` }} />
                    </div>
                  )}
                  {uf.status === "error" && (
                    <p className="text-xs text-destructive mt-0.5">{uf.error}</p>
                  )}
                </div>
                <div className="shrink-0">
                  {uf.status === "queued" && (
                    <button onClick={() => removeFile(uf.id)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  {uf.status === "uploading" && <Loader2 className="w-4 h-4 text-brand-navy-500 animate-spin" />}
                  {uf.status === "done" && <CheckCircle className="w-4 h-4 text-green-600" />}
                  {uf.status === "error" && <AlertCircle className="w-4 h-4 text-destructive" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
