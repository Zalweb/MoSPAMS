import logging
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from chat.router import router as chat_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="MoSPAMS AI Service", version="1.0.0")
app.include_router(chat_router)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception on %s %s: %s", request.method, request.url.path, exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal AI service error. Please try again."},
    )


@app.get("/health")
def health():
    return {"status": "ok"}

