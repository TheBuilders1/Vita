SET ROLE vita_producto_owner;

-- Un PDF no tiene ancho y alto propios: solo las imágenes los guardan.
ALTER TABLE producto.documents
    DROP CONSTRAINT documents_mime_type_check,
    ADD CONSTRAINT documents_mime_type_check
        CHECK (mime_type IN ('image/jpeg', 'image/png', 'application/pdf')),
    ALTER COLUMN width DROP NOT NULL,
    ALTER COLUMN height DROP NOT NULL,
    ADD CONSTRAINT documents_dimensions_check
        CHECK ((mime_type = 'application/pdf') = (width IS NULL AND height IS NULL));

RESET ROLE;
