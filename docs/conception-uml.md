# Conception UML — InterviewCoach

---

## 1) Diagramme de cas d'utilisation (Use Case)

```mermaid
graph TB
    subgraph InterviewCoach
        UC1["S'inscrire"]
        UC2["Se connecter"]
        UC3["Se déconnecter"]
        UC4["Modifier son profil"]
        UC5["Saisir une présentation"]
        UC6["Sélectionner un contexte"]
        UC7["Lancer une analyse"]
        UC8["Consulter les résultats"]
        UC9["Consulter l'historique"]
        UC10["Visualiser la progression"]
        UC11["Télécharger un rapport PDF"]
        UC12["Gérer les utilisateurs"]
        UC13["Consulter les stats globales"]
        UC14["Gérer les templates"]
        UC15["Configurer les paramètres d'analyse"]
        UC16["Modérer les contenus"]
    end

    User(("👤 Utilisateur"))
    Admin(("🔧 Admin"))

    User --> UC1
    User --> UC2
    User --> UC3
    User --> UC4
    User --> UC5
    User --> UC6
    User --> UC7
    User --> UC8
    User --> UC9
    User --> UC10
    User --> UC11

    Admin --> UC2
    Admin --> UC3
    Admin --> UC12
    Admin --> UC13
    Admin --> UC14
    Admin --> UC15
    Admin --> UC16

    UC7 -.->|"«include»"| UC5
    UC7 -.->|"«include»"| UC6
    UC8 -.->|"«extend»"| UC11
```

---

## 2) Description des cas d'utilisation

### Acteur : Utilisateur (Candidat)

| # | Cas d'utilisation | Description | Préconditions | Postconditions |
|---|-------------------|-------------|---------------|----------------|
| UC1 | S'inscrire | Créer un compte avec email et mot de passe | Aucune | Compte créé, tokens générés |
| UC2 | Se connecter | Authentification par email/password | Compte existant et actif | Tokens JWT générés |
| UC3 | Se déconnecter | Invalidation du refresh token | Être authentifié | Session invalidée |
| UC4 | Modifier son profil | Mettre à jour les infos personnelles | Être authentifié | Profil mis à jour |
| UC5 | Saisir une présentation | Écrire ou coller un texte de pitch | Être authentifié | Texte prêt pour analyse |
| UC6 | Sélectionner un contexte | Choisir : Formel, Startup, Technique, Créatif | Être authentifié | Contexte sélectionné |
| UC7 | Lancer une analyse | Soumettre le texte + contexte pour analyse IA | UC5 + UC6 complétés | Analyse créée avec scores et recommandations |
| UC8 | Consulter les résultats | Voir score global, scores par catégorie, recommandations | Analyse existante | Résultats affichés |
| UC9 | Consulter l'historique | Lister toutes les analyses passées | Être authentifié | Liste des analyses affichée |
| UC10 | Visualiser la progression | Voir l'évolution des scores dans le temps (graphique) | Au moins 2 analyses | Graphique de progression affiché |
| UC11 | Télécharger un rapport PDF | Exporter les résultats d'une analyse en PDF | Analyse existante | Fichier PDF téléchargé |

### Acteur : Admin

| # | Cas d'utilisation | Description | Préconditions | Postconditions |
|---|-------------------|-------------|---------------|----------------|
| UC12 | Gérer les utilisateurs | Lister, suspendre, réactiver des comptes | Rôle ADMIN | Statut utilisateur modifié |
| UC13 | Consulter les stats globales | Voir nb analyses, score moyen, taux d'amélioration | Rôle ADMIN | Statistiques affichées |
| UC14 | Gérer les templates | CRUD de templates de présentation par contexte | Rôle ADMIN | Templates mis à jour |
| UC15 | Configurer les paramètres d'analyse | Modifier poids et seuils de scoring | Rôle ADMIN | Configuration mise à jour |
| UC16 | Modérer les contenus | Examiner et agir sur les contenus signalés | Rôle ADMIN | Contenu modéré |

---

## 3) Diagramme de classes (Class Diagram)

