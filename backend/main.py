from fastapi import FastAPI
from pathlib import Path
import json


# ============================================================
# FASTAPI APP
# ============================================================

app = FastAPI(
    title="Novel Scraper API",
    description="Backend API for scraped novel data",
    version="1.0.0"
)


# ============================================================
# NOVELS DIRECTORY
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent
NOVELS_DIR = BASE_DIR / "novels"


# ============================================================
# HOME ENDPOINT
# ============================================================

@app.get("/")
def home():
    return {
        "message": "Novel Scraper API is running",
        "status": "success"
    }


# ============================================================
# GET ALL NOVELS
# ============================================================

@app.get("/novels")
def get_novels():

    novels = []

    for file_path in NOVELS_DIR.glob("*.json"):

        try:
            with open(
                file_path,
                "r",
                encoding="utf-8"
            ) as file:

                data = json.load(file)

                novels.append(data)

        except (json.JSONDecodeError, OSError):
            continue

    return {
        "total_novels": len(novels),
        "novels": novels
    }