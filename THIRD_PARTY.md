# Third-Party Dependencies & Licenses

All third-party open-source packages utilized in the Chilika Institute of Technology (CIT) Campus Scheduling Platform are listed below with their respective license classifications. All dependencies use permissive open-source licenses compatible with commercial and institutional deployment.

---

## 1. Backend Dependencies

| Package | Version | License | Primary Purpose in CIT Platform |
| :--- | :--- | :--- | :--- |
| **`ortools`** | `9.15.6755` | Apache 2.0 | Google OR-Tools CP-SAT constraint programming solver powering Stage 1 time assignment, Stage 2 room assignment, midsem exam scheduling, and minimal-move disruption rescheduling. |
| **`fastapi`** | `0.162.0` | MIT | High-performance asynchronous REST API framework providing all 20 `/api/v1` routes with automatic OpenAPI documentation. |
| **`uvicorn`** | `0.54.0` | BSD 3-Clause | Lightning-fast ASGI web server worker for asynchronous request handling. |
| **`pydantic`** | `2.14.2` | MIT | Data validation, type safety, and JSON serialization for schemas. |
| **`motor`** | `3.7.1` | Apache 2.0 | Official asynchronous Python driver for MongoDB. |
| **`pymongo`** | `4.19.0` | Apache 2.0 | Core MongoDB communication toolkit and BSON serializer. |
| **`bcrypt`** | `5.0.0` | Apache 2.0 | Secure one-way hashing for demo credentials (`Admin@123`, `Coord@123`, etc.). |
| **`pyjwt`** | `2.15.1` | MIT | Signed JSON Web Token creation, verification, and role-based claim encoding. |
| **`httpx`** | `0.28.1` | BSD 3-Clause | Async HTTP client for communicating with Gemini AI Gateway and testing API endpoints. |
| **`pytest`** | `9.2.0` | MIT | Automated test framework running 17 regression tests across rules, solver, bookings, and API. |
| **`python-multipart`** | `0.0.32` | Apache 2.0 | Form data and multipart parsing support for FastAPI. |

---

## 2. Frontend Dependencies

| Package | Version | License | Primary Purpose in CIT Platform |
| :--- | :--- | :--- | :--- |
| **`react`** | `18.3.1` | MIT | Core UI component lifecycle and declarative rendering. |
| **`react-dom`** | `18.3.1` | MIT | DOM rendering and reconciliation engine. |
| **`react-router-dom`** | `6.28.0` | MIT | Client-side routing, protected navigation guards, and role-based redirecting. |
| **`lucide-react`** | `1.16.0` | ISC | Accessible, modern iconography across all dashboard views. |
| **`recharts`** | `2.13.3` | MIT | Data visualization for room utilization distributions and scheduling trends. |
| **`tailwindcss`** | `3.4.15` | MIT | Utility-first CSS engine with CIT custom color tokens (`brand`: `#0D9488`, `page`: `#F5F7FB`, etc.). |
| **`vite`** | `5.4.11` | MIT | Next-generation frontend build tooling with hot-module replacement and minification. |
| **`typescript`** | `5.6.3` | Apache 2.0 | Static typing and compile-time verification across all React components. |

---

## 3. External Web Fonts & Assets
- **Inter Font:** Designed by Rasmus Andersson (SIL Open Font License 1.1), hosted via Google Fonts.
- **CIT Vector Mark:** Custom SVG embedded directly in application source.

