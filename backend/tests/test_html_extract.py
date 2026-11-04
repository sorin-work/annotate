from app.services.html_extract import extract, tidy_title

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
    assert page.title == "Slow Reading"
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


def test_tidy_title_strips_the_site_name():
    assert tidy_title("Slow Reading - The Quarterly", "The Quarterly") == "Slow Reading"
    assert tidy_title("The Quarterly", "The Quarterly") == "The Quarterly"
    assert tidy_title("Notes | Elsewhere", "The Quarterly") == "Notes | Elsewhere"
    assert tidy_title("Notes", None) == "Notes"


def test_leaves_out_cookie_banners_share_buttons_and_related_links():
    page = extract(
        """<article>
        <div class="cookie-banner"><p>We use cookies.</p></div>
        <p>The actual essay.</p>
        <div class="post-share social"><a>Tweet</a></div>
        <section id="related_posts"><h2>You may also like</h2></section>
        <div role="complementary">Aside text</div>
        <p class="shared-notes">Shared notes stay.</p>
        </article>"""
    )
    assert page.text == "The actual essay.\n\nShared notes stay."


def test_meta_values_are_put_on_one_line():
    page = extract(
        """<meta property="og:title" content="
            A Long Title
            Over Two Lines ">
        <meta name="author" content="  Ada   Reader ">
        <p>Text</p>"""
    )
    assert page.title == "A Long Title Over Two Lines"
    assert page.author == "Ada Reader"
