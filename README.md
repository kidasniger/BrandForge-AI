# BrandForge AI

BrandForge AI est un AI Launch Studio : un utilisateur décrit une idée de business et obtient une base de marque, du contenu, des assets visuels, un plan commercial et une landing page exportable.

## Produit actuel

### Pages
- Accueil : positionnement du produit et parcours
- Studio : brief + génération Groq
- Marque : Brand Kit, mission, positionnement, différenciation, valeurs, persona et palette
- Contenu : copy, posts, calendrier 7 jours, séquence email, script de vente et message WhatsApp
- Assets : logo SVG/PNG et 3 visuels sociaux SVG/PNG
- Croissance : offres à tester, mots-clés et leviers commerciaux
- Site : édition de titre/description/CTA et export d'un site HTML autonome
- Projets : sauvegarde locale, ouverture et suppression
- Templates : restaurant, e-commerce, coach et agence
- Offres : présentation des plans Free, Pro et Business
- Compte : état du compte et préparation du futur cloud

### IA
Le backend serverless utilise Groq avec la variable d'environnement GROQ_API_KEY. La clé n'est jamais envoyée au navigateur.
Le moteur demande un schéma enrichi comprenant notamment : tagline, mission, positioning, differentiation, personality, values, persona, painPoints, desires, proofPoints, offerIdeas, posts, contentCalendar, landingHeadline, landingDescription, siteSections, palette, seoTitle, seoDescription, keywords, salesScript, whatsappPitch, emailSequence et faq.

### Exports
- PDF : rapport de lancement imprimable
- SVG : logo et visuels sociaux
- PNG : logo et visuels sociaux
- HTML : landing page autonome

### Données
La version actuelle sauvegarde les projets dans localStorage afin de rester immédiatement utilisable sans compte.
Le schéma Supabase est préparé dans supabase/schema.sql pour la couche de synchronisation cloud, avec profils, projets, offres Chariow configurables depuis l’admin, suivi des Pulses Chariow et Row Level Security.

## Démo

GitHub Pages :
https://kidasniger.github.io/BrandForge-AI/

Backend :
https://brandforge-ai-xi.vercel.app/

## Architecture

GitHub Pages → pages HTML + assets/app.js → Vercel /api/generate → Groq
GitHub Pages → /api/checkout → Chariow Checkout → Pulse → /api/chariow-webhook → Supabase
GitHub Pages → /api/admin-billing → Supabase (admin)
GitHub Pages → /api/billing-config → tarifs publics

## Couche cloud

Le schéma Supabase est versionné. L'authentification et la synchronisation cloud deviennent opérationnelles lorsque le projet Supabase réel et ses paramètres publics sont reliés à l'application.

## Sécurité

Ne place jamais une clé API Groq ou un autre secret dans le frontend ou dans le dépôt public. Les secrets doivent rester côté serveur via les variables d'environnement.

## Variables Vercel pour le SaaS
Une fois les services connectés, renseigner dans Vercel :
- GROQ_API_KEY
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY (serveur uniquement)
- CHARIOW_API_KEY (serveur uniquement)
- CHARIOW_PULSE_SECRET (serveur uniquement)
- ADMIN_EMAIL (email du compte administrateur)

Les IDs produits et les prix Pro/Business se configurent depuis `admin.html`; ils ne sont plus obligatoirement stockés dans Vercel. Les anciennes variables `CHARIOW_PRODUCT_PRO` et `CHARIOW_PRODUCT_BUSINESS` restent acceptées comme secours.

Le navigateur ne doit recevoir que l'URL Supabase et la clé publique/publishable Supabase via /api/config. Les clés service_role, Groq, Chariow API et Pulse secret restent côté serveur.


<!-- vercel-deploy-trigger: auth-gate-2026-10-01 -->
