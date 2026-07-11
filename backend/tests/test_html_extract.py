from app.services.html_extract import extract

PAGE = """<!doctype html>
<html><head>
  <title>  Slow Reading | The Quarterly  </title>
  <meta name="author" content="Ada Reader">
  <meta property="og:site_name" content="The Quarterly">
  <style>body { color: red }</style>
</head>
<body>
  <nav><a href="/">Home</a> <a href="/about">About</a></nav>
  <article>
    <h1>Slow   Reading</h1>
    <p>Reading slowly is a <em>skill</em> &amp; a habit.<br>It takes practice.</p>
    <script>track()</script>
    <h2>Why it matters</h2>
    <ul><li>Fewer distractions</li><li>Better <b>notes</b></li></ul>
    <blockquote><p>Read the best books first.</p></blockquote>
    <pre><code>def read():
    return "slowly"</code></pre>
    <aside>Subscribe to our newsletter!</aside>
  </article>
  <footer>© 2026</footer>
</body></html>"""


def test_extracts_the_article_as_markdown():
    page = extract(PAGE)
    assert page.title == "Slow Reading | The Quarterly"
    assert page.author == "Ada Reader"
    assert page.site_name == "The Quarterly"
    assert page.text == (
        "# Slow Reading\n\n"
        "Reading slowly is a skill & a habit.\nIt takes practice.\n\n"
        "## Why it matters\n\n"
        "- Fewer distractions\n\n"
        "- Better notes\n\n"
        "> Read the best books first.\n\n"
        '```\ndef read():\n    return "slowly"\n```'
    )


def test_falls_back_to_main_then_body():
    assert extract("<body><p>Intro</p><main><p>Body text</p></main></body>").text == "Body text"
    assert extract("<body><div>Just a div</div><p>And a paragraph</p></body>").text == (
        "Just a div\n\nAnd a paragraph"
    )


def test_copes_with_unclosed_tags():
    page = extract("<html><body><p>One<p>Two<div>Three</body>")
    assert page.text == "One\n\nTwo\n\nThree"
    assert page.title is None
