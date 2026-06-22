# Migración de datos al sistema único

Objetivo: pasar la información de los **6 proyectos Firebase** y las **hojas de Google Sheets** actuales a **un solo proyecto Firebase nuevo**, sin perder datos y de forma repetible.

## Orden recomendado

1. **Crear el proyecto Firebase nuevo** (gratis, plan Spark) y activar:
   - Authentication → método *Correo electrónico/contraseña*.
   - Firestore Database → *Crear base de datos* en modo producción.

2. **Configurar la app web**: copia la config en `assets/firebase-config.js`.

3. **Subir las reglas de seguridad**: `firebase deploy --only firestore:rules`
   (usa `migracion/firestore.rules`).

4. **Crear usuarios**: `node usuarios-seed.js`
   (reemplaza la lista de DNIs/PINs que estaba en el código — ya no se usa).

5. **Migrar datos**:
   - Desde Firebase viejo → `node migrar-firestore.js`
   - Desde Google Sheets → `node migrar-sheets.js`

## Requisitos

```bash
npm install firebase-admin
```

Node 18 o superior (para `fetch` en `migrar-sheets.js`).

## Claves de servicio (NO subir a GitHub)

Cada script pide un archivo `.json` de cuenta de servicio:
Consola Firebase → ⚙ Configuración del proyecto → **Cuentas de servicio** → *Generar nueva clave privada*.

| Archivo | Proyecto |
|---|---|
| `origen-key.json`  | proyecto viejo (a leer) |
| `destino-key.json` | proyecto nuevo (a escribir) |
| `serviceAccountKey.json` | proyecto nuevo (para `usuarios-seed.js`) |

El `.gitignore` ya excluye estos archivos. **Nunca** los publiques.

## ¿"Que se jale automáticamente"?

- La migración es **un paso único** por proyecto/hoja (no continuo). Es lo correcto: pasas los datos una vez al sistema nuevo y desde ahí todo vive en un solo lugar.
- Si necesitas seguir alimentando el sistema desde una hoja mientras conviven los dos mundos, `migrar-sheets.js` se puede volver a ejecutar (o programar) para re-sincronizar. Lo ideal es cortar el uso de las hojas una vez migrado.

## Verificación posterior

- Revisa en la consola de Firestore que el número de documentos coincide.
- Entra al portal con un usuario de cada área y confirma que solo ve lo suyo.
