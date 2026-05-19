# backend\main.py
import os
import tempfile
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from extractors.commercial_retail import extract_rent_roll as extract_commercial_retail
from extractors.multifamily import extract_rent_roll as extract_multifamily
from extractors.guardian_storage import extract_rent_roll as extract_guardian_storage
from extractors.ga_portfolio import extract_rent_roll as extract_ga_portfolio
from extractors.shopping_mall import extract_rent_roll as extract_shopping_mall
from extractors.silvercup_studios import extract_rent_roll as extract_silvercup_studios
from extractors.american_storage import extract_rent_roll as extract_american_storage
from extractors.preit_service_mall import extract_rent_roll as extract_preit_service_mall

from usage import router as usage_router

app = FastAPI(title="Rent Roll Extractor API")
app.include_router(usage_router)

# CORS - allow frontend to call this API.
# allow_origins=["*"] + allow_credentials=True is invalid per the CORS spec and
# browsers will silently strip the header. List the real origins explicitly.
_extra_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://rentroll.bulkscraper.cloud",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8080",
        *_extra_origins,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.post("/extract/{rent_roll_type}")
async def extract_rent_roll(rent_roll_type: str, file: UploadFile = File(...)):
    """
    Extract rent roll data from a PDF file.
    
    Args:
        rent_roll_type: Type of rent roll (commercial_retail, multifamily, commercial_mall)
        file: PDF file to process
    
    Returns:
        JSON with columns, rows, and metadata
    """
    
    # Validate file type
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    # Check rent roll type
    if rent_roll_type not in ["commercial_retail", "multifamily", "commercial_mall", "guardian_storage", "ga_portfolio", "shopping_mall", "silvercup_studios", "american_storage", "preit_service_mall"]:
        raise HTTPException(status_code=400, detail=f"Unknown rent roll type: {rent_roll_type}")
    
    # commercial_mall is not implemented yet
    if rent_roll_type == "commercial_mall":
        raise HTTPException(
            status_code=501, 
            detail=f"Extraction for 'commercial_mall' is coming soon."
        )
    
    # Save uploaded file to temp location
    temp_file = None
    try:
        # Create temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_path = temp_file.name
        
        # Extract data based on type
        if rent_roll_type == "commercial_retail":
            result = extract_commercial_retail(temp_path)
        elif rent_roll_type == "multifamily":
            result = extract_multifamily(temp_path)
        elif rent_roll_type == "guardian_storage":
            result = extract_guardian_storage(temp_path)
        elif rent_roll_type == "ga_portfolio":
            result = extract_ga_portfolio(temp_path)
        elif rent_roll_type == "shopping_mall":
            result = extract_shopping_mall(temp_path)
        elif rent_roll_type == "silvercup_studios":
            result = extract_silvercup_studios(temp_path)
        elif rent_roll_type == "american_storage":
            result = extract_american_storage(temp_path)
        elif rent_roll_type == "preit_service_mall":
            result = extract_preit_service_mall(temp_path)
        
        return result
    
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")
    
    finally:
        # Always clean up the temp file
        if temp_file and os.path.exists(temp_path):
            os.unlink(temp_path)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
