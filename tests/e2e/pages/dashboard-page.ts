import { Page, Locator } from '@playwright/test';

/**
 * ダッシュボードページのページオブジェクトモデル
 */
export class DashboardPage {
  readonly page: Page;
  readonly welcomeMessage: Locator;
  readonly userMenuButton: Locator;
  readonly logoutButton: Locator;
  readonly profileButton: Locator;
  readonly settingsButton: Locator;
  readonly sidebarNavigation: Locator;
  readonly contentSection: Locator;

  /**
   * ダッシュボードページオブジェクトの初期化
   */
  constructor(page: Page) {
    this.page = page;
    this.welcomeMessage = page.locator('[data-testid="welcome-message"]');
    this.userMenuButton = page.locator('[data-testid="user-menu-button"]');
    this.logoutButton = page.locator('[data-testid="logout-button"]');
    this.profileButton = page.locator('[data-testid="profile-button"]');
    this.settingsButton = page.locator('[data-testid="settings-button"]');
    this.sidebarNavigation = page.locator('[data-testid="sidebar-navigation"]');
    this.contentSection = page.locator('[data-testid="content-section"]');
  }

  /**
   * ダッシュボードページに直接移動
   */
  async goto() {
    await this.page.goto('/dashboard');
  }

  /**
   * ユーザーメニューを開く
   */
  async openUserMenu() {
    await this.userMenuButton.click();
  }

  /**
   * ログアウト処理を実行
   */
  async logout() {
    await this.openUserMenu();
    await this.logoutButton.click();
  }

  /**
   * プロフィールページに移動
   */
  async goToProfile() {
    await this.openUserMenu();
    await this.profileButton.click();
  }

  /**
   * 設定ページに移動
   */
  async goToSettings() {
    await this.openUserMenu();
    await this.settingsButton.click();
  }

  /**
   * サイドバーのナビゲーションリンクをクリック
   * @param linkText クリックするリンクのテキスト
   */
  async clickSidebarLink(linkText: string) {
    await this.sidebarNavigation.locator(`text=${linkText}`).click();
  }
}
