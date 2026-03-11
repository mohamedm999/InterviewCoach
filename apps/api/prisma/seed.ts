import { PrismaClient, Role, UserStatus, Context, Priority, RecommendationCategory } from '@prisma/client';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');
  console.log('⚠️  This will clear existing data and create fresh test data');

  // Clear existing data (in correct order due to foreign keys)
  console.log('🗑️  Clearing existing data...');
  await prisma.recommendation.deleteMany();
  await prisma.analysis.deleteMany();
  await prisma.userGoal.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.pitchTemplate.deleteMany();
  await prisma.analysisConfig.deleteMany();
  await prisma.user.deleteMany();
  console.log('✅ Existing data cleared');

  // ── 1. Analysis Configuration ──────────────────────────────────────────────
  console.log('\n📊 Creating analysis configuration...');
  const config = await prisma.analysisConfig.create({
    data: {
      version: 1,
      isActive: true,
      weights: { 
        tone: 25, 
        confidence: 25, 
        readability: 25, 
        impact: 25 
      },
      thresholds: { 
        high: 30,  // Scores below 30% are HIGH priority
        medium: 60 // Scores below 60% are MEDIUM priority
      },
    },
  });
  console.log(`✅ Analysis config created (version ${config.version})`);

  // ── 2. Users ───────────────────────────────────────────────────────────────
  console.log('\n👥 Creating users...');
  
  // Admin user
  const adminPassword = await argon2.hash('Admin123!');
  const admin = await prisma.user.create({
    data: {
      email: 'admin@interviewcoach.com',
      passwordHash: adminPassword,
      displayName: 'Admin User',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
      emailVerified: true,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      lastLoginAt: new Date(),
    },
  });
  console.log(`✅ Admin: ${admin.email} (password: Admin123!)`);

  // Regular test users
  const userPassword = await argon2.hash('User123!');
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'john.doe@example.com',
        passwordHash: userPassword,
        displayName: 'John Doe',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=john',
        emailVerified: true,
        role: Role.USER,
        status: UserStatus.ACTIVE,
        lastLoginAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.user.create({
      data: {
        email: 'jane.smith@example.com',
        passwordHash: userPassword,
        displayName: 'Jane Smith',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jane',
        emailVerified: true,
        role: Role.USER,
        status: UserStatus.ACTIVE,
        lastLoginAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.user.create({
      data: {
        email: 'mike.wilson@example.com',
        passwordHash: userPassword,
        displayName: 'Mike Wilson',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mike',
        emailVerified: false,
        role: Role.USER,
        status: UserStatus.ACTIVE,
      },
    }),
  ]);
  console.log(`✅ Created ${users.length} test users (password: User123!)`);


  // ── 3. Pitch Templates ─────────────────────────────────────────────────────
  console.log('\n📝 Creating pitch templates...');
  const templates = await Promise.all([
    prisma.pitchTemplate.create({
      data: {
        title: 'Professional Introduction',
        context: Context.FORMAL,
        content: 'Good morning, my name is [Your Name], and I am a [Your Title] with [X] years of experience in [Your Field]. Throughout my career, I have successfully [Key Achievement]. I specialize in [Skill 1] and [Skill 2], which has enabled me to deliver [Concrete Result]. I am particularly interested in [Company/Position] because [Specific Reason]. I would be delighted to contribute my expertise to your team.',
        isActive: true,
        createdBy: admin.id,
      },
    }),
    prisma.pitchTemplate.create({
      data: {
        title: 'Startup Pitch',
        context: Context.STARTUP,
        content: 'Hey! I\'m [Your Name], a [Role] passionate about [Domain]. I co-founded/joined [Startup] where I helped achieve [Traction: X users, Y€ ARR]. My expertise in [Skill] allowed me to scale [Product/Feature] from [Metric A] to [Metric B] in [Duration]. I\'m looking to join an ambitious team to [Desired Impact]. Convinced that [Vision], I\'m ready to take on this challenge.',
        isActive: true,
        createdBy: admin.id,
      },
    }),
    prisma.pitchTemplate.create({
      data: {
        title: 'Technical Pitch',
        context: Context.TECHNICAL,
        content: 'I\'m [Your Name], a [Title] specialized in [Tech Stack]. I designed and deployed [Architecture/System] handling [X] requests/second with [Y]% uptime. My open-source contributions include [Project] ([Z] GitHub stars). I solved [Complex Technical Problem] by implementing [Solution], reducing latency from [A]ms to [B]ms. I\'m seeking an environment where I can deepen my expertise in [Technology] and contribute to [Technical Goal].',
        isActive: true,
        createdBy: admin.id,
      },
    }),
    prisma.pitchTemplate.create({
      data: {
        title: 'Creative Pitch',
        context: Context.CREATIVE,
        content: 'Imagine [Problem or Situation]. That\'s exactly what drove me to become a [Role]. I\'m [Your Name], and I believe that [Creative Vision]. My work on [Creative Project] has been [Recognition: awarded, viral, published]. I blend [Skill 1] and [Skill 2] to create experiences that [Emotional Impact]. What sets me apart? [Unique Approach]. I\'m looking to collaborate with [Type of Team] on [Ambitious Project].',
        isActive: true,
        createdBy: admin.id,
      },
    }),
  ]);
  console.log(`✅ Created ${templates.length} pitch templates`);


  // ── 4. Sample Analysis ─────────────────────────────────────────────────────
  console.log('\n📊 Creating sample analysis...');
  const hash = crypto.createHash('sha256').update('Sample pitch text').digest('hex');
  const analysis = await prisma.analysis.create({
    data: {
      userId: users[0].id,
      context: Context.FORMAL,
      inputText: 'Hello, I am John Doe, a software engineer with 5 years of experience.',
      inputTextHash: hash,
      versionIndex: 0,
      scoreGlobal: 75,
      scoreTone: 80,
      scoreConfidence: 70,
      scoreReadability: 75,
      scoreImpact: 75,
      modelMeta: { model: 'gpt-4', processingTime: 2500, tokensUsed: 350 },
    },
  });

  await prisma.recommendation.create({
    data: {
      analysisId: analysis.id,
      category: RecommendationCategory.CONFIDENCE,
      priority: Priority.MEDIUM,
      title: 'Strengthen Your Opening',
      description: 'Your introduction is good but could be more impactful.',
      examples: ['As a software engineer who has delivered 10+ production applications...'],
    },
  });
  console.log(`✅ Created sample analysis with recommendations`);

  // ── 5. Summary ─────────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(60));
  console.log('🎉 Seed completed successfully!');
  console.log('='.repeat(60));
  console.log('\n📊 Summary:');
  console.log(`   • 1 Analysis Configuration`);
  console.log(`   • ${1 + users.length} Users (1 admin + ${users.length} regular)`);
  console.log(`   • ${templates.length} Pitch Templates`);
  console.log(`   • 1 Sample Analysis with Recommendations`);
  
  console.log('\n🔑 Test Credentials:');
  console.log('   Admin:');
  console.log(`     Email: admin@interviewcoach.com`);
  console.log(`     Password: Admin123!`);
  console.log('   Users:');
  console.log(`     Email: john.doe@example.com`);
  console.log(`     Email: jane.smith@example.com`);
  console.log(`     Email: mike.wilson@example.com (NOT verified)`);
  console.log(`     Password: User123! (for all users)`);
  
  console.log('\n✨ You can now start the application and test all features!');
  console.log('='.repeat(60) + '\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
