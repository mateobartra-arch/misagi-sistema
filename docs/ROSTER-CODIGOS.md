# Códigos del Roster — leyenda oficial

Estos códigos se usan en el roster de conductores (módulo Operaciones › Roster) y alimentan el reporte de **Días efectivos**.

| Código | Significado | Cuenta como |
|---|---|---|
| **D** | Descanso | No trabajado |
| **P** | Presente (se presentó pero no salió a ruta) | 1 día efectivo |
| **M/D** | Medio día | ½ día efectivo |
| **H1, H2, H3** | Ruta **Hudbay** (día 1, 2, 3) | 1 día de ruta |
| **R1–R5** | Ruta **Raciemsa** | 1 día de ruta |
| **C1, C2** | Ruta **Cuajone** | 1 día de ruta |
| **T1, T2** | Ruta **Toquepala** | 1 día de ruta |
| **A1–A3** | Ruta **Hierro** | 1 día de ruta |

**Días efectivos** = días en ruta + días presente + ½ × medios días. El descanso (D) no cuenta.

**Días-conductor por cliente** = suma de días de ruta por cliente (Hudbay, Raciemsa, Cuajone, Toquepala, Hierro), útil para facturación y planeamiento.

> Si en el futuro aparece un código nuevo, agrégalo aquí y en la función `clasifica()` de `flota/operaciones/roster-analisis/index.html`.
