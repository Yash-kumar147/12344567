"""
CIT Campus Scheduling Platform - Fallback Entrypoint if root directory set to src
"""
import os
import sys

parent = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
backend = os.path.join(parent, "backend")
if backend not in sys.path:
    sys.path.insert(0, backend)

from app.main import app  # noqa: E402

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port)
