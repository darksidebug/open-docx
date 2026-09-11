// Creates (or prints instructions to create) a dummy test account on the
// Laravel API, so there's a real logged-in user to exercise the
// collaboration feature with locally.
//
// Usage: npm run dummy-user
// Configure via env vars (see .env.example): DUMMY_USER_EMAIL,
// DUMMY_USER_FIRST_NAME, DUMMY_USER_MIDDLE_NAME, DUMMY_USER_LAST_NAME,
// DUMMY_USER_SUFFIX, DUMMY_USER_PASSWORD, LARAVEL_API_URL,
// LARAVEL_REGISTER_PATH.
import { config } from 'dotenv';

config({ path: '.env.local' });
config({ path: '.env' });

const LARAVEL_API_URL = process.env.LARAVEL_API_URL || 'http://localhost:8000';
const REGISTER_PATH = process.env.LARAVEL_REGISTER_PATH || '/api/register';

const user = {
  email: process.env.DUMMY_USER_EMAIL || 'dummy.tester@example.com',
  first_name: process.env.DUMMY_USER_FIRST_NAME || 'Dummy',
  middle_name: process.env.DUMMY_USER_MIDDLE_NAME || '',
  last_name: process.env.DUMMY_USER_LAST_NAME || 'Tester',
  suffix: process.env.DUMMY_USER_SUFFIX || '',
  password: process.env.DUMMY_USER_PASSWORD || 'Password123!',
};

function printTinkerFallback() {
  console.log('\nCould not register the dummy user through the API.');
  console.log('If your Laravel app has no public /api/register route (common for');
  console.log('internal tools), create the row directly instead. From the Laravel');
  console.log('project root, run:\n');
  console.log('  php artisan tinker\n');
  console.log('then paste:\n');
  console.log(`  \\App\\Models\\User::updateOrCreate(
    ['email' => '${user.email}'],
    [
      'first_name' => '${user.first_name}',
      'middle_name' => '${user.middle_name}',
      'last_name' => '${user.last_name}',
      'suffix' => '${user.suffix}',
      'password' => bcrypt('${user.password}'),
      'email_verified_at' => now(),
    ]
  );`);
  console.log('\nAdjust the model/column names if your schema differs.');
}

async function main() {
  console.log(`Registering dummy user ${user.email} at ${LARAVEL_API_URL}${REGISTER_PATH} ...`);

  let response;
  try {
    response = await fetch(`${LARAVEL_API_URL}${REGISTER_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ ...user, password_confirmation: user.password }),
    });
  } catch (error) {
    console.error(`\nCould not reach ${LARAVEL_API_URL}. Is the Laravel API running?`);
    console.error(error.message);
    printTinkerFallback();
    process.exitCode = 1;
    return;
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    console.error(`\nRegistration failed (HTTP ${response.status}): ${body}`);
    printTinkerFallback();
    process.exitCode = 1;
    return;
  }

  console.log('\nDummy user ready. Sign in at /login with:');
  console.log(`  email:    ${user.email}`);
  console.log(`  password: ${user.password}`);
}

main();
