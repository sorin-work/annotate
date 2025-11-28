"""Text extraction for uploaded PDFs.

We annotate the extracted text, not the rendered pages: this keeps highlights
as plain character offsets, the same as for text and Markdown documents.
"""

import io
import re

from pypdf import PdfReader
from pypdf.errors import PdfReadError

from app.errors import AppError

_HYPHEN_BREAK = re.compile(r"(\w)-\n(\w)")
_SINGLE_NEWLINE = re.compile(r"(?<!\n)\n(?!\n)")
_MANY_NEWLINES = re.compile(r"\n{3,}")


def clean_page_text(text: str) -> str:
    lines = [line.strip() for line in text.replace("\r", "\n").split("\n")]
    text = "\n".join(lines)
    # Join words split across lines, then unwrap lines inside a paragraph.
    text = _HYPHEN_BREAK.sub(r"\1\2", text)
    text = _SINGLE_NEWLINE.sub(" ", text)
    text = _MANY_NEWLINES.sub("\n\n", text)
    return re.sub(r"[ \t]{2,}", " ", text).strip()


def extract_pdf(data: bytes) -> tuple[str, str | None]:
    """Return ``(text, title)`` for a PDF file."""
    try:
        reader = PdfReader(io.BytesIO(data))
        pages = [clean_page_text(page.extract_text() or "") for page in reader.pages]
    except PdfReadError as exc:
        raise AppError("Could not read this PDF file", code="invalid_file") from exc

    text = "\n\n".join(page for page in pages if page)
    if not text.strip():
        raise AppError(
            "This PDF has no extractable text (scanned PDFs are not supported yet)",
            code="unsupported_file",
        )

    title = None
    metadata = reader.metadata
    if metadata and metadata.title:
        title = str(metadata.title).strip() or None
    return text, title
