from __future__ import annotations

import csv
import io
import re
from dataclasses import dataclass


SUPPORTED_EXTENSIONS = {".txt", ".md", ".csv"}


@dataclass(frozen=True)
class TextChunk:
    index: int
    text: str


def extract_text(filename: str, content: bytes) -> str:
    """Extract text from the formats in the initial vertical slice."""
    extension = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if extension not in SUPPORTED_EXTENSIONS:
        raise ValueError(f"Unsupported file type. Supported: {', '.join(sorted(SUPPORTED_EXTENSIONS))}")
    text = content.decode("utf-8-sig", errors="replace")
    if extension == ".csv":
        rows = csv.reader(io.StringIO(text))
        text = "\n".join(" | ".join(cell.strip() for cell in row) for row in rows)
    normalized = "\n".join(re.sub(r"[\t\r ]+", " ", line).strip() for line in text.splitlines())
    normalized = re.sub(r"\n{3,}", "\n\n", normalized).strip()
    if not normalized:
        raise ValueError("The file did not contain readable text.")
    return normalized


def chunk_text(text: str, chunk_size: int = 900, overlap: int = 140) -> list[TextChunk]:
    """Split text near word boundaries while keeping a small overlap."""
    if chunk_size < 1 or overlap < 0 or overlap >= chunk_size:
        raise ValueError("chunk_size must be positive and overlap must be smaller than chunk_size")
    words = text.split()
    if not words:
        return []
    chunks: list[TextChunk] = []
    start = 0
    index = 0
    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunks.append(TextChunk(index=index, text=" ".join(words[start:end])))
        if end == len(words):
            break
        start = end - overlap
        index += 1
    return chunks
