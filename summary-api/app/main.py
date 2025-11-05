from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Summary API",
    description="API for text summarization services",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Summary API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/summarize")
async def summarize_text(text: str):
    return {"summary": f"Summary of: {text[:50]}..."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)