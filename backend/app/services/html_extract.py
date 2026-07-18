"""Turn a web page into readable Markdown-ish text.

Deliberately simple: keep the article (or main, or body), drop navigation,
scripts and other chrome, and write headings, paragraphs, list items, quotes
and code blocks as Markdown so the reader renders them.
"""

from dataclasses import dataclass, field
from html.parser import HTMLParser

SKIP = {
    "script", "style", "noscript", "template", "svg", "canvas", "iframe",
    "nav", "header", "footer", "aside", "form", "button", "select", "figure",
}  # fmt: skip
HEADINGS = {"h1": 1, "h2": 2, "h3": 3, "h4": 4, "h5": 5, "h6": 6}
BLOCKS = {"p", "div", "section", "li", "blockquote", "pre", "dd", "dt", "td", "th", "tr", *HEADINGS}
VOID = {"br", "img", "hr", "meta", "link", "input", "source", "wbr", "area", "col", "embed"}


@dataclass
class ExtractedPage:
    title: str | None
    author: str | None
    site_name: str | None
    text: str


@dataclass
class _Block:
    kind: str
    region: int  # 2 inside <article>, 1 inside <main>, 0 elsewhere
    parts: list[str] = field(default_factory=list)


class _Extractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.blocks: list[_Block] = []
        self.meta: dict[str, str] = {}
        self.title_parts: list[str] = []
        self._stack: list[str] = []
        self._skip = 0
        self._in_title = False
        self._article = 0
        self._main = 0
        self._current: _Block | None = None

    # Which kind of block text goes into, from the innermost block tag.
    def _kind(self) -> str:
        for tag in reversed(self._stack):
            if tag in HEADINGS or tag in {"li", "blockquote", "pre"}:
                return tag
        return "p"

    def _region(self) -> int:
        return 2 if self._article else 1 if self._main else 0

    def _flush(self) -> None:
        self._current = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "meta":
            values = dict(attrs)
            key = values.get("property") or values.get("name")
            if key and values.get("content"):
                self.meta.setdefault(key.lower(), values["content"].strip())
            return
        if tag in VOID:
            if tag == "br" and self._current is not None:
                self._current.parts.append("\n")
            return
        self._stack.append(tag)
        if tag in SKIP:
            self._skip += 1
        elif tag == "title":
            self._in_title = True
        elif tag == "article":
            self._article += 1
        elif tag == "main":
            self._main += 1
        if tag in BLOCKS:
            self._flush()

    def handle_endtag(self, tag: str) -> None:
        if tag in VOID or tag not in self._stack:
            return
        # Close everything up to the matching tag; real pages leave tags open.
        while self._stack:
            open_tag = self._stack.pop()
            if open_tag in SKIP:
                self._skip -= 1
            elif open_tag == "title":
                self._in_title = False
            elif open_tag == "article":
                self._article -= 1
            elif open_tag == "main":
                self._main -= 1
            if open_tag == tag:
                break
        if tag in BLOCKS:
            self._flush()

    def handle_data(self, data: str) -> None:
        if self._in_title:
            self.title_parts.append(data)
            return
        if self._skip or not self._stack:
            return
        kind = self._kind()
        if kind != "pre" and not data.strip():
            if self._current is not None:
                self._current.parts.append(" ")
            return
        if self._current is None or self._current.kind != kind:
            self._current = _Block(kind=kind, region=self._region())
            self.blocks.append(self._current)
        self._current.parts.append(data)


def _render(block: _Block) -> str:
    raw = "".join(block.parts)
    if block.kind == "pre":
        return f"```\n{raw.strip(chr(10))}\n```"
    text = (
        " ".join(raw.split())
        if "\n" not in raw
        else "\n".join(" ".join(line.split()) for line in raw.split("\n") if line.strip())
    )
    if not text:
        return ""
    if block.kind in HEADINGS:
        return f"{'#' * HEADINGS[block.kind]} {' '.join(text.split())}"
    if block.kind == "li":
        return f"- {text}"
    if block.kind == "blockquote":
        return "\n".join(f"> {line}" for line in text.split("\n"))
    return text


_TITLE_SEPARATORS = (" | ", " - ", " — ", " – ", " · ", " :: ")


def tidy_title(title: str | None, site_name: str | None) -> str | None:
    """Drop a trailing " | Site Name" from a page title."""
    if not title or not site_name:
        return title
    for separator in _TITLE_SEPARATORS:
        suffix = f"{separator}{site_name}"
        if title.lower().endswith(suffix.lower()) and len(title) > len(suffix):
            return title[: -len(suffix)].strip()
    return title


def extract(html: str) -> ExtractedPage:
    parser = _Extractor()
    parser.feed(html)
    parser.close()

    best = max((block.region for block in parser.blocks), default=0)
    rendered = [_render(b) for b in parser.blocks if b.region == best]
    text = "\n\n".join(part for part in rendered if part)

    meta = parser.meta
    title = meta.get("og:title") or " ".join("".join(parser.title_parts).split()) or None
    author = meta.get("author") or meta.get("article:author") or None
    if author and author.startswith(("http://", "https://")):
        author = None  # article:author is sometimes a profile url
    site_name = meta.get("og:site_name") or meta.get("application-name")
    return ExtractedPage(
        title=tidy_title(title, site_name), author=author, site_name=site_name, text=text
    )
