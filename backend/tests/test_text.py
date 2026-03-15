from app.services.text import (
    count_words,
    excerpt,
    like_pattern,
    markdown_title,
    snippet_around,
)


def test_count_words_handles_contractions_and_hyphens():
    assert count_words("Don't over-think it, they're fine.") == 5
    assert count_words("") == 0


def test_excerpt_skips_headings_and_cuts_on_words():
    text = "# Title\n\n" + "word " * 100
    result = excerpt(text, 30)
    assert not result.startswith("#")
    assert result.endswith("…")
    assert len(result) <= 31
    assert excerpt("short text") == "short text"


def test_snippet_around_match():
    text = "x" * 200 + " the needle is here " + "y" * 200
    snippet = snippet_around(text, "NEEDLE", radius=10)
    assert "needle" in snippet
    assert snippet.startswith("…") and snippet.endswith("…")


def test_snippet_without_match_falls_back_to_excerpt():
    assert snippet_around("Just some text", "missing") == "Just some text"


def test_markdown_title():
    assert markdown_title("\n# Hello world\n\nBody") == "Hello world"
    assert markdown_title("## Not level one\n") is None
    assert markdown_title("Body first\n# Later heading") is None


def test_like_pattern_escapes_wildcards():
    assert like_pattern(" 50% ") == "%50\\%%"
    assert like_pattern("snake_case") == "%snake\\_case%"
    assert like_pattern("a\\b") == "%a\\\\b%"
