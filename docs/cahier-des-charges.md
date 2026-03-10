# Cahier des Charges

## InterviewCoach – Application d'analyse intelligente de pitch d'entretien

---

## Contexte du projet

Dans le marché de l'emploi actuel, de nombreux candidats échouent en entretien non pas par manque de compétences techniques, mais par **mauvaise présentation personnelle**.

Aujourd'hui, la préparation des entretiens se fait principalement :

- En répétant seul devant un miroir
- En demandant un avis subjectif à un proche
- En consultant des conseils génériques sur Internet

Ce mode de préparation entraîne :

- Une **absence de feedback objectif** et mesurable
- Une **difficulté à identifier précisément les faiblesses** (hésitations, manque de structure, ton peu confiant)
- **Aucun suivi des progrès** dans le temps
- Une **adaptation insuffisante au contexte** (startup, grande entreprise, entretien technique, etc.)

**L'objectif** est de concevoir et développer une application web permettant d'analyser automatiquement une présentation d'entretien, de fournir un feedback structuré et d'assurer un suivi d'amélioration mesurable.

---

## Les fonctionnalités

Mettre en place une application web d'analyse de pitch permettant de :

- Saisir une présentation personnelle (texte)
- Sélectionner un contexte d'entretien
- Analyser automatiquement le contenu
- Générer un score global et des scores par catégorie
- Fournir des recommandations concrètes et priorisées
- Conserver un historique des analyses
- Visualiser la progression dans le temps

---

## Rôles des utilisateurs et fonctionnalités

### Admin

- Gère les comptes utilisateurs
- Consulte les **statistiques globales** :
  - Nombre d'analyses
  - Score moyen
  - Taux d'amélioration
- Gère les templates de présentation
- Modère les contenus si nécessaire
- Configure les paramètres d'analyse (pondérations, seuils)

### Utilisateur (Candidat)

- Crée un compte
- Saisit une présentation personnelle
- Sélectionne un **contexte** :
  - Formel
  - Startup
  - Technique
  - Créatif
- Lance une analyse
- Consulte :
  - **Score global** (/100)
  - **Analyse du ton**
  - **Évaluation de la confiance**
  - **Lisibilité**
  - **Impact**
- Accède à des recommandations classées par priorité
- Modifie son texte et relance une analyse
- Consulte son historique
- Télécharge un rapport PDF

---

## Règles métier obligatoires

- Une analyse est liée à un utilisateur authentifié.
- Chaque analyse génère un **score global compris entre 0 et 100**.
- Les recommandations sont classées par priorité : `HIGH`, `MEDIUM`, `LOW`.
- L'historique **ne peut pas être supprimé** automatiquement.
- Le score est **recalculé à chaque nouvelle version** du texte.
- Les analyses sont conservées pour permettre une **comparaison temporelle**.

---

## Planification sur JIRA (OBLIGATOIRE)

La planification doit inclure :

### Epics

- Authentification
- Gestion des utilisateurs
- Analyse IA
- Historique et statistiques
- Dashboard
- Export PDF
- Front-end
- Back-end
- Docker
- CI/CD
- Tests

### User Stories

Exemples :

- *En tant qu'utilisateur, je veux analyser ma présentation pour recevoir un score.*
- *En tant qu'utilisateur, je veux voir mon évolution dans le temps.*
- *En tant qu'admin, je veux consulter les statistiques globales.*

### Exigences supplémentaires

- Référence des tickets dans les commits (ex : `IC-12`)
- Automatisation JIRA ↔ GitHub (passage en `Done` après merge PR)

---

## Partie Back-end

### Stack recommandée

- **NestJS** (TypeScript)
- **MongoDB** ou **PostgreSQL**

### Exigences techniques obligatoires

- Architecture modulaire
- DTO + validation (`class-validator`)
- Authentification JWT
- Gestion des rôles (`Admin` / `User`)
- Guards pour protection des routes
- Gestion globale des erreurs
- Codes HTTP cohérents
- Logger structuré

### Modules principaux

| Module             | Description                        |
| ------------------ | ---------------------------------- |
| Auth               | Authentification et autorisation   |
| Users              | Gestion des utilisateurs           |
| Analyses           | Analyse de pitch                   |
| Recommendations    | Recommandations priorisées         |
| Statistics         | Statistiques globales et par user  |
| PDF Export         | Génération et téléchargement PDF   |

### Tests Back-end (OBLIGATOIRES)

- Tests unitaires (services d'analyse)
- Tests sur génération de score
- Tests sur règles métier
- Tests end-to-end (scénario complet utilisateur)

---

## Partie Front-end (Next.js)

### Stack

- **Next.js** + **TypeScript**

### Exigences techniques obligatoires

- SSR pour page d'accueil
- CSR pour dashboard
- Routing dynamique (`/analysis/[id]`)
- Protection des routes selon rôle
- Gestion JWT
- Gestion d'état (Redux ou Context)
- Validation formulaire
- Affichage clair des erreurs

### Écrans obligatoires

| Écran                          | Description                              |
| ------------------------------ | ---------------------------------------- |
| Page d'accueil                 | Landing page (SSR)                       |
| Page inscription / connexion   | Formulaires d'authentification           |
| Dashboard utilisateur          | Vue d'ensemble des analyses              |
| Éditeur de présentation        | Saisie et modification du pitch          |
| Page de résultats              | Scores + recommandations                 |
| Historique                     | Liste des analyses passées               |
| Dashboard admin                | Statistiques globales et gestion         |

### Tests Front-end

- Tests de composants
- Test d'un flux complet :
  - Saisie texte
  - Analyse
  - Consultation résultats
  - Nouvelle version

---

## Partie Déploiement

### Docker

- Image Front-end
- Image Back-end
- Image Base de données
- `docker-compose.yml` fonctionnel
- Variables d'environnement (`.env.example` obligatoire)

### CI/CD (OBLIGATOIRE)

GitHub Actions avec :

- Install
- Lint
- Tests
- Build
- Échec si un job échoue
- Publication image Docker Hub

---

## Modalités pédagogiques

- Travail **individuel**.
- Durée estimée : **5 à 7 jours** (MVP fonctionnel).

---

## Livrables

- Code source propre et structuré
- Lien GitHub
- Historique de commits clair
- Diagramme de classes
- Documentation technique :
  - Architecture
  - Règles métier
  - Guide d'installation
- Pipeline CI/CD fonctionnelle
- Docker opérationnel

---

## Critères de performance

- Architecture propre
- Respect **SRP** et **DRY**
- Gestion robuste des erreurs
- Sécurité JWT correcte
- Validation des entrées
- Tests fiables
- Interface claire et utilisable
- Code défendable en soutenance
