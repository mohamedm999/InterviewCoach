import { Injectable } from '@nestjs/common';
import { Context, Priority, RecommendationCategory } from '@prisma/client';

export interface Scores {
  readability: number;
  tone: number;
  confidence: number;
  impact: number;
}

export interface Weights {
  tone: number;
  confidence: number;
  readability: number;
  impact: number;
}

export interface Thresholds {
  high: number;
  medium: number;
}

export interface RecommendationInput {
  category: RecommendationCategory;
  priority: Priority;
  title: string;
  description: string;
  examples: string[];
}

@Injectable()
export class AnalysisEngineService {
  // ─── Text Normalization ───────────────────────────────────────────────────

  normalizeText(input: string): string {
    return (
      input
        .trim()
        // Remove control characters (except newlines and tabs)
        // eslint-disable-next-line no-control-regex
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        // Collapse multiple spaces/tabs into single space
        .replace(/[ \t]+/g, ' ')
        // Collapse more than 2 consecutive newlines
        .replace(/\n{3,}/g, '\n\n')
    );
  }

  // ─── Readability Score (0-100) ────────────────────────────────────────────

  computeReadabilityScore(text: string): number {
    const sentences = this.splitSentences(text);
    const words = this.tokenizeWords(text);

    if (words.length === 0) return 0;

    let score = 100;

    // 1. Average sentence length — penalize sentences > 25 words
    if (sentences.length > 0) {
      const avgSentenceLen = words.length / sentences.length;
      if (avgSentenceLen > 25) {
        score -= Math.min(30, (avgSentenceLen - 25) * 2);
      }
    }

    // 2. Paragraph count — reward structure (at least 2 paragraphs)
    const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);
    if (paragraphs.length < 2) {
      score -= 10;
    } else if (paragraphs.length >= 3) {
      score += 5;
    }

    // 3. Word repetition ratio — penalize if > 15%
    const wordFreq = new Map<string, number>();
    for (const w of words) {
      const lower = w.toLowerCase();
      wordFreq.set(lower, (wordFreq.get(lower) ?? 0) + 1);
    }
    const repeatedWords = [...wordFreq.values()]
      .filter((c) => c > 1)
      .reduce((a, b) => a + b, 0);
    const repetitionRatio = repeatedWords / words.length;
    if (repetitionRatio > 0.15) {
      score -= Math.min(25, Math.round((repetitionRatio - 0.15) * 100));
    }

    // 4. Vocabulary diversity (type-token ratio)
    const uniqueWords = wordFreq.size;
    const ttr = uniqueWords / words.length;
    if (ttr > 0.7) {
      score += 5;
    } else if (ttr < 0.4) {
      score -= 10;
    }

