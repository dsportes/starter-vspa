# starter-vspa

Tests élémentaires en environnement browser.

Utilise pnpm

Page à tester:
- créer une `pagexxx.vue` dans `src/pages`
- reporter son nom dans son import dans `main.ts` (3ième ligne)

### Dev
`npm run dev`

Debug sous VsCode:

    {
      // Use IntelliSense to learn about possible attributes.
      // Hover to view descriptions of existing attributes.
      // For more information, visit: https://go.microsoft.com/fwlink/?linkid=830387
      "version": "0.2.0",
      "configurations": [
        {
          "type": "chrome",
          "request": "launch",
          "name": "Chrome 8095",
          "url": "http://localhost:8095",
          "webRoot": "${workspaceFolder}"
        }
      ]
    }

### Build
`npm run build`

Lancement serveur en https: `./srv.ps1` ou `./srv.sh`

URL: https://test.sportes.fr:8098/dist

(ne plas oublier le **dist**).
