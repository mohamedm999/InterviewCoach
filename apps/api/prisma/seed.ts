import { PrismaClient, Role, UserStatus, Context } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── 1. Default AnalysisConfig ──────────────────────────────────────────────
  const existingConfig = await prisma.analysisConfig.findFirst();
  if (!existingConfig) {
    await prisma.analysisConfig.create({
      data: {
        weights: { tone: 25, confidence: 25, readability: 25, impact: 25 },
        thresholds: { high: 30, medium: 60 },
      },
    });
    console.log('✅ AnalysisConfig created');
  } else {
    console.log('⏭️  AnalysisConfig already exists');
  }

  // ── 2. Admin User ──────────────────────────────────────────────────────────
  const passwordHash = await argon2.hash('Admin123!');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@interviewcoach.com' },
    update: {},
    create: {
      email: 'admin@interviewcoach.com',
      passwordHash,
      displayName: 'Admin User',
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });
  console.log(`✅ Admin user: ${admin.email}`);

  // ── 3. Sample PitchTemplates (one per context) ─────────────────────────────
  const templates = [
    {
      title: 'Pitch Formel — Standard',
      context: Context.FORMAL,
      content:
        'Bonjour, je me présente : [Prénom Nom], [Titre] avec [X] années d\'expérience dans [Domaine]. ' +
        'Au cours de ma carrière, j\'ai eu l\'opportunité de [Réalisation principale]. ' +
        'Je maîtrise [Compétence 1] et [Compétence 2], ce qui m\'a permis d\'obtenir [Résultat concret]. ' +
        'Je suis particulièrement intéressé(e) par [Entreprise/Poste] car [Raison spécifique]. ' +
        'Je serais ravi(e) d\'apporter ma contribution à votre équipe.',
    },
    {
      title: 'Pitch Startup — Dynamique',
      context: Context.STARTUP,
      content:
        'Salut ! Je suis [Prénom], [Rôle] passionné(e) par [Domaine]. ' +
        'J\'ai co-fondé / rejoint [Startup] où j\'ai contribué à [Traction : X utilisateurs, Y€ ARR]. ' +
        'Mon expertise en [Compétence] m\'a permis de scaler [Produit/Feature] de [Métrique A] à [Métrique B] en [Durée]. ' +
        'Je cherche à rejoindre une équipe ambitieuse pour [Impact visé]. ' +
        'Convaincu(e) que [Vision], je suis prêt(e) à relever ce défi.',
    },
    {
      title: 'Pitch Technique — Précis',
      context: Context.TECHNICAL,
      content:
        'Je suis [Prénom], [Titre] spécialisé(e) en [Stack technique]. ' +
        'J\'ai conçu et déployé [Architecture/Système] gérant [X] requêtes/seconde avec [Y]% de disponibilité. ' +
        'Mes contributions open-source incluent [Projet] ([Z] étoiles GitHub). ' +
        'J\'ai résolu [Problème technique complexe] en implémentant [Solution], réduisant la latence de [A]ms à [B]ms. ' +
        'Je cherche un environnement où je peux approfondir [Technologie] et contribuer à [Objectif technique].',
    },
    {
      title: 'Pitch Créatif — Original',
      context: Context.CREATIVE,
      content:
        'Imaginez [Problème ou situation]. C\'est exactement ce qui m\'a poussé à devenir [Rôle]. ' +
        'Je suis [Prénom], et je crois que [Vision créative]. ' +
        'Mon travail sur [Projet créatif] a été [Reconnaissance : primé, viral, publié]. ' +
        'Je mêle [Compétence 1] et [Compétence 2] pour créer des expériences qui [Impact émotionnel]. ' +
        'Ce qui me distingue ? [Approche unique]. Je cherche à collaborer avec [Type d\'équipe] pour [Projet ambitieux].',
    },
  ];

  for (const template of templates) {
    await prisma.pitchTemplate.upsert({
      where: { id: (await prisma.pitchTemplate.findFirst({ where: { context: template.context } }))?.id ?? '00000000-0000-0000-0000-000000000000' },
      update: {},
      create: template,
    });
    console.log(`✅ Template: ${template.title}`);
  }

  console.log('🎉 Seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
