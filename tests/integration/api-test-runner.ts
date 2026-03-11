import axios from "axios";
import * as fs from "fs";
import * as path from "path";

interface TestResult {
  module: string;
  test: string;
  status: "passed" | "failed" | "warning";
  message?: string;
  statusCode?: number;
  error?: string;
}

interface TestReport {
  timestamp: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
  results: {
    auth: TestResult[];
    users: TestResult[];
    analyses: TestResult[];
    templates: TestResult[];
    admin: TestResult[];
    statistics: TestResult[];
  };
}

class APITestRunner {
  private baseURL = "http://localhost:3000/api/v1";
  private report: TestReport;
  private tokens: { access: string; refresh: string } = {
    access: "",
    refresh: "",
  };

  constructor() {
    this.report = {
      timestamp: new Date().toISOString(),
      summary: { total: 0, passed: 0, failed: 0, warnings: 0 },
      results: {
        auth: [],
        users: [],
        analyses: [],
        templates: [],
        admin: [],
        statistics: [],
      },
    };
  }

  private addResult(module: keyof TestReport["results"], result: TestResult) {
    this.report.results[module].push(result);
    this.report.summary.total++;
    if (result.status === "passed") this.report.summary.passed++;
    else if (result.status === "failed") this.report.summary.failed++;
    else this.report.summary.warnings++;
  }

  private async testEndpoint(
    module: keyof TestReport["results"],
    testName: string,
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    endpoint: string,
    data?: any,
    expectedStatus: number = 200,
    requiresAuth: boolean = false
  ): Promise<any> {
    try {
      const headers: any = {};
      if (requiresAuth && this.tokens.access) {
        headers.Authorization = `Bearer ${this.tokens.access}`;
      }

      const response = await axios({
        method,
        url: `${this.baseURL}${endpoint}`,
        data,
        headers,
        validateStatus: () => true,
      });

      if (response.status === expectedStatus) {
        this.addResult(module, {
          module,
          test: testName,
          status: "passed",
          statusCode: response.status,
        });
        return response.data;
      } else {
        this.addResult(module, {
          module,
          test: testName,
          status: "failed",
          statusCode: response.status,
          message: `Expected ${expectedStatus}, got ${response.status}`,
          error: JSON.stringify(response.data),
        });
        return null;
      }
    } catch (error: any) {
      this.addResult(module, {
        module,
        test: testName,
        status: "failed",
        message: error.message,
        error: error.toString(),
      });
      return null;
    }
  }

  async testAuthModule() {
    console.log("\n🔐 Testing Auth Module...");

    // Test login with valid credentials
    const loginData = await this.testEndpoint(
      "auth",
      "Login with valid credentials",
      "POST",
      "/auth/login",
      { email: "admin@interviewcoach.com", password: "Admin123!" },
      200
    );

    if (loginData?.accessToken) {
      this.tokens.access = loginData.accessToken;
      this.tokens.refresh = loginData.refreshToken;
    }

    // Test login with invalid credentials
    await this.testEndpoint(
      "auth",
      "Login with invalid credentials",
      "POST",
      "/auth/login",
      { email: "wrong@test.com", password: "wrong" },
      401
    );

    // Test register
    await this.testEndpoint(
      "auth",
      "Register new user",
      "POST",
      "/auth/register",
      {
        email: `test${Date.now()}@test.com`,
        password: "Test123!",
        firstName: "Test",
        lastName: "User",
      },
      201
    );

    // Test register with existing email
    await this.testEndpoint(
      "auth",
      "Register with existing email",
      "POST",
      "/auth/register",
      {
        email: "admin@interviewcoach.com",
        password: "Test123!",
        firstName: "Test",
        lastName: "User",
      },
      409
    );

    // Test refresh token
    if (this.tokens.refresh) {
      await this.testEndpoint(
        "auth",
        "Refresh token",
        "POST",
        "/auth/refresh",
        { refreshToken: this.tokens.refresh },
        200
      );
    }

    // Test logout
    await this.testEndpoint(
      "auth",
      "Logout",
      "POST",
      "/auth/logout",
      {},
      200,
      true
    );
  }

  async testUsersModule() {
    console.log("\n👤 Testing Users Module...");

    // Test get current user
    await this.testEndpoint(
      "users",
      "Get current user",
      "GET",
      "/users/me",
      undefined,
      200,
      true
    );

    // Test get current user without auth
    await this.testEndpoint(
      "users",
      "Get current user without auth",
      "GET",
      "/users/me",
      undefined,
      401,
      false
    );

    // Test update profile
    await this.testEndpoint(
      "users",
      "Update profile",
      "PATCH",
      "/users/me",
      { displayName: "Updated Name" },
      200,
      true
    );
  }

