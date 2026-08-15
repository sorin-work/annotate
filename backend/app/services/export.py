"""Render highlights as Markdown or CSV."""

import csv
import io
import re
import unicodedata
from collections.abc import Iterable
from datetime import UTC, datetime
from itertools import groupby

from app.models import Document, Highlight

CSV_COLUMNS = [
    "document",
    "author",
    "highlight_id",
    "quote",
    "note",
    "tags",
    "color",
    "start_offset",
    "end_offset",
    "created_at",
    "comments",
]


def slugify(value: str, fallback: str = "annotations") -> str:
    # Fold accents first ("Însemnări" -> "Insemnari") so they don't vanish from file names.
    ascii_value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_value.lower()).strip("-")
    return slug[:60].strip("-") or fallback


def _blockquote(text: str) -> str:
    return "\n".join(f"> {line}".rstrip() for line in text.strip().splitlines())


def _document_section(document: Document, highlights: list[Highlight], level: int) -> list[str]:
    lines = [f"{'#' * level} {document.title}", ""]
    meta = []
    if document.author:
        meta.append(f"*{document.author}*")
    if document.source_url:
        meta.append(f"<{document.source_url}>")
    if meta:
        lines += [" · ".join(meta), ""]

    if not highlights:
        lines += ["_No highlights yet._", ""]
    for highlight in highlights:
        lines += [_blockquote(highlight.quote), ""]
        if highlight.note:
            lines += [highlight.note.strip(), ""]
        if highlight.tags:
            lines += [" ".join(f"`#{tag.name}`" for tag in highlight.tags), ""]
        if highlight.comments:
            for comment in highlight.comments:
                body = " ".join(comment.body.split())
                lines.append(f"- {comment.created_at:%Y-%m-%d}: {body}")
            lines.append("")
    return lines


def document_markdown(document: Document, highlights: list[Highlight]) -> str:
    lines = _document_section(document, highlights, level=1)
    count = len(highlights)
    lines.append(
        f"<sub>{count} highlight{'s' if count != 1 else ''} · exported from annotate</sub>"
    )
    return "\n".join(lines) + "\n"


def highlights_markdown(highlights: Iterable[Highlight], title: str = "Highlights") -> str:
    ordered = sorted(
        highlights, key=lambda h: (h.document.title.lower(), h.document_id, h.start_offset)
    )
    exported = datetime.now(UTC).strftime("%Y-%m-%d")
    lines = [f"# {title}", "", f"Exported from annotate on {exported}.", ""]
    for _, group in groupby(ordered, key=lambda h: h.document_id):
        items = list(group)
        lines += _document_section(items[0].document, items, level=2)
    return "\n".join(lines).rstrip() + "\n"


def _safe_cell(value: str) -> str:
    # Spreadsheets treat cells starting with these characters as formulas.
    if value and value[0] in ("=", "+", "-", "@", "\t", "\r"):
        return "'" + value
    return value


def highlights_csv(highlights: Iterable[Highlight]) -> str:
    buffer = io.StringIO()
    writer = csv.writer(buffer, lineterminator="\n")
    writer.writerow(CSV_COLUMNS)
    for h in highlights:
        writer.writerow(
            [
                _safe_cell(h.document.title),
                _safe_cell(h.document.author or ""),
                h.id,
                _safe_cell(h.quote),
                _safe_cell(h.note or ""),
                _safe_cell("; ".join(tag.name for tag in h.tags)),
                h.color,
                h.start_offset,
                h.end_offset,
                h.created_at.isoformat(),
                _safe_cell(" | ".join(" ".join(c.body.split()) for c in h.comments)),
            ]
        )
    return buffer.getvalue()
