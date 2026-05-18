from fastembed import TextEmbedding

_model: TextEmbedding | None = None

def _get_model() -> TextEmbedding:
    global _model
    if _model is None:
        _model = TextEmbedding("BAAI/bge-small-en-v1.5")
    return _model

def embed(text: str) -> list[float]:
    return next(_get_model().embed([text])).tolist()

def embed_batch(texts: list[str]) -> list[list[float]]:
    return [e.tolist() for e in _get_model().embed(texts)]
