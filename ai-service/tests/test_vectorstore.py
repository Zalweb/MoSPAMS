# ai-service/tests/test_vectorstore.py
import pytest

@pytest.fixture
def tmp_store(tmp_path, monkeypatch):
    monkeypatch.setenv("CHROMA_PATH", str(tmp_path))
    import importlib, sys
    # Force reload so the new CHROMA_PATH is used
    for mod in list(sys.modules.keys()):
        if "rag.vectorstore" in mod or "vectorstore" in mod:
            del sys.modules[mod]
    import config as cfg
    importlib.reload(cfg)
    import rag.vectorstore as vs
    importlib.reload(vs)
    # Reset the singleton so the new CHROMA_PATH is picked up
    vs._client = None
    yield vs

def test_upsert_and_query(tmp_store):
    tmp_store.upsert_chunks(
        shop_id=1,
        doc_id="doc-abc",
        chunks=["Engine oil 10W-40 costs PHP 250", "Air filter costs PHP 180"],
        embeddings=[[0.1] * 384, [0.2] * 384],
    )
    results = tmp_store.query(shop_id=1, embedding=[0.15] * 384, n=2)
    assert len(results) == 2

def test_query_isolated_by_shop(tmp_store):
    tmp_store.upsert_chunks(
        shop_id=1, doc_id="d1",
        chunks=["shop 1 secret"], embeddings=[[0.9] * 384],
    )
    results = tmp_store.query(shop_id=2, embedding=[0.9] * 384, n=1)
    assert len(results) == 0

def test_delete_doc(tmp_store):
    tmp_store.upsert_chunks(
        shop_id=1, doc_id="removeme",
        chunks=["to be deleted"], embeddings=[[0.5] * 384],
    )
    tmp_store.delete_doc(shop_id=1, doc_id="removeme")
    results = tmp_store.query(shop_id=1, embedding=[0.5] * 384, n=1)
    assert len(results) == 0
