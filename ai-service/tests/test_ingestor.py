import pytest
from unittest.mock import patch, MagicMock


def test_chunk_text_splits_long_text():
    from rag.ingestor import chunk_text
    long = "word " * 2000          # 2000 words
    chunks = chunk_text(long)
    assert len(chunks) > 1
    assert all(len(c.split()) <= 520 for c in chunks)   # ~500 + overlap


def test_ingest_txt_creates_chunks(tmp_path, monkeypatch):
    monkeypatch.setenv("CHROMA_PATH", str(tmp_path / "chroma"))
    txt_file = tmp_path / "pricelist.txt"
    txt_file.write_text("Engine oil PHP 250\nAir filter PHP 180\n")

    with patch("rag.ingestor.upsert_chunks") as mock_upsert, \
         patch("rag.ingestor.embed_batch", return_value=[[0.1]*384, [0.2]*384]):
        from rag.ingestor import ingest_file
        ingest_file(shop_id=1, doc_id="doc-1", file_path=str(txt_file), mime="text/plain")
        mock_upsert.assert_called_once()
        call_kwargs = mock_upsert.call_args.kwargs
        assert call_kwargs["shop_id"] == 1
        assert call_kwargs["doc_id"] == "doc-1"
