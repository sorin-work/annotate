import io

import pytest
from pypdf import PdfReader, PdfWriter

from app.errors import AppError
from app.services.pdf import clean_page_text, extract_pdf
from tests.pdf_fixture import make_pdf


def test_clean_page_text_unwraps_lines_and_hyphens():
    raw = "This is a para-\ngraph that wraps\nacross lines.\n\n\n\nNext   paragraph."
    assert clean_page_text(raw) == "This is a paragraph that wraps across lines.\n\nNext paragraph."


def test_extract_pdf_reads_pages_and_title():
    data = make_pdf(["First page text.", "Second page text."], title="My Paper")
    text, title = extract_pdf(data)
    assert "First page text." in text
    assert "Second page text." in text
    assert text.index("First") < text.index("Second")
    assert title == "My Paper"


def test_extract_pdf_rejects_garbage():
    with pytest.raises(AppError) as error:
        extract_pdf(b"definitely not a pdf")
    assert error.value.code == "invalid_file"


def test_extract_pdf_without_text():
    with pytest.raises(AppError) as error:
        extract_pdf(make_pdf([""]))
    assert error.value.code == "unsupported_file"


def test_encrypted_pdfs_are_rejected_with_a_clear_error():
    writer = PdfWriter(clone_from=PdfReader(io.BytesIO(make_pdf(["Secret words"]))))
    writer.encrypt(user_password="secret", algorithm="RC4-128")
    buffer = io.BytesIO()
    writer.write(buffer)

    with pytest.raises(AppError) as error:
        extract_pdf(buffer.getvalue())
    assert error.value.code == "unsupported_file"
    assert error.value.message == "Encrypted PDFs are not supported"
