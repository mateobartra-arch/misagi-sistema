# Crear Firebase y obtener la config (paso a paso)

Todo es gratis (plan Spark). Tiempo: ~5 minutos.

## 1. Crear el proyecto
1. Entra a **https://console.firebase.google.com** (con tu cuenta de Google).
2. Clic en **“Crear un proyecto”** (o “Add project”).
3. Nombre: **misagi-sistema** → Continuar.
4. Google Analytics: puedes **desactivarlo** (no hace falta) → Crear proyecto → espera y pulsa **Continuar**.

## 2. Activar el login por correo y contraseña
1. Menú izquierdo → **Compilación (Build) → Authentication**.
2. Botón **“Comenzar” / “Get started”**.
3. Pestaña **“Sign-in method”** → elige **“Correo electrónico/contraseña”**.
4. **Habilitar** el primer interruptor → **Guardar**.

## 3. Crear la base de datos
1. Menú izquierdo → **Compilación (Build) → Firestore Database**.
2. **“Crear base de datos” / “Create database”**.
3. Elige ubicación **`southamerica-east1`** (São Paulo, la más cercana a Perú) → Siguiente.
4. Empieza en **modo producción** → **Crear**.
   (Las reglas de seguridad correctas las subimos después con el archivo `migracion/firestore.rules`.)

## 4. Obtener la CONFIG (esto es lo que necesito)
1. Arriba a la izquierda, clic en la **⚙ (rueda) → Configuración del proyecto**.
2. Baja hasta **“Tus apps”** → clic en el ícono **`</>` (Web)**.
3. Apodo de la app: **misagi-web** → **Registrar app**.
4. Te mostrará un bloque parecido a esto:

```js
const firebaseConfig = {
  apiKey: "AIza...........",
  authDomain: "misagi-sistema.firebaseapp.com",
  projectId: "misagi-sistema",
  storageBucket: "misagi-sistema.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123...:web:abc..."
};
```

5. **Copia ese bloque completo y pégamelo en el chat.** (No es secreto: estos datos son públicos por diseño; lo que protege la base son las reglas de seguridad.)

Con eso yo relleno `assets/firebase-config.js`, creamos tu usuario administrador y dejamos el sistema en vivo.

---

### (Más adelante, no ahora) Clave de servicio para migrar datos
Cuando toque mover los datos de los aplicativos viejos, necesitarás una **clave privada**:
⚙ Configuración del proyecto → **Cuentas de servicio** → **Generar nueva clave privada** → se descarga un `.json`.
Ese archivo **sí es secreto**: lo guardas dentro de la carpeta del proyecto (el `.gitignore` ya lo protege) y **nunca** lo pegas en el chat.
