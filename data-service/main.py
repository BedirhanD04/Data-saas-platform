import os
import jwt
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, HTTPException, Request, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from io import BytesIO
import pandas as pd

load_dotenv()

app = FastAPI()

JWT_SECRET = os.environ["JWT_SECRET"]

def verify_token(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="No token provided")

    token = authorization.split(" ")[1]

    try:
        decoded = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return decoded
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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
@limiter.limit("20/15minutes")
async def analyze_file(request: Request, file: UploadFile, user: dict = Depends(verify_token)):
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