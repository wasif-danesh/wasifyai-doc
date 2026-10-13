# Local RAG starter

A small local-first foundation for document ingestion and grounded chat. The first slice handles plain text, Markdown, and CSV files, then chunks, embeds, and stores them for semantic retrieval. It uses React + TypeScript + Tailwind CSS + shadcn/ui, FastAPI, SQLite, Qdrant, and Ollama.

## Architecture

- **React + TypeScript + Tailwind CSS + shadcn/ui** provides the local workspace UI. shadcn/ui components live in the frontend source tree and can be customized with project-specific Tailwind classes.
- **FastAPI** validates uploads and exposes document, search, chat, and health endpoints.
- **SQLite** stores document names, hashes, timestamps, and chunk counts. Originals live in `data/uploads/`.
- **Qdrant** stores chunk embeddings and source metadata. Its data is persisted in a Docker volume.
- **Ollama** runs on the host and provides both embedding and chat models. Keeping inference outside Docker avoids GPU passthrough and model-volume complexity.
- **Ingestion** extracts text, makes overlapping chunks, embeds in Ollama, then writes vectors and metadata. Search embeds the query and retrieves the nearest chunks. Chat sends those chunks to Ollama and returns source citations.

The first slice supports `.txt`, `.md`, and `.csv` to keep the ingestion path reviewable. PDF/DOCX extraction and Google Docs export/OAuth are follow-on adapters. Google Docs needs either a downloaded export or explicit Google authorization; it is not a local file format.

## Phases

1. **Local foundation (this starter):** React/Tailwind/shadcn UI, FastAPI, Qdrant Compose service, Ollama integration, TXT/MD/CSV ingestion, semantic search, cited chat, and unit tests.
2. **Document coverage:** PDF and DOCX extraction with page/section metadata; HTML and common text formats; duplicate detection and re-index/delete flows.
3. **Ingestion quality:** background jobs and progress, robust encoding/size limits, parser error reporting, configurable chunking, re-embedding when models change.
4. **Product workflows:** collections, filters, chat history, source previews, summary generation, export to PDF and PPTX.
5. **Hardening:** packaging, backup/restore, security review, offline UX, and optional Google Drive OAuth/export integration.

## Trade-offs

- **Qdrant vs embedded vector DB:** Qdrant is a simple Docker service with filtering and a clear path to larger corpora. A purely in-process database would use fewer services, but would make persistence and multi-user growth less flexible.
- **SQLite metadata vs PostgreSQL:** SQLite is easy to back up and ideal for one-user local-first operation. Move to PostgreSQL only if multi-user concurrency or remote deployment becomes a real need.
- **Host Ollama vs container Ollama:** host Ollama is less brittle across CPU/GPU setups and keeps model files under the user's usual Ollama install. The app remains local; Qdrant is the only required container.
- **Local embeddings vs hosted APIs:** all document text stays on the machine and incurs no per-token API cost. Quality and speed depend on the selected local models and hardware.
- **Retrieval quality vs simplicity:** this slice uses cosine nearest-neighbour search and a fixed overlap chunker. Hybrid search, reranking, and evaluation should be added only after a representative document set exists.

## Run locally

Prerequisites: Docker Compose, Python 3.11+, Node.js 20+, and [Ollama](https://ollama.com/download).

1. Start Qdrant: `docker compose up -d qdrant`
2. In another terminal, pull models: `ollama pull nomic-embed-text` and `ollama pull llama3.2`
3. Start the API from this directory:

   ```sh
   cd backend
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload --port 8000
   ```

4. Start the UI:

   ```sh
   cd frontend
   npm install
   npm run dev
   ```

Open the Vite URL shown in the terminal. Backend configuration is in `backend/.env.example`. Set `OLLAMA_BASE_URL` to `http://host.docker.internal:11434` only if you later run the API in Docker; the current API runs on the host and defaults to `http://localhost:11434`.

## Tests

From `backend/`, run `pytest`. The unit tests cover text chunking and extraction boundaries without requiring Ollama or Docker. End-to-end ingestion and retrieval need the local services running and will be added as a separate integration check.
