"""
CIT Campus Scheduling Platform - Backend Direct Entrypoint
Enables execution from within the backend/ folder:
    uvicorn main:app --host 0.0.0.0 --port $PORT
"""
import os
import sys

# Ensure this directory is in sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from app.main import app  # noqa: E402

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
