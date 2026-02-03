# Rent Roll Extractor Backend

FastAPI backend for extracting rent roll data from PDF files.

## Setup

```bash
cd backend
pip install -r requirements.txt
```

## Run

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Or:

```bash
python main.py
```

## API Endpoints

### Health Check
```
GET /health
```

### Extract Rent Roll
```
POST /extract/{rent_roll_type}
```

**Parameters:**
- `rent_roll_type`: One of `commercial_retail`, `multifamily`, `commercial_mall`
- `file`: PDF file (multipart form data)

**Currently Supported:**
- ✅ `commercial_retail` - Uses wall-based column boundary extraction
- 🔜 `multifamily` - Coming soon
- 🔜 `commercial_mall` - Coming soon

**Example with curl:**
```bash
curl -X POST "http://localhost:8000/extract/commercial_retail" \
  -F "file=@your_rent_roll.pdf"
```

**Response:**
```json
{
  "columns": ["BldgId", "SuitId", "OccupantName", ...],
  "rows": [
    {"BldgId": "CV802", "SuitId": "10507", "OccupantName": "Shearz!", ...},
    ...
  ],
  "meta": {
    "pages": 10,
    "total_rows": 158,
    "debug": {...}
  }
}
```

## Configuration

For production, update the CORS origins in `main.py` to your frontend URL.
