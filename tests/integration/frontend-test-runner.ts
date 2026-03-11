import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

interface RouteTest {
  path: string;
  status: 'passed' | 'failed' | 'warning';
  statusCode?: number;
  message?: string;
  requiresAuth?: boolean;
}

interface FrontendTestReport {
  timestamp: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
  routes: {
    public: RouteTest[];
    auth: RouteTest[];
    dashboard: RouteTest[];
    admin: RouteTest[];
  };
}

class FrontendTestRunner {
  private baseURL = 'http://localhost:3001';
  private report: FrontendTestReport;

  constructor() {
    this.report = {
      timestamp: new Date().toISOString(),
      summary: { total: 0, passed: 0, failed: 0, warnings: 0 },
      routes: {
        public: [],
        auth: [],
        dashboard: [],
        admin: [],
      },
    };
  }

  private addResult(category: keyof FrontendTestReport['routes'], result: RouteTest) {
    this.report.routes[category].push(result);
    this.report.summary.total++;
    if (result.status === 'passed') this.report.summary.passed++;
    else if (result.status === 'failed') this.report.summary.failed++;
    else this.report.summary.warnings++;
  }

  private async testRoute(
    category: keyof FrontendTestReport['routes'],
    routePath: string,
    expectedStatus: number = 200,
    requiresAuth: boolean = false
  ) {
    try {
      const response = await axios.get(`${this.baseURL}${routePath}`, {
        validateStatus: () => true,
        maxRedirects: 0,
      });

      const actualStatus = response.status;
      
      if (actualStatus === expectedStatus || (actualStatus === 200 && expectedStatus === 200)) {
        this.addResult(category, {
          path: routePath,
          status: 'passed',
          statusCode: actualStatus,
          requiresAuth,
        });
      } else if (actualStatus === 302 || actualStatus === 307) {
        // Redirect might be expected for protected routes
        this.addResult(category, {
          path: routePath,
          status: requiresAuth ? 'passed' : 'warning',
          statusCode: actualStatus,
          message: `Redirected to ${response.headers.location}`,
          requiresAuth,
        });
      } else {
        this.addResult(category, {
          path: routePath,
          status: 'failed',
          statusCode: actualStatus,
          message: `Expected ${expectedStatus}, got ${actualStatus}`,
          requiresAuth,
        });
      }
    } catch (error: any) {
      this.addResult(category, {
        path: routePath,
        status: 'failed',
        message: error.message,
        requiresAuth,
      });
    }
  }

  async testPublicRoutes() {
    console.log('\n🌐 Testing Public Routes...');
    
    await this.testRoute('public', '/');
    await this.testRoute('public', '/about');
    await this.testRoute('public', '/privacy');
    await this.testRoute('public', '/terms');
  }

  async testAuthRoutes() {
    console.log('\n🔐 Testing Auth Routes...');
    
    await this.testRoute('auth', '/auth/login');
    await this.testRoute('auth', '/auth/register');
    await this.testRoute('auth', '/auth/forgot-password');
    await this.testRoute('auth', '/auth/reset-password');
    await this.testRoute('auth', '/auth/verify');
  }

  async testDashboardRoutes() {
    console.log('\n📊 Testing Dashboard Routes...');
    
    await this.testRoute('dashboard', '/dashboard', 200, true);
    await this.testRoute('dashboard', '/statistics', 200, true);
    await this.testRoute('dashboard', '/history', 200, true);
    await this.testRoute('dashboard', '/profile', 200, true);
    await this.testRoute('dashboard', '/analysis/new', 200, true);
  }

  async testAdminRoutes() {
    console.log('\n🔧 Testing Admin Routes...');
    
    await this.testRoute('admin', '/admin', 200, true);
    await this.testRoute('admin', '/admin/templates', 200, true);
    await this.testRoute('admin', '/admin/config', 200, true);
    await this.testRoute('admin', '/admin/audit-logs', 200, true);
  }

  printReport() {
    console.log('\n' + '='.repeat(80));
    console.log('🌐 FRONTEND TEST REPORT');
    console.log('='.repeat(80));
    console.log(`Timestamp: ${this.report.timestamp}`);
    console.log(`\n📊 Summary:`);
    console.log(`   Total Routes: ${this.report.summary.total}`);
    console.log(`   ✅ Passed: ${this.report.summary.passed}`);
    console.log(`   ❌ Failed: ${this.report.summary.failed}`);
    console.log(`   ⚠️  Warnings: ${this.report.summary.warnings}`);

    Object.entries(this.report.routes).forEach(([category, routes]) => {
      if (routes.length > 0) {
        console.log(`\n${category.toUpperCase()} ROUTES:`);
        routes.forEach((route) => {
          const icon = route.status === 'passed' ? '✅' : route.status === 'failed' ? '❌' : '⚠️';
          const authBadge = route.requiresAuth ? '🔒' : '🌐';
          console.log(`   ${icon} ${authBadge} ${route.path}`);
          if (route.statusCode) console.log(`      Status: ${route.statusCode}`);
          if (route.message) console.log(`      ${route.message}`);
        });
      }
    });

    console.log('\n' + '='.repeat(80));
  }

  saveReport() {
    const reportsDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportPath = path.join(reportsDir, 'frontend-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.report, null, 2));
    console.log(`\n💾 Report saved to: ${reportPath}`);
  }

  async runAllTests() {
    console.log('🚀 Starting Frontend Tests...');
    console.log('Base URL:', this.baseURL);

    await this.testPublicRoutes();
    await this.testAuthRoutes();
    await this.testDashboardRoutes();
    await this.testAdminRoutes();

    this.printReport();
    this.saveReport();
  }
}

// Run tests
const runner = new FrontendTestRunner();
runner.runAllTests().catch(console.error);
