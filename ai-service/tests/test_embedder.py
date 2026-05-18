def test_embed_returns_list_of_floats():
    from rag.embedder import embed
    result = embed("motorcycle oil change")
    assert isinstance(result, list)
    assert len(result) == 384   # BAAI/bge-small-en-v1.5 output dim
    assert isinstance(result[0], float)

def test_embed_batch_returns_list_of_lists():
    from rag.embedder import embed_batch
    results = embed_batch(["oil change", "tire replacement"])
    assert len(results) == 2
    assert len(results[0]) == 384
