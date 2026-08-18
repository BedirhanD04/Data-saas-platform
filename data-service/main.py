from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from io import BytesIO
import pandas as pd

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:3000",
    "https://data-saas-platform.vercel.app",
    "https://data-saas-platform-git-main-bedirhan5.vercel.app",
],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"message": "Data service is running"}


MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

@app.post("/analyze")
async def analyze_file(file: UploadFile):
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 10MB)")

    file_like = BytesIO(content)

    if file.filename.endswith(".xlsx"):
        df = pd.read_excel(file_like)
    else:
        df = pd.read_csv(file_like, sep=None, engine="python")

    numeric_columns = df.select_dtypes(include="number").columns

    stats = {}
    for col in numeric_columns:
        stats[col] = {
            "mean": round(float(df[col].mean()), 2),
            "min": float(df[col].min()),
            "max": float(df[col].max()),
        }

    return {
        "filename": file.filename,
        "rows": len(df),
        "columns": list(df.columns),
        "stats": stats,
    }