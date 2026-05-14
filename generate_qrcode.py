import qrcode
import argparse

def generate_qr(url):
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    img.save("english-tutor-qr.png")
    print(f"QR code successfully generated and saved as 'english-tutor-qr.png' pointing to {url}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate a QR code for the English Tutor App")
    parser.add_argument("--url", default="https://example.com/english-tutor.html?key=YOUR_API_KEY", help="The full URL to encode in the QR code (including the ?key=...)")

    args = parser.parse_args()
    generate_qr(args.url)
