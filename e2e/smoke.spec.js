import { test, expect } from '@playwright/test';

// Runs in order: the first project sets up the instance, later tests log in.
test.describe.configure({ mode: 'serial' });

// Throwaway account for the disposable e2e database only.
const ADMIN = {
  name: 'E2E Admin',
  email: 'e2e-admin@example.com',
  password: 'e2e-only-disposable-passphrase',
};

async function ensureLoggedIn(page) {
  await page.goto('/');
  const setup = page.getByRole('button', { name: 'Create administrator account' });
  const login = page.getByRole('button', { name: 'Log in' });
  await expect(setup.or(login)).toBeVisible();
  if (await setup.isVisible()) {
    await page.getByLabel('Your name').fill(ADMIN.name);
    await page.getByLabel('E-mail').fill(ADMIN.email);
    await page.getByLabel('Password').fill(ADMIN.password);
    await setup.click();
  } else {
    await page.getByLabel('E-mail').fill(ADMIN.email);
    await page.getByLabel('Password').fill(ADMIN.password);
    await login.click();
  }
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Good|Hello/);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('pm.lang')) localStorage.setItem('pm.lang', 'en');
  });
});

test('first run: set up admin, add a pet, see it on the dashboard', async ({ page }, testInfo) => {
  const petName = `Testpet ${testInfo.project.name}`;
  await ensureLoggedIn(page);

  await page.goto('/pets');
  await page.getByRole('button', { name: 'Add pet' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Name').fill(petName);
  await dialog.getByLabel('Breed').fill('Test breed');
  await dialog.getByRole('button', { name: 'Save' }).click();

  await expect(page.getByRole('heading', { level: 1, name: petName })).toBeVisible();

  await page.goto('/');
  await expect(page.getByText(petName).first()).toBeVisible();
});

test('theme and language can be switched without reload', async ({ page }) => {
  await ensureLoggedIn(page);
  await page.goto('/settings');
  await page.getByRole('radio', { name: /Neutral Dark/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'neutral-dark');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#121417');

  await page.getByLabel('Language', { exact: true }).click();
  await page.getByRole('option', { name: 'Deutsch' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Einstellungen' })).toBeVisible();

  // persisted across reloads
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'neutral-dark');
  await expect(page.getByRole('heading', { level: 1, name: 'Einstellungen' })).toBeVisible();
});

test('households: invited members share pets, other households do not see them', async ({
  page,
  browser,
}, testInfo) => {
  const project = testInfo.project.name;
  const petName = `Testpet ${project}`;
  await ensureLoggedIn(page);
  await page.goto('/settings');
  // The second project finds the link the first one created.
  const create = page.getByRole('button', { name: 'Create invite link' });
  await expect(create.or(page.getByLabel('Invite link'))).toBeVisible();
  if (await create.isVisible()) await create.click();
  const link = await page.getByLabel('Invite link').inputValue();
  expect(link).toContain('/register?invite=');

  const register = async (url, { name, email, household }) => {
    const context = await browser.newContext({ ...testInfo.project.use });
    await context.addInitScript(() => localStorage.setItem('pm.lang', 'en'));
    const other = await context.newPage();
    await other.goto(url);
    await other.getByLabel('Your name').fill(name);
    await other.getByLabel('E-mail').fill(email);
    await other.getByLabel('Password').fill(ADMIN.password);
    if (household) await other.getByLabel('Household name').fill(household);
    await other.getByRole('button', { name: 'Register' }).click();
    await expect(other.getByRole('heading', { level: 1 })).toContainText(/Good|Hello/);
    await other.goto('/pets');
    return other;
  };

  // Joins the admin's household via the invite link (registration is closed).
  const member = await register(link, {
    name: 'Invited',
    email: `invited-${project}@example.com`,
  });
  await expect(member.getByText(petName).first()).toBeVisible();
  await member.context().close();

  // A separate family on the same instance sees none of it.
  await page.goto('/admin');
  // Controlled switch: it flips once the server has saved the setting.
  const registration = page.getByLabel('Allow new registrations');
  await registration.click();
  await expect(registration).toBeChecked();
  const stranger = await register('/register', {
    name: 'Stranger',
    email: `stranger-${project}@example.com`,
    household: 'Other family',
  });
  await expect(stranger.getByRole('button', { name: 'Add pet' }).first()).toBeVisible();
  await expect(stranger.getByText(petName)).toHaveCount(0);
  await stranger.context().close();
  await registration.click();
  await expect(registration).not.toBeChecked();
});
