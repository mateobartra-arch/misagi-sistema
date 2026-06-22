# Cómo subir esto a GitHub y que yo siga trabajando dentro

## Opción A — GitHub Desktop (la que elegiste)

1. Instala **GitHub Desktop** e inicia sesión con tu cuenta.
2. `File → New repository`:
   - **Name**: `misagi-sistema`
   - **Local path**: elige una carpeta (ej. `Documentos/GitHub`).
   - Crea el repositorio. GitHub Desktop crea la carpeta `…/GitHub/misagi-sistema`.
3. **Copia dentro de esa carpeta** todo el contenido de la carpeta `misagi-sistema` que te entrego (que queden ahí `index.html`, `assets/`, `flota/`, etc.).
4. En GitHub Desktop verás todos los archivos como cambios → escribe un resumen ("Versión inicial del sistema") → **Commit to main** → **Publish repository** (puedes dejarlo privado).

### Para que yo trabaje dentro y tú solo hagas "push"
Una vez exista esa carpeta local, **conéctala aquí** (te pediré acceso a la carpeta). A partir de ahí yo edito y creo archivos directamente dentro; tú solo revisas en GitHub Desktop y haces *Commit + Push*. Ya no copias archivos a mano.

## Opción B — Conectar GitHub directo (si más adelante quieres)
Se puede automatizar el push si activas el conector de GitHub desde los ajustes de la app. Hoy ese servidor pide una autenticación que esta vista no expone; si lo activas, yo podría crear el repo y subir los cambios sin GitHub Desktop.

## Importante antes del primer push
- El archivo `.gitignore` ya evita subir las **claves de servicio** de Firebase. No borres esa protección.
- En `assets/firebase-config.js` van datos públicos de Firebase (no son secreto), está bien que se suban.
- Nunca subas archivos `*-key.json` ni `serviceAccountKey.json`.