  async testAnalysesModule() {
    console.log("\n📊 Testing Analyses Module...");

    // Test create analysis
    const analysisData = await this.testEndpoint(
      "analyses",
      "Create analysis",
      "POST",
      "/analyses",
      {
        context: "FORMAL",
        content:
          "This is a test pitch for interview coaching analysis. This text has enough characters to meet the minimum length requirement and should pass validation successfully.",
      },
      201,
      true
    );

    // Test get analyses list
    await this.testEndpoint(
      "analyses",
      "Get analyses list",
      "GET",
      "/analyses",
      undefined,
      200,
      true
    );

    // Test get single analysis
    if (analysisData?.id) {
      await this.testEndpoint(
        "analyses",
        "Get single analysis",
        "GET",
        `/analyses/${analysisData.id}`,
        undefined,
        200,
        true
      );
    }

    // Test get analysis without auth
    await this.testEndpoint(
      "analyses",
      "Get analyses without auth",
      "GET",
      "/analyses",
      undefined,
      401,
      false
    );
  }

  async testTemplatesModule() {
    console.log("\n📝 Testing Templates Module...");

    // Test get templates
    await this.testEndpoint(
      "templates",
      "Get templates",
      "GET",
      "/pitch-templates",
      undefined,
      200,
      true
    );

    // Test create template (admin only)
    await this.testEndpoint(
      "templates",
      "Create template",
      "POST",
      "/pitch-templates",
      {
        title: "Test Template",
        context: "FORMAL",
        content: "Test content",
      },
      201,
      true
    );
  }

  async testAdminModule() {
    console.log("\n🔧 Testing Admin Module...");

    // Test get admin config
    await this.testEndpoint(
      "admin",
      "Get admin config",
      "GET",
      "/admin/config",
      undefined,
      200,
      true
    );

    // Test get audit logs
    await this.testEndpoint(
      "admin",
      "Get audit logs",
      "GET",
      "/admin/audit-logs",
      undefined,
      200,
      true
    );

    // Test get admin stats
    await this.testEndpoint(
      "admin",
      "Get admin stats",
      "GET",
      "/admin/stats/overview",
      undefined,
      200,
      true
    );
  }

  async testStatisticsModule() {
    console.log("\n📈 Testing Statistics Module...");

    // Test get user progression
    await this.testEndpoint(
      "statistics",
      "Get user progression",
      "GET",
      "/stats/me/progression",
      undefined,
      200,
      true
    );

    // Test get user goals
    await this.testEndpoint(
      "statistics",
      "Get user goals",
      "GET",
      "/stats/me/goals",
      undefined,
      200,
      true
    );
  }

  printReport() {
    console.log("\n" + "=".repeat(80));
    console.log("📋 TEST REPORT");
    console.log("=".repeat(80));
    console.log(`Timestamp: ${this.report.timestamp}`);
    console.log(`\n📊 Summary:`);
    console.log(`   Total Tests: ${this.report.summary.total}`);
    console.log(`   ✅ Passed: ${this.report.summary.passed}`);
    console.log(`   ❌ Failed: ${this.report.summary.failed}`);
    console.log(`   ⚠️  Warnings: ${this.report.summary.warnings}`);

    Object.entries(this.report.results).forEach(([module, results]) => {
      if (results.length > 0) {
        console.log(`\n${module.toUpperCase()} MODULE:`);
        results.forEach((result) => {
          const icon =
            result.status === "passed"
              ? "✅"
              : result.status === "failed"
              ? "❌"
              : "⚠️";
          console.log(`   ${icon} ${result.test}`);
          if (result.message) console.log(`      Message: ${result.message}`);
          if (result.statusCode)
            console.log(`      Status: ${result.statusCode}`);
          if (result.error)
            console.log(`      Error: ${result.error.substring(0, 100)}...`);
        });
      }
    });

    console.log("\n" + "=".repeat(80));
  }

  saveReport() {
    const reportsDir = path.join(process.cwd(), "reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportPath = path.join(reportsDir, "test-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(this.report, null, 2));
    console.log(`\n💾 Report saved to: ${reportPath}`);
  }

  async runAllTests() {
    console.log("🚀 Starting API Tests...");
    console.log("Base URL:", this.baseURL);

    await this.testAuthModule();
    await this.testUsersModule();
    await this.testAnalysesModule();
    await this.testTemplatesModule();
    await this.testAdminModule();
    await this.testStatisticsModule();

    this.printReport();
    this.saveReport();
  }
}

// Run tests
const runner = new APITestRunner();
runner.runAllTests().catch(console.error);
