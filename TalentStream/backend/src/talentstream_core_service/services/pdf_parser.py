import fitz  # PyMuPDF
import base64

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Extracts all text from a PDF byte stream using PyMuPDF.
    Returns cleaned, concatenated text from each page.
    """
    text_parts: list[str] = []
    try:
        with fitz.open(stream=file_bytes, filetype="pdf") as doc:
            for page in doc:
                text_parts.append(page.get_text("text"))
    except Exception as exc:
        # Log and return empty string so the pipeline can continue gracefully
        print(f"[pdf_parser] ERROR extracting text: {exc}")
        return ""
    return "\n".join(text_parts).strip()


def convert_pdf_to_images(file_bytes: bytes) -> list[str]:
    """
    Converts each page of a PDF byte stream into a base64 encoded PNG image.
    This is used to pass visual representations of resumes to Vision LLMs
    to preserve layout, columns, tables, and icons.
    """
    base64_images: list[str] = []
    try:
        with fitz.open(stream=file_bytes, filetype="pdf") as doc:
            for page in doc:
                # Get a high-resolution pixmap of the page (2x scale)
                pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
                png_bytes = pix.tobytes("png")
                base64_str = base64.b64encode(png_bytes).decode("utf-8")
                base64_images.append(base64_str)
    except Exception as exc:
        print(f"[pdf_parser] ERROR converting PDF to images: {exc}")
    return base64_images
