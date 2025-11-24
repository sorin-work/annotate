"""Plain text helpers shared by documents, search and export."""

import re

_WORD_RE = re.compile(r"\w+(?:['’-]\w+)*")
_HEADING_RE = re.compile(r"^#{1,6}\s+(.+?)\s*#*\s*$")


def count_words(text: str) -> int:
    return len(_WORD_RE.findall(text))


def collapse_whitespace(text: str) -> str:
    return " ".join(text.split())


def excerpt(text: str, length: int = 200) -> str:
    """The first ``length`` characters of ``text`` on one line, cut at a word boundary."""
    lines = [line for line in text.splitlines() if not _HEADING_RE.match(line.strip())]
    flat = collapse_whitespace(" ".join(lines))
    if len(flat) <= length:
        return flat
    cut = flat[:length].rsplit(" ", 1)[0]
    return cut.rstrip(",.;:") + "…"


def snippet_around(text: str, needle: str, radius: int = 80) -> str:
    """A short single-line window of ``text`` around the first match of ``needle``."""
    index = text.lower().find(needle.lower()) if needle else -1
    if index < 0:
        return excerpt(text, radius * 2)
    start = max(0, index - radius)
    end = min(len(text), index + len(needle) + radius)
    window = collapse_whitespace(text[start:end])
    prefix = "…" if start > 0 else ""
    suffix = "…" if end < len(text) else ""
    return f"{prefix}{window}{suffix}"


def markdown_title(text: str) -> str | None:
    """The first level-one heading of a Markdown document, if it starts with one."""
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        match = _HEADING_RE.match(stripped)
        if match and stripped.startswith("# "):
            return match.group(1)
        return None
    return None
