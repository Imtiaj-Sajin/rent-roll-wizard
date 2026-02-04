# backend\main.py
import os
import tempfile
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from extractors.commercial_retail import extract_rent_roll as extract_commercial_retail
from extractors.multifamily import extract_rent_roll as extract_multifamily

app = FastAPI(title="Rent Roll Extractor API")

# CORS - allow frontend to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to your frontend URL
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
    if rent_roll_type not in ["commercial_retail", "multifamily", "commercial_mall"]:
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
