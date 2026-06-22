# Publicar el portal con Firebase Hosting (gratis, repo privado)

Resultado final: una URL tipo **https://misagi-sistema.web.app** que funciona en cualquier celular o PC, con tu login y módulos. Tu código se queda privado.

## Requisito: Node.js
Firebase necesita Node.js. Para saber si lo tienes, abre una terminal y escribe:
```
node -v
```
- Si responde algo como `v20.x` → ya lo tienes, sigue al paso 1.
- Si da error → instala **Node.js LTS** desde https://nodejs.org (instalador normal, siguiente-siguiente), cierra y reabre la terminal.

## Cómo abrir la terminal en la carpeta correcta
En **GitHub Desktop**: menú **Repository → Open in Command Prompt** (o "Open in PowerShell").
Eso abre la terminal ya ubicada en `...\CLAUDE+GITHUB\misagi-sistema`.

## Los 4 pasos
```
npm install -g firebase-tools
firebase login
firebase deploy --only hosting
```
Detalle:
1. **`npm install -g firebase-tools`** — instala la herramienta de Firebase (una sola vez).
2. **`firebase login`** — abre el navegador; inicia sesión con tu cuenta de Google (la misma de Firebase) y acepta. Una sola vez.
3. **`firebase deploy --only hosting`** — sube el sitio. Al terminar te muestra:
   `Hosting URL: https://misagi-sistema.web.app`

¡Esa es tu página! Ábrela en el celular e inicia sesión con tu correo y contraseña.

## Para actualizar el sitio en el futuro
Cada vez que cambiemos algo, solo vuelves a correr:
```
firebase deploy --only hosting
```

## Notas
- El `.firebaserc` ya apunta a tu proyecto `misagi-sistema`, así que no te preguntará cuál usar.
- El `firebase.json` ya define qué publicar (todo menos los scripts de migración y los `.md`).
- Si `firebase login` dice que ya estás logueado, perfecto, salta al deploy.
