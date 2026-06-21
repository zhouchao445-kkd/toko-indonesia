import { execSync } from 'child_process';
import path from 'path';

console.log('🔄 Running database migrations...\n');

try {
  // Run Prisma migrate deploy
  console.log('Executing: npx prisma migrate deploy');
  execSync('npx prisma migrate deploy', {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
  });

  console.log('\n✅ Migrations completed successfully!');
  process.exit(0);
} catch (error) {
  console.error('\n❌ Migration failed:', error);
  process.exit(1);
}
