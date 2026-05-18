from fastapi import FastAPI

app = FastAPI(title="MoSPAMS AI Service", version="1.0.0")

# chat.router is wired in Task 13 when chat/router.py is created
# from chat.router import router as chat_router
# app.include_router(chat_router)

@app.get("/health")
def health():
    return {"status": "ok"}
