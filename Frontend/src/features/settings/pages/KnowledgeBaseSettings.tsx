import { useState, useEffect } from 'react';

const AI_BASE = import.meta.env.VITE_AI_SERVICE_URL ?? '';

interface DocEntry { doc_id: string; }

interface Props { shopId: number; }

export default function KnowledgeBaseSettings({ shopId }: Props) {
  const [docs, setDocs]           = useState<DocEntry[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [success, setSuccess]     = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch(`${AI_BASE}/rag/documents?shop_id=${shopId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDocs((data.documents ?? []).map((id: string) => ({ doc_id: id })));
    } catch { setError('Could not load documents.'); }
  };

  useEffect(() => { load(); }, [shopId]);

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError(null); setSuccess(null);
    const form = new FormData();
    form.append('shop_id', String(shopId));
    form.append('doc_name', file.name);
    form.append('file', file);
    try {
      const res = await fetch(`${AI_BASE}/rag/ingest`, { method: 'POST', body: form });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail ?? 'Upload failed'); }
      setSuccess(`"${file.name}" uploaded successfully.`);
      load();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
    }
    finally { setUploading(false); e.target.value = ''; }
  };

  const remove = async (docId: string) => {
    try {
      const res = await fetch(`${AI_BASE}/rag/document/${docId}?shop_id=${shopId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setSuccess('Document removed.');
      load();
    } catch { setError('Failed to remove document.'); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">AI Knowledge Base</h2>
        <p className="text-sm text-muted-foreground">
          Upload documents (PDF, TXT, DOCX) that the chatbot will use to answer questions.
          Max 10 MB per file · {docs.length} / 20 documents used.
        </p>
      </div>

      {error   && <p className="text-sm text-red-400 bg-red-950/30 border border-red-800 rounded-lg px-4 py-2">{error}</p>}
      {success && <p className="text-sm text-green-400 bg-green-950/30 border border-green-800 rounded-lg px-4 py-2">{success}</p>}

      <label className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black text-sm
                        font-semibold cursor-pointer hover:bg-zinc-100 transition-colors
                        ${(uploading || docs.length >= 20) ? 'opacity-50 cursor-not-allowed' : ''}`}>
        {uploading ? 'Uploading...' : '+ Upload Document'}
        <input
          type="file"
          accept=".pdf,.txt,.docx"
          className="hidden"
          onChange={upload}
          disabled={uploading || docs.length >= 20}
        />
      </label>

      {docs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
      ) : (
        <ul className="space-y-2">
          {docs.map(doc => (
            <li key={doc.doc_id}
                className="flex items-center justify-between px-4 py-3
                           bg-muted rounded-xl border border-border">
              <span className="text-sm text-foreground font-mono truncate max-w-xs">{doc.doc_id}</span>
              <button
                onClick={() => remove(doc.doc_id)}
                className="text-xs text-red-400 hover:text-red-300 transition-colors ml-4"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
