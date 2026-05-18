from __future__ import annotations

import chromadb
import config

_client: chromadb.PersistentClient | None = None

def _get_client() -> chromadb.PersistentClient:
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(path=config.CHROMA_PATH)
    return _client

def _collection(shop_id: int):
    return _get_client().get_or_create_collection(
        name=f"shop_{shop_id}_docs",
        metadata={"hnsw:space": "cosine"},
    )

def upsert_chunks(shop_id: int, doc_id: str, chunks: list[str], embeddings: list[list[float]]) -> None:
    col = _collection(shop_id)
    ids = [f"{doc_id}__{i}" for i in range(len(chunks))]
    col.upsert(
        ids=ids,
        embeddings=embeddings,
        documents=chunks,
        metadatas=[{"shop_id": shop_id, "doc_id": doc_id, "chunk": i} for i in range(len(chunks))],
    )

def query(shop_id: int, embedding: list[float], n: int = 3) -> list[str]:
    col = _collection(shop_id)
    count = col.count()
    if count == 0:
        return []
    results = col.query(
        query_embeddings=[embedding],
        where={"shop_id": shop_id},
        n_results=min(n, count),
    )
    return results["documents"][0] if results["documents"] else []

def delete_doc(shop_id: int, doc_id: str) -> None:
    col = _collection(shop_id)
    col.delete(where={"doc_id": doc_id})
