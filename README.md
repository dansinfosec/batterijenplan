# Batterijenplan blog — Django + React

Uitbreiding voor je bestaande repo (github.com/dansinfosec/batterijenplan).

```
bp/
├── backend/
│   ├── blog/                 # → kopieer naast calculators/ en leads/
│   ├── api/                  # → idem
│   ├── requirements-blog.txt # extra pip-dependencies
│   └── INTEGRATIE.md         # stap-voor-stap: settings.py & urls.py aanpassen
└── frontend/                 # → kopieer als map in je repo-root
```

## Snelstart

1. Volg `backend/INTEGRATIE.md` (5 kleine stappen: pip install,
   settings, urls, migrate, testpost aanmaken).
2. Frontend:
   ```bash
   cd frontend
   npm install
   npm run dev        # http://localhost:5173
   ```
   Vite proxied `/api` en `/media` automatisch naar Django op poort 8000,
   dus je hebt in development geen CORS-gedoe.

## Design

"Industrieel energielabel": papierwit, inktzwart, hazard-geel, koper.
- Elke artikelkaart is een batterijcel: nokje bovenop, laadbalk onderaan
  waarvan de vulling de leestijd toont.
- De leesvoortgang op een artikelpagina is een gele laadbalk bovenin.
- Hero bevat een batterij die oplaadt bij het laden van de pagina
  (respecteert prefers-reduced-motion).

## Veiligheidsnotitie

`body_html` wordt met `dangerouslySetInnerHTML` gerenderd. Dat is oké
zolang alleen jij (via de Django-admin) posts schrijft. Laat je ooit
derden posts schrijven, voeg dan sanitization toe (bijv. `bleach` in de
serializer of `dompurify` in React).
