import os
import uuid
from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import chat.handler as _handler
from rag.ingestor import ingest_file
from rag.vectorstore import list_docs, delete_doc
import config

router = APIRouter()

ALLOWED_MIMES = {
    "application/pdf",
    "text/plain",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


class ChatRequest(BaseModel):
    shop_id:    int
    user_id:    int
    role:       str
    session_id: str
    message:    str


@router.post("/chat/owner")
@router.post("/chat/customer")
async def chat(req: ChatRequest):
    answer = await _handler.handle_chat(
        shop_id=req.shop_id, user_id=req.user_id, role=req.role,
        session_id=req.session_id, message=req.message,
    )
    return {"response": answer, "session_id": req.session_id}


@router.post("/chat/stream/owner")
@router.post("/chat/stream/customer")
async def chat_stream(req: ChatRequest):
    async def event_generator():
        async for token in _handler.handle_chat_stream(
            shop_id=req.shop_id, user_id=req.user_id, role=req.role,
            session_id=req.session_id, message=req.message,
        ):
            yield f"data: {token}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.post("/rag/ingest")
async def ingest(
    shop_id: int = Form(...),
    doc_name: str = Form(...),
    file: UploadFile = File(...),
):
    if file.content_type not in ALLOWED_MIMES:
        raise HTTPException(400, "Unsupported file type. Use PDF, TXT, or DOCX.")

    content = await file.read()
    if len(content) > config.MAX_UPLOAD_BYTES:
        raise HTTPException(400, "File exceeds 10 MB limit.")

    existing = list_docs(shop_id)
    if len(existing) >= config.MAX_DOCS_PER_SHOP:
        raise HTTPException(400, f"Document limit ({config.MAX_DOCS_PER_SHOP}) reached.")

    doc_id  = str(uuid.uuid4())
    tmp_dir = f"/tmp/mospams_uploads/{shop_id}"
    os.makedirs(tmp_dir, exist_ok=True)
    tmp_path = f"{tmp_dir}/{doc_id}.bin"

    try:
        with open(tmp_path, "wb") as f:
            f.write(content)
        count = ingest_file(shop_id=shop_id, doc_id=doc_id, file_path=tmp_path, mime=file.content_type)
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

    return {"doc_id": doc_id, "doc_name": doc_name, "chunks_indexed": count}


@router.delete("/rag/document/{doc_id}")
def remove_doc(doc_id: str, shop_id: int):
    delete_doc(shop_id=shop_id, doc_id=doc_id)
    return {"deleted": doc_id}


@router.get("/rag/documents")
def get_docs(shop_id: int):
    return {"documents": list_docs(shop_id)}
