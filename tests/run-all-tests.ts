import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

interface CombinedReport {
  timestamp: string;
  summary: {
    apiTests: { total: number; passed: number; failed: number; warnings: number };
    frontendTests: { total: number; passed: number; failed: number; warnings: number };
    overall: { total: number; passed: number; failed: number; warnings: number };
  };
  apiReport: any;
  frontendReport: any;
  recommendations: string[];
}

class MasterTestRunner {
  private report: CombinedReport;

  constructor() {
    this.report = {
      timestamp: new Date().toISOString(),
      summary: {
        apiTests: { total: 0, passed: 0, failed: 0, warnings: 0 },
        frontendTests: { total: 0, passed: 0, failed: 0, warnings: 0 },
        overall: { total: 0, passed: 0, failed: 0, warnings: 0 },
      },
      apiReport: null,
      frontendReport: null,
      recommendations: [],
    };
  }

  private async checkServers() {
    console.log('🔍 Checking if servers are running...\n');

    try {
      const axios = require('axios');
      
      // Check API server
      try {
        await axios.get('http://localhost:3000/api/v1');
        console.log('✅ API Server is running on http://localhost:3000');
      } catch {
        console.log('❌ API Server is NOT running on http://localhost:3000');
        console.log('   Please start the API server with: npm run dev');
        return false;
      }

      // Check Web server
      try {
        await axios.get('http://localhost:3001');
        console.log('✅ Web Server is running on http://localhost:3001');
      } catch {
        console.log('❌ Web Server is NOT running on http://localhost:3001');
        console.log('   Please start the Web server with: npm run dev');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking servers:', error);
      return false;
    }
  }

  private async runAPITests() {
    console.log('\n' + '='.repeat(80));
    console.log('🔧 Running API Tests...');
    console.log('='.repeat(80));

    try {
      await execAsync('ts-node tests/integration/api-test-runner.ts');
      
      // Load API report
      const reportPath = path.join(process.cwd(), 'reports', 'test-report.json');
      if (fs.existsSync(reportPath)) {
        this.report.apiReport = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
        this.report.summary.apiTests = this.report.apiReport.summary;
      }
    } catch (error: any) {
      console.error('Error running API tests:', error.message);
    }
  }

  private async runFrontendTests() {
    console.log('\n' + '='.repeat(80));
    console.log('🌐 Running Frontend Tests...');
    console.log('='.repeat(80));

    try {
      await execAsync('ts-node tests/integration/frontend-test-runner.ts');
      
      // Load Frontend report
      const reportPath = path.join(process.cwd(), 'reports', 'frontend-test-report.json');
      if (fs.existsSync(reportPath)) {
        this.report.frontendReport = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
        this.report.summary.frontendTests = this.report.frontendReport.summary;
      }
    } catch (error: any) {
      console.error('Error running frontend tests:', error.message);
    }
  }

  private generateRecommendations() {
    const { apiTests, frontendTests } = this.report.summary;

    if (apiTests.failed > 0) {
      this.report.recommendations.push(
        `🔧 Fix ${apiTests.failed} failing API endpoint(s)`
      );
    }

    if (frontendTests.failed > 0) {
      this.report.recommendations.push(
        `🌐 Fix ${frontendTests.failed} broken frontend route(s)`
      );
    }

    if (apiTests.warnings > 0) {
      this.report.recommendations.push(
        `⚠️  Review ${apiTests.warnings} API warning(s)`
      );
    }

    if (frontendTests.warnings > 0) {
      this.report.recommendations.push(
        `⚠️  Review ${frontendTests.warnings} frontend warning(s)`
      );
    }

    // Check for authentication issues
    if (this.report.apiReport) {
      const authResults = this.report.apiReport.results.auth || [];
      const authFailed = authResults.filter((r: any) => r.status === 'failed').length;
      if (authFailed > 0) {
        this.report.recommendations.push(
          `🔐 Critical: Fix authentication issues (${authFailed} failed tests)`
        );
      }
    }

    if (this.report.recommendations.length === 0) {
      this.report.recommendations.push('✨ All tests passed! No issues found.');
    }
  }

  private calculateOverallSummary() {
    const { apiTests, frontendTests } = this.report.summary;
    
    this.report.summary.overall = {
      total: apiTests.total + frontendTests.total,
      passed: apiTests.passed + frontendTests.passed,
      failed: apiTests.failed + frontendTests.failed,
      warnings: apiTests.warnings + frontendTests.warnings,
    };
  }

  private printFinalReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📋 FINAL TEST REPORT');
    console.log('='.repeat(80));
    console.log(`Timestamp: ${this.report.timestamp}\n`);

    const { overall, apiTests, frontendTests } = this.report.summary;

    console.log('📊 OVERALL SUMMARY:');
    console.log(`   Total Tests: ${overall.total}`);
    console.log(`   ✅ Passed: ${overall.passed} (${((overall.passed / overall.total) * 100).toFixed(1)}%)`);
    console.log(`   ❌ Failed: ${overall.failed} (${((overall.failed / overall.total) * 100).toFixed(1)}%)`);
    console.log(`   ⚠️  Warnings: ${overall.warnings} (${((overall.warnings / overall.total) * 100).toFixed(1)}%)`);

    console.log('\n📡 API TESTS:');
    console.log(`   Total: ${apiTests.total}`);
    console.log(`   ✅ Passed: ${apiTests.passed}`);
    console.log(`   ❌ Failed: ${apiTests.failed}`);
    console.log(`   ⚠️  Warnings: ${apiTests.warnings}`);

    console.log('\n🌐 FRONTEND TESTS:');
    console.log(`   Total: ${frontendTests.total}`);
    console.log(`   ✅ Passed: ${frontendTests.passed}`);
    console.log(`   ❌ Failed: ${frontendTests.failed}`);
    console.log(`   ⚠️  Warnings: ${frontendTests.warnings}`);

    console.log('\n💡 RECOMMENDATIONS:');
    this.report.recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });

    console.log('\n' + '='.repeat(80));

    // Health score
    const healthScore = (overall.passed / overall.total) * 100;
    console.log(`\n🏥 HEALTH SCORE: ${healthScore.toFixed(1)}%`);
    
    if (healthScore >= 90) {
      console.log('   Status: 🟢 Excellent');
    } else if (healthScore >= 70) {
      console.log('   Status: 🟡 Good');
    } else if (healthScore >= 50) {
      console.log('   Status: 🟠 Needs Improvement');
    } else {
      console.log('   Status: 🔴 Critical');
    }

    console.log('\n' + '='.repeat(80));
  }

  private saveCombinedReport() {
    const reportsDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportPath = path.join(reportsDir, 'combined-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.report, null, 2));
    console.log(`\n💾 Combined report saved to: ${reportPath}`);
  }

  async run() {
    console.log('🚀 InterviewCoach - Full Project Test Suite');
    console.log('='.repeat(80));

    // Check if servers are running
    const serversRunning = await this.checkServers();
    if (!serversRunning) {
      console.log('\n❌ Cannot run tests - servers are not running');
      process.exit(1);
    }

    // Run all tests
    await this.runAPITests();
    await this.runFrontendTests();

    // Generate report
    this.calculateOverallSummary();
    this.generateRecommendations();
    this.printFinalReport();
    this.saveCombinedReport();

    // Exit with appropriate code
    const { failed } = this.report.summary.overall;
    process.exit(failed > 0 ? 1 : 0);
  }
}

// Run master test suite
const runner = new MasterTestRunner();
runner.run().catch(console.error);
