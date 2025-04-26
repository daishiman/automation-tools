import { Page, Locator } from '@playwright/test';

/**
 * ログインページのページオブジェクトモデル
 */
export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;
  readonly emailError: Locator;
  readonly passwordError: Locator;
  readonly registerLink: Locator;
  readonly forgotPasswordLink: Locator;

  /**
   * ログインページオブジェクトの初期化
   */
  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input[type="email"]');
    this.passwordInput = page.locator('input[type="password"]');
    this.loginButton = page.locator('button[type="submit"]');
    this.errorMessage = page.locator('[data-testid="login-error"]');
    this.emailError = page.locator('[data-testid="email-error"]');
    this.passwordError = page.locator('[data-testid="password-error"]');
    this.registerLink = page.locator('a[href*="register"]');
    this.forgotPasswordLink = page.locator('a[href*="forgot-password"]');
  }

  /**
   * ログインページに移動
   */
  async goto() {
    await this.page.goto('/login');
  }

  /**
   * ログイン処理を実行
   * @param email ユーザーのメールアドレス
   * @param password ユーザーのパスワード
   */
  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  /**
   * 新規登録ページに移動
   */
  async goToRegister() {
    await this.registerLink.click();
  }

  /**
   * パスワードリセットページに移動
   */
  async goToForgotPassword() {
    await this.forgotPasswordLink.click();
  }
}
