from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def main() -> None:
    output = Path("vita-demo-document.png")
    image = Image.new("RGB", (1200, 700), "white")
    draw = ImageDraw.Draw(image)
    # Incluida en Pillow: la muestra sale igual en cualquier sistema.
    font = ImageFont.load_default(size=42)

    lines = [
        "DOCUMENTO DE PRUEBA - NO VALIDO",
        "PERSONA FICTICIA",
        "FECHA DE NACIMIENTO: 01/02/1990",
        "FECHA DE EXPEDICION: 01/02/2020",
        "FECHA DE CADUCIDAD: 31/12/2030",
    ]
    for index, line in enumerate(lines):
        draw.text((70, 80 + index * 110), line, fill="black", font=font)
    image.save(output, format="PNG")
    print(f"Imagen sintética creada: {output}")


if __name__ == "__main__":
    main()
