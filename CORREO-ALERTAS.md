# Alertas de vencimiento por correo (SendGrid, 7 días antes)

Resultado: cada mañana, el sistema envía por correo lo que vence en ≤ 7 días
(documentos de unidades/conductores y EMO del personal). Sin que nadie abra nada.

## Piezas
1. **SendGrid** — envía los correos (gratis hasta 100/día).
2. **Extensión "Trigger Email"** de Firebase — toma lo que escribimos en la
   colección `mail` y lo manda por SendGrid.
3. **Función programada** (`functions/`) — cada día revisa vencimientos y crea
   los correos en `mail`.

## Pasos
### 1. SendGrid
- Crea cuenta en sendgrid.com → **Settings → API Keys → Create API Key** (permiso *Mail Send*).
- Copia la API key (empieza con `SG.`). Verifica un remitente (Single Sender) con un correo tuyo.

### 2. Extensión Trigger Email
- Consola Firebase → **Extensions** → instala **"Trigger Email from Firestore"**.
- Configura:
  - SMTP connection URI: `smtps://apikey:LA_API_KEY@smtp.sendgrid.net:465`
  - Email documents collection: `mail`
  - Default FROM: el remitente verificado en SendGrid.

### 3. Destinatarios
- En Firestore crea el documento **`config/alertas`** con un campo
  `correos` (array) = los Gmail que reciben el resumen. Ej:
  `["mateobartra@gmail.com", "rrhh@misagi.com"]`

### 4. Desplegar la función
La forma más fácil sin instalar nada: **Cloud Shell** (en la consola de Google Cloud, ícono `>_` arriba a la derecha):
```
git clone <tu repo>    # o sube la carpeta functions/
cd misagi-sistema
firebase deploy --only functions
```
(También se puede con Firebase CLI local: `firebase deploy --only functions`.)

Listo: la función `alertasVencimientos` corre cada día 7:00 a.m. (hora Perú).
