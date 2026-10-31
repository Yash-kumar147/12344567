"""
CIT Campus Scheduling Platform - Root Entrypoint for Cloud Deployments
Enables Render, Railway, or native Python hosts to run directly via:
    uvicorn main:app --host 0.0.0.0 --port $PORT
"""
import os
import sys

# Ensure backend directory is in python module search path
backend_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.main import app  # noqa: E402

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
