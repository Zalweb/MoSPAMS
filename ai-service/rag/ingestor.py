import fitz           # PyMuPDF
import docx as _docx  # python-docx
from rag.embedder import embed_batch
from rag.vectorstore import upsert_chunks

CHUNK_WORDS   = 500
OVERLAP_WORDS = 50


def chunk_text(text: str) -> list[str]:
    words = text.split()
    chunks, i = [], 0
    while i < len(words):
        chunk = words[i: i + CHUNK_WORDS]
        chunks.append(" ".join(chunk))
        i += CHUNK_WORDS - OVERLAP_WORDS
    return [c for c in chunks if c.strip()]


def _extract_text(file_path: str, mime: str) -> str:
    if mime == "application/pdf":
        doc = fitz.open(file_path)
        return "\n".join(page.get_text() for page in doc)
    if mime == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        doc = _docx.Document(file_path)
        return "\n".join(p.text for p in doc.paragraphs)
    # plain text (default)
    with open(file_path, encoding="utf-8", errors="ignore") as f:
        return f.read()


def ingest_file(shop_id: int, doc_id: str, file_path: str, mime: str) -> int:
    text   = _extract_text(file_path, mime)
    chunks = chunk_text(text)
    if not chunks:
        return 0
    embeddings = embed_batch(chunks)
    upsert_chunks(shop_id=shop_id, doc_id=doc_id, chunks=chunks, embeddings=embeddings)
    return len(chunks)