    return this.clamp(Math.round(score), 0, 100);
  }

  // ─── Tone Score (0-100) ───────────────────────────────────────────────────

  computeToneScore(text: string, context: Context): number {
    const lower = text.toLowerCase();
    let score = 60; // neutral baseline

    // Weak/hedging words — penalize
    const weakWords = [
      'peut-être',
      'je pense',
      'un peu',
      'je crois',
      "j'espère",
      'normalement',
      'en principe',
      'à peu près',
      'plus ou moins',
      'probablement',
      'sûrement',
      'certainement peut-être',
      'maybe',
      'perhaps',
      'i think',
      'i guess',
      'sort of',
      'kind of',
    ];
    for (const w of weakWords) {
      const count = this.countOccurrences(lower, w);
      score -= count * 3;
    }

    // Assertive/achievement words — reward
    const assertiveWords = [
      "j'ai réalisé",
      "j'ai dirigé",
      "j'ai développé",
      "j'ai conçu",
      "j'ai mis en place",
      "j'ai géré",
      "j'ai créé",
      "j'ai lancé",
      "j'ai augmenté",
      "j'ai réduit",
      "j'ai amélioré",
      "j'ai livré",
      'i led',
      'i built',
      'i developed',
      'i designed',
      'i delivered',
      'i achieved',
      'i increased',
      'i reduced',
      'i managed',
    ];
    for (const w of assertiveWords) {
      const count = this.countOccurrences(lower, w);
      score += count * 5;
    }

    // Context-specific bonuses
    const contextBonus = this.computeContextBonus(lower, context);
    score += contextBonus;

    return this.clamp(Math.round(score), 0, 100);
  }

  private computeContextBonus(lower: string, context: Context): number {
    switch (context) {
      case Context.FORMAL: {
        // Reward polite, structured language
        const formalWords = [
          'veuillez',
          'cordialement',
          'respectueusement',
          'je vous prie',
          'madame',
          'monsieur',
        ];
        return formalWords.reduce(
          (acc, w) => acc + this.countOccurrences(lower, w) * 3,
          0,
        );
      }
      case Context.STARTUP: {
        // Reward dynamic, growth-oriented language
        const startupWords = [
          'innovation',
          'croissance',
          'scale',
          'disruption',
          'agile',
          'lean',
          'mvp',
          'traction',
          'pivot',
        ];
        return startupWords.reduce(
          (acc, w) => acc + this.countOccurrences(lower, w) * 3,
          0,
        );
      }
      case Context.TECHNICAL: {
        // Reward precise, technical language
        const techWords = [
          'architecture',
          'algorithme',
          'optimisation',
          'performance',
          'api',
          'microservice',
          'déploiement',
          'ci/cd',
        ];
        return techWords.reduce(
          (acc, w) => acc + this.countOccurrences(lower, w) * 3,
          0,
        );
      }
      case Context.CREATIVE: {
        // Reward original, expressive language
        const creativeWords = [
          'créatif',
          'original',
          'innovant',
          'unique',
          'vision',
          'inspiration',
          'concept',
          'storytelling',
        ];
        return creativeWords.reduce(
          (acc, w) => acc + this.countOccurrences(lower, w) * 3,
          0,
        );
      }
      default:
        return 0;
    }
  }

  // ─── Confidence Score (0-100) ─────────────────────────────────────────────

  computeConfidenceScore(text: string): number {
    const lower = text.toLowerCase();
    const words = this.tokenizeWords(text);
    let score = 70; // baseline

    // Hesitations — penalize
    const hesitations = [
      'euh',
      'hmm',
      'hm',
      'en fait',
      'bah',
      'ben',
      'voilà',
      'quoi',
      'hein',
      'um',
      'uh',
      'like,',
    ];
    for (const h of hesitations) {
      const count = this.countOccurrences(lower, h);
      score -= count * 5;
    }

    // Hedging/attenuators — penalize
    const hedges = [
      'un peu',
      'assez',
      'relativement',
      'plutôt',
      'parfois',
      'souvent',
      'généralement',
      'normalement',
    ];
    for (const h of hedges) {
      const count = this.countOccurrences(lower, h);
      score -= count * 3;
    }

    // Passive voice detection (French & English patterns) — penalize
    const passivePatterns = [
      /\bété\s+\w+é[es]?\b/g,
      /\bhas been\b/g,
      /\bhave been\b/g,
      /\bwas\s+\w+ed\b/g,
      /\bwere\s+\w+ed\b/g,
    ];
    let passiveCount = 0;
    for (const pattern of passivePatterns) {
      const matches = text.match(pattern);
      if (matches) passiveCount += matches.length;
    }
    const passiveRatio = words.length > 0 ? passiveCount / words.length : 0;
    if (passiveRatio > 0.05) {
      score -= Math.min(20, Math.round(passiveRatio * 100));
    }

    // First-person active statements — reward
    const firstPersonActive = [
      /\bj['']ai\s+\w+/gi,
      /\bje\s+(?:suis|fais|crée|développe|gère|dirige|conçois|livre)\b/gi,
      /\bi\s+(?:built|led|created|designed|developed|managed|delivered|achieved)\b/gi,
    ];
    for (const pattern of firstPersonActive) {
      const matches = text.match(pattern);
      if (matches) score += matches.length * 4;
    }

    return this.clamp(Math.round(score), 0, 100);
  }

  // ─── Impact Score (0-100) ─────────────────────────────────────────────────

  computeImpactScore(text: string): number {
    const lower = text.toLowerCase();
    let score = 50; // baseline

    // Metrics/numbers presence — reward
    const numberPattern = /\b\d+(?:[.,]\d+)?(?:\s*%|\s*k€|\s*€|\s*\$|x|×)?\b/g;
    const numbers = text.match(numberPattern) ?? [];
    score += Math.min(20, numbers.length * 4);

    // Action verbs — reward
    const actionVerbs = [
      'développé',
      'conçu',
      'dirigé',
      'géré',
      'créé',
      'lancé',
      'livré',
      'augmenté',
      'réduit',
      'amélioré',
      'optimisé',
      'automatisé',
      'déployé',
      'built',
      'led',
      'created',
      'launched',
      'delivered',
      'increased',
      'reduced',
      'improved',
      'optimized',
      'automated',
      'deployed',
      'scaled',
    ];
    for (const v of actionVerbs) {
      const count = this.countOccurrences(lower, v);
      score += count * 3;
    }

    // Concrete results — reward
    const resultPatterns = [
      /\b(?:résultat|résultats|impact|bénéfice|gain|économie|croissance|augmentation|réduction)\b/gi,
      /\b(?:result|results|impact|benefit|gain|savings|growth|increase|reduction)\b/gi,
    ];
    for (const pattern of resultPatterns) {
      const matches = text.match(pattern);
      if (matches) score += matches.length * 3;
    }

    // Vague claims — penalize
    const vagueWords = [
      'beaucoup',
      'plusieurs',
      'nombreux',
      'divers',
      'certains',
      'quelques',
      'many',
      'several',
      'various',
      'some',
      'a lot',
      'lots of',
    ];
    for (const v of vagueWords) {
      const count = this.countOccurrences(lower, v);
      score -= count * 2;
    }

    return this.clamp(Math.round(score), 0, 100);
  }

  // ─── Aggregate Global Score ───────────────────────────────────────────────

  aggregateGlobalScore(scores: Scores, weights: Weights): number {
    const totalWeight =
      weights.tone + weights.confidence + weights.readability + weights.impact;
    if (totalWeight === 0) return 0;

    const weighted =
      scores.tone * weights.tone +
      scores.confidence * weights.confidence +
      scores.readability * weights.readability +
      scores.impact * weights.impact;

    return this.clamp(Math.round(weighted / totalWeight), 0, 100);
  }

  // ─── Recommendations ──────────────────────────────────────────────────────

  generateRecommendations(
    scores: Scores,
    text: string,
    context: Context,
    thresholds: Thresholds,
  ): RecommendationInput[] {
    const recommendations: RecommendationInput[] = [];

    const categories: Array<{
      key: keyof Scores;
      category: RecommendationCategory;
      score: number;
    }> = [
      {
        key: 'readability',
        category: RecommendationCategory.READABILITY,
        score: scores.readability,
      },
      {
        key: 'tone',
        category: RecommendationCategory.TONE,
        score: scores.tone,
      },
      {
        key: 'confidence',
        category: RecommendationCategory.CONFIDENCE,
        score: scores.confidence,
      },
      {
        key: 'impact',
        category: RecommendationCategory.IMPACT,
        score: scores.impact,
      },
    ];

    for (const { category, score } of categories) {
      if (score >= thresholds.medium) continue; // above medium threshold — no recommendation needed

      const priority: Priority =
        score < thresholds.high ? Priority.HIGH : Priority.MEDIUM;

      const rec = this.buildRecommendation(category, score, context, priority);
      recommendations.push(rec);
    }

    // Sort: HIGH → MEDIUM → LOW
    const priorityOrder: Record<Priority, number> = {
      [Priority.HIGH]: 0,
      [Priority.MEDIUM]: 1,
      [Priority.LOW]: 2,
    };

    return recommendations.sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
    );
  }

  private buildRecommendation(
    category: RecommendationCategory,
    score: number,
    context: Context,
    priority: Priority,
  ): RecommendationInput {
    const contextLabel = context.toLowerCase();

    switch (category) {
      case RecommendationCategory.READABILITY:
        return {
          category,
          priority,
          title: 'Améliorer la lisibilité de votre discours',
          description:
            `Votre score de lisibilité est de ${score}/100. Structurez votre texte en paragraphes courts, ` +
            `évitez les phrases de plus de 25 mots et variez votre vocabulaire pour maintenir l'attention.`,
          examples: [
            'Divisez les longues phrases en deux phrases distinctes.',
            'Utilisez des connecteurs logiques : "premièrement", "ensuite", "enfin".',
            'Évitez de répéter les mêmes mots — utilisez des synonymes.',
          ],
        };

      case RecommendationCategory.TONE:
        return {
          category,
          priority,
          title: `Adapter votre ton au contexte ${contextLabel}`,
          description:
            `Votre score de ton est de ${score}/100. Dans un contexte ${contextLabel}, ` +
            `privilégiez un langage ${this.getToneAdvice(context)} et évitez les formulations hésitantes.`,
          examples: [...this.getToneExamples(context)],
        };

      case RecommendationCategory.CONFIDENCE:
        return {
          category,
          priority,
          title: 'Renforcer votre confiance et assertivité',
          description:
            `Votre score de confiance est de ${score}/100. Réduisez les hésitations, la voix passive ` +
            `et les atténuateurs. Utilisez davantage de formulations à la première personne active.`,
          examples: [
            'Remplacez "j\'ai essayé de" par "j\'ai".',
            'Évitez "euh", "en fait", "un peu" — préparez vos transitions.',
            'Utilisez la voix active : "J\'ai développé" plutôt que "a été développé par moi".',
          ],
        };

      case RecommendationCategory.IMPACT:
        return {
          category,
          priority,
          title: "Quantifier et renforcer l'impact de vos réalisations",
          description:
            `Votre score d'impact est de ${score}/100. Ajoutez des chiffres concrets, des résultats mesurables ` +
            `et des verbes d'action forts pour démontrer votre valeur ajoutée.`,
          examples: [
            'Remplacez "j\'ai amélioré les performances" par "j\'ai réduit le temps de chargement de 40%".',
            'Ajoutez des métriques : "géré une équipe de 5 personnes", "livré en 3 mois".',
            "Utilisez des verbes d'action : développé, conçu, dirigé, optimisé, livré.",
          ],
        };

      default:
        return {
          category: RecommendationCategory.GENERAL,
          priority,
          title: 'Améliorer votre présentation générale',
          description: `Score de ${score}/100. Travaillez sur la structure et la clarté de votre discours.`,
          examples: [
            'Structurez votre pitch en 3 parties : contexte, réalisations, valeur ajoutée.',
          ],
        };
    }
  }

  private getToneAdvice(context: Context): string {
    switch (context) {
      case Context.FORMAL:
        return 'poli, structuré et professionnel';
      case Context.STARTUP:
        return 'dynamique, orienté croissance et innovation';
      case Context.TECHNICAL:
        return 'précis, factuel et orienté solutions';
      case Context.CREATIVE:
        return 'original, expressif et inspirant';
      default:
        return 'adapté';
    }
  }

  private getToneExamples(context: Context): string[] {
    switch (context) {
      case Context.FORMAL:
        return [
          'Utilisez des formules de politesse appropriées.',
          'Structurez votre discours avec une introduction, un développement et une conclusion.',
        ];
      case Context.STARTUP:
        return [
          "Mentionnez votre vision et l'impact que vous souhaitez créer.",
          'Utilisez des termes comme "traction", "scalabilité", "product-market fit".',
        ];
      case Context.TECHNICAL:
        return [
          'Citez les technologies et architectures maîtrisées.',
          'Quantifiez les performances : latence, throughput, disponibilité.',
        ];
      case Context.CREATIVE:
        return [
          "Partagez votre processus créatif et vos sources d'inspiration.",
          'Illustrez avec des exemples concrets de projets originaux.',
        ];
      default:
        return ['Adaptez votre vocabulaire au contexte.'];
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private splitSentences(text: string): string[] {
    return text
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  private tokenizeWords(text: string): string[] {
    return text
      .replace(/[^\w\s'-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 1);
  }

  private countOccurrences(text: string, phrase: string): number {
    if (!phrase) return 0;
    let count = 0;
    let pos = 0;
    while ((pos = text.indexOf(phrase, pos)) !== -1) {
      count++;
      pos += phrase.length;
    }
    return count;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}