```mermaid
classDiagram
    class User {
        +UUID id
        +String email
        +String passwordHash
        +Role role
        +UserStatus status
        +String displayName
        +DateTime createdAt
        +DateTime updatedAt
        +DateTime lastLoginAt
        +register(email, password) User
        +login(email, password) Tokens
        +updateProfile(data) User
    }

    class RefreshToken {
        +UUID id
        +UUID userId
        +String tokenHash
        +DateTime expiresAt
        +Boolean isRevoked
        +DateTime createdAt
        +revoke() void
        +isValid() Boolean
    }

    class Analysis {
        +UUID id
        +UUID userId
        +Context context
        +String inputText
        +String inputTextHash
        +Int versionIndex
        +Int scoreGlobal
        +Int scoreTone
        +Int scoreConfidence
        +Int scoreReadability
        +Int scoreImpact
        +JSON modelMeta
        +DateTime createdAt
        +computeScores() void
        +generateRecommendations() Recommendation[]
    }

    class Recommendation {
        +UUID id
        +UUID analysisId
        +Category category
        +Priority priority
        +String title
        +String description
        +String[] examples
        +DateTime createdAt
    }

    class PitchTemplate {
        +UUID id
        +String title
        +Context context
        +String content
        +Boolean isActive
        +DateTime createdAt
        +DateTime updatedAt
    }

    class AnalysisConfig {
        +UUID id
        +JSON weights
        +JSON thresholds
        +DateTime updatedAt
        +getWeights() Map
        +getThresholds() Map
    }

    class AuditLog {
        +UUID id
        +UUID actorUserId
        +String action
        +String entityType
        +UUID entityId
        +JSON metadata
        +DateTime createdAt
    }

    class Role {
        <<enumeration>>
        ADMIN
        USER
    }

    class UserStatus {
        <<enumeration>>
        ACTIVE
        SUSPENDED
    }

    class Context {
        <<enumeration>>
        FORMAL
        STARTUP
        TECHNICAL
        CREATIVE
    }

    class Priority {
        <<enumeration>>
        HIGH
        MEDIUM
        LOW
    }

    class Category {
        <<enumeration>>
        TONE
        CONFIDENCE
        READABILITY
        IMPACT
        STRUCTURE
        GENERAL
    }

    User "1" --> "0..*" Analysis : creates
    User "1" --> "0..*" RefreshToken : has
    User "1" --> "0..*" AuditLog : generates
    Analysis "1" --> "1..*" Recommendation : contains
    Analysis --> Context : uses
    Analysis --> AnalysisConfig : applies
    Recommendation --> Priority : has
    Recommendation --> Category : belongs to
    User --> Role : has
    User --> UserStatus : has
    PitchTemplate --> Context : targets
```

---

## 4) Diagramme de séquence — Flux d'analyse

```mermaid
sequenceDiagram
    actor U as Utilisateur
    participant F as Frontend (Next.js)
    participant A as API (NestJS)
    participant S as AnalysisService
    participant DB as PostgreSQL

    U->>F: Saisit le texte + sélectionne contexte
    F->>A: POST /api/v1/analyses {context, inputText}
    A->>A: Valide JWT + DTO
    A->>S: analyzeText(context, inputText, userId)
    S->>S: normalizeText(inputText)
    S->>DB: Charger AnalysisConfig (weights, thresholds)
    DB-->>S: Config
    S->>S: computeToneScore()
    S->>S: computeConfidenceScore()
    S->>S: computeReadabilityScore()
    S->>S: computeImpactScore()
    S->>S: aggregateGlobalScore(scores, weights)
    S->>S: generateRecommendations(scores, thresholds)
    S->>DB: Persist Analysis + Recommendations (transaction)
    DB-->>S: analysisId
    S-->>A: AnalysisResult
    A-->>F: 201 {analysisId, scores, recommendations}
    F-->>U: Affiche résultats + recommandations
```

---

## 5) Diagramme de séquence — Authentification

```mermaid
sequenceDiagram
    actor U as Utilisateur
    participant F as Frontend
    participant A as API (Auth Module)
    participant DB as PostgreSQL

    Note over U,DB: Inscription
    U->>F: Remplit formulaire inscription
    F->>A: POST /api/v1/auth/register {email, password}
    A->>A: Valide DTO + unicité email
    A->>A: Hash password (argon2)
    A->>DB: INSERT User
    A->>A: Génère accessToken + refreshToken
    A->>DB: INSERT RefreshToken (hash)
    A-->>F: 201 {user, accessToken, refreshToken}
    F-->>U: Redirige vers Dashboard

    Note over U,DB: Connexion
    U->>F: Saisit email + password
    F->>A: POST /api/v1/auth/login {email, password}
    A->>DB: SELECT User par email
    A->>A: Vérifie password (argon2)
    A->>A: Génère tokens
    A->>DB: INSERT RefreshToken
    A-->>F: 200 {user, accessToken, refreshToken}

    Note over U,DB: Refresh Token
    F->>A: POST /api/v1/auth/refresh {refreshToken}
    A->>DB: SELECT RefreshToken + vérification
    A->>A: Rotation : nouveau accessToken + refreshToken
    A->>DB: Révoque ancien + INSERT nouveau
    A-->>F: 200 {accessToken, refreshToken}
```

---

## 6) Diagramme d'activité — Workflow utilisateur complet

```mermaid
flowchart TD
    A([Début]) --> B{Compte existant ?}
    B -->|Non| C[S'inscrire]
    B -->|Oui| D[Se connecter]
    C --> D
    D --> E[Dashboard]
    E --> F{Action ?}
    F -->|Nouvelle analyse| G[Saisir la présentation]
    F -->|Historique| K[Consulter l'historique]
    F -->|Progression| L[Visualiser les graphiques]
    G --> H[Sélectionner le contexte]
    H --> I[Lancer l'analyse]
    I --> J[Consulter les résultats]
    J --> M{Satisfait ?}
    M -->|Non| N[Modifier le texte]
    N --> I
    M -->|Oui| O{Exporter ?}
    O -->|Oui| P[Télécharger PDF]
    O -->|Non| E
    P --> E
    K --> J
    L --> E
```
