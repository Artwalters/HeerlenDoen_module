# 🗺️ HeerlenDoen Module

Een volledig gemodulariseerde interactieve kaart applicatie voor Heerlen, gebouwd met Mapbox GL JS en geoptimaliseerd voor Webflow integratie.

## 🚀 Live Demo

**Production URL:** `https://artwalters.github.io/HeerlenDoen_module/public/app.js`  
**CSS URL:** `https://artwalters.github.io/HeerlenDoen_module/public/app.css`

## 📦 Webflow Integratie

### Stap 1: CSS Toevoegen
In je Webflow project **Site Settings** → **Custom Code** → **Head Code**:

```html
<link rel="stylesheet" href="https://artwalters.github.io/HeerlenDoen_module/public/app.css">
```

### Stap 2: JavaScript Toevoegen  
In **Footer Code** (voor de `</body>` tag):

```html
<script src="https://artwalters.github.io/HeerlenDoen_module/public/app.js"></script>
```

### Stap 3: Mapbox Token Instellen
Voeg je Mapbox access token toe in je site's **Custom Code**:

```html
<script>
  // Zet je Mapbox token hier
  window.MAPBOX_ACCESS_TOKEN = 'your_mapbox_token_here';
</script>
```

## 🏗️ Project Structuur

```
src/
├── app.js                 # Hoofd applicatie (110 lijnen)
├── app.css               # Styling
└── modules/
    ├── config.js         # Configuratie & instellingen
    ├── state.js          # Globale state management  
    ├── dataLoader.js     # CMS data loading (399 lijnen)
    ├── markers.js        # Marker management (219 lijnen)
    ├── filters.js        # Filter functionaliteit (117 lijnen)
    ├── geolocation.js    # GPS tracking (758 lijnen)
    ├── popups.js         # Popup systeem (1000+ lijnen)
    ├── mapInteractions.js # Map event handlers
    ├── boundaryUtils.js  # Grenscontrole & teleport
    ├── threejs.js        # 3D modellen & visualisaties
    ├── poi.js            # POI filtering
    ├── tour.js           # Complete tour/walkthrough
    └── toggle3D.js       # 3D performance toggle
```

## ✨ Features

- 🗺️ **Interactieve Mapbox kaart** met custom markers
- 📍 **Geolocation** met boundary checking  
- 🏢 **3D gebouwen** en custom 3D modellen
- 🎯 **Smart filtering** per categorie
- 💬 **Rich popups** met AR integratie
- 🎪 **Guided tour** voor nieuwe gebruikers
- ⚡ **Performance monitoring** en optimalisatie
- 📱 **Volledig responsive** design

## 🔧 Development

### Lokaal ontwikkelen
```bash
# Clone repository
git clone https://github.com/Artwalters/HeerlenDoen_module.git
cd HeerlenDoen_module

# Install dependencies  
pnpm install

# Start development server
pnpm run dev

# Build for production
pnpm run build
```

### Deployment Workflow

1. **Push naar `main` branch** 
2. **GitHub Actions** bouwt automatisch
3. **GitHub Pages** deployment
4. **Files beschikbaar** op CDN URLs

## 🌐 CDN URLs

Na elke push naar main zijn de files beschikbaar via:

- **JavaScript:** `https://artwalters.github.io/HeerlenDoen_module/public/app.js`
- **CSS:** `https://artwalters.github.io/HeerlenDoen_module/public/app.css`

## 📋 Webflow CMS Vereisten

De applicatie verwacht deze CMS collecties in Webflow:

### Location Collection (`#location-list`)
- `#locationID` - Unieke identifier
- `#locationLatitude` - Latitude coordinate  
- `#locationLongitude` - Longitude coordinate
- `#name` - Locatie naam
- `#category` - Categorie voor filtering
- `#icon` - Marker icon URL
- `#image` - Hoofd afbeelding
- En meer velden voor beschrijvingen, contactinfo, etc.

### AR Location Collection (`#location-ar-list`)  
- `#latitude_ar` - AR latitude
- `#longitude_ar` - AR longitude
- `#name_ar` - AR locatie naam
- `#link_ar_mobile` - Mobile AR link
- `#link_ar_desktop` - Desktop AR link
- En meer AR-specifieke velden

## 🛠️ Configuratie

Pas `src/modules/config.js` aan voor:
- Mapbox styling
- Kaart centrum en zoom levels  
- Boundary instellingen
- Performance instellingen

## 📊 Performance

- **Modulaire architectuur** voor betere maintainability
- **Tree shaking** voor kleinere bundles
- **Lazy loading** van zware assets
- **Performance monitoring** met auto-fallbacks
- **3D toggle** voor langzamere devices

## 🤝 Contributing

1. Fork het project
2. Maak een feature branch (`git checkout -b feature/awesome-feature`)
3. Commit changes (`git commit -m 'Add awesome feature'`)
4. Push naar branch (`git push origin feature/awesome-feature`)
5. Open een Pull Request

## 📄 License

Dit project is gelicenseerd onder de MIT License.

## 🏆 Credits

Ontwikkeld voor **HeerlenDoen** - Ontdek de prachtige stad Heerlen!

---

**Built with ❤️ using modular architecture**