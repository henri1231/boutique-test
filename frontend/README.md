# Frontend React (Vite + PWA) — BoutiqueStock Togo

Interface web responsive mobile-first et bureau pour la gestion de stock d'une boutique au Togo.

## Caractéristiques
- **Design Commerçant Ouest-Africain** : Palette vert émeraude, or chaud et alertes corail.
- **PWA Installable** : Fonctionne sur smartphone Android/iOS avec `manifest.json` et `sw.js` (icône sur l'écran d'accueil, mode standalone, cache hors-ligne).
- **Responsive Mobile & Desktop** :
  - Sur mobile : barre de navigation basse ergonomique (au pouce), actions rapides `+` et `−`, modales fluides en bas d'écran.
  - Sur ordinateur : navigation haute, tableau de bord étendu avec cartes de KPIs synthétiques.
- **Alertes de Rupture en temps réel** :
  - Badge rouge pulsant **"Rupture proche"** dès qu'un produit a une quantité $\le$ seuil d'alerte (2 par défaut, réglable par article).
  - Centre de notifications avec cloche et compteur en temps réel.
- **Intégration TMoney Togocom** :
  - Détection automatique du blocage **HTTP 402 Payment Required** via intercepteur API.
  - Formulaire de paiement TMoney Togo avec validation USSD simulée (*145#).
  - Bouton de simulation d'expiration pour tester en direct le blocage et le déblocage.

---

## Lancement en Développement

### 1. Installer les dépendances
```bash
cd frontend
npm install
```

### 2. Démarrer le serveur de développement Vite
```bash
npm run dev
```
Par défaut, Vite est disponible sur `http://localhost:5173/`.

### 3. Compiler pour la production
```bash
npm run build
```
Les fichiers générés sont placés dans `dist/`.
