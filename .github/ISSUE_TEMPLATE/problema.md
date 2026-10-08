---
name: Reportar un problema
about: Una falla de la suite, un bloqueo de instalación o un comportamiento observado en la demo
title: ""
labels: ""
assignees: ""
---

## Dónde ocurre

Indicá si el problema está en la instalación, la documentación, la suite o la demo. Si todavía no lo sabés, contá qué investigaste. Enlazá el caso TCxx o defecto Dxx relacionado, si existe.

## Cómo reproducirlo

Incluí precondiciones, datos de prueba propios y pasos o comando exacto. Indicá si se reproduce con `--workers=1 --retries=0` cuando corresponda.

## Resultado esperado y observado

Explicá qué debería ocurrir, en qué basás esa expectativa y qué ocurrió realmente.

## Entorno y evidencia

Indicá fecha de ejecución, sistema operativo, versión de Node, versión de Playwright, navegador y entorno bajo prueba. Adjuntá el error o captura relevante, sin `.env`, tokens, cookies ni datos privados.

## Datos y limpieza

Si creaste entidades en la demo, indicá cuáles y cómo las limpiaste. No elimines datos de otras personas para reproducir el problema.
