# BrandForge AI

BrandForge AI est un studio web qui transforme un brief simple en concept de marque, textes marketing, idées de contenus sociaux et aperçu de landing page.

## Ce qui fonctionne maintenant

- brief en 3 étapes avec nom, offre, objectif, audience, ton, style et marché
- génération locale cohérente du Brand Kit
- palette de couleurs calculée à partir du projet
- tagline, pitch, bio et CTA
- 3 idées de posts prêtes à adapter avec bouton Copier
- aperçu d'une landing page responsive
- sauvegarde automatique dans `localStorage`
- export du projet en JSON
- interface responsive desktop/mobile
- aucun secret/API key côté navigateur

## Démo

Le site est déployé via GitHub Pages :

https://kidasniger.github.io/BrandForge-AI/

## Architecture actuelle

La version publique est volontairement sans backend : toute la génération visible dans la démo se fait dans le navigateur. Cela permet de tester l'UX sans exposer de clé API.

## Roadmap produit

1. connecter un backend/serverless sécurisé à un fournisseur IA
2. enregistrer les projets dans une base de données et ajouter les comptes utilisateurs
3. générer de vraies images de marque et assets
4. permettre l'édition et l'export de la landing page
5. ajouter un système de crédits, abonnement et paiement
6. publier une landing page sur un sous-domaine personnalisé

## Important

Ne place jamais une clé API OpenAI, Anthropic, Google ou autre dans `index.html` ou dans un dépôt public. Les secrets doivent rester côté serveur/backend avec des variables d'environnement.
