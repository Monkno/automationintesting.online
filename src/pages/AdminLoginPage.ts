import { type Locator, type Page } from '@playwright/test';
import { BasePage } from '../core/BasePage';

export class AdminLoginPage extends BasePage {
  protected readonly path = '/admin';

  constructor(page: Page) {
    super(page);
  }

  protected uniqueMarker(): Locator {
    return this.usernameInput;
  }

  get usernameInput(): Locator {
    return this.page.locator('#username');
  }

  get passwordInput(): Locator {
    return this.page.locator('#password');
  }

  get submitButton(): Locator {
    return this.page.locator('#doLogin');
  }

  get errorAlert(): Locator {
    return this.page.locator('.alert-danger');
  }

  async submitCredentials(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
