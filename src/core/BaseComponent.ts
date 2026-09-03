import type { Locator, Page } from '@playwright/test';

/**
 * A component object owns a fragment of the DOM, addressed by a root locator.
 * Every child locator is scoped to that root, so the same class works on any
 * page that renders the fragment.
 */
export abstract class BaseComponent {
  protected constructor(
    protected readonly page: Page,
    readonly root: Locator,
  ) {}

  protected child(selector: string): Locator {
    return this.root.locator(selector);
  }
}
