/**
 * Scheduled cleanup job for token management and user data
 * This should be run as a cron job in production
 */

import { performCleanup } from '@/lib/token-manager';
import { validateProductionEnvironment } from '@/lib/security-config';
import { connectToDatabase } from '@/lib/mongodb';

// Only run in production environment
if (process.env.NODE_ENV !== 'production') {
  console.log('⚠️ Cleanup job should only run in production environment');
  process.exit(0);
}

// Validate environment before running
if (!validateProductionEnvironment()) {
  console.error('❌ Environment validation failed');
  process.exit(1);
}

async function runCleanup() {
  console.log('🧹 Starting scheduled cleanup job...');
  
  try {
    // Connect to database
    await connectToDatabase();
    console.log('✅ Connected to database');
    
    // Perform cleanup
    const results = await performCleanup();
    
    console.log('✅ Cleanup completed successfully:');
    console.log(`   - Expired tokens cleaned: ${results.expiredTokens}`);
    console.log(`   - Inactive users removed: ${results.inactiveUsers}`);
    
    // Log cleanup results for monitoring
    const logData = {
      timestamp: new Date().toISOString(),
      action: 'scheduled_cleanup',
      results: results,
      status: 'success'
    };
    
    console.log('📊 Cleanup log:', JSON.stringify(logData));
    
  } catch (error) {
    console.error('❌ Cleanup job failed:', error);
    
    // Log error for monitoring
    const errorLog = {
      timestamp: new Date().toISOString(),
      action: 'scheduled_cleanup',
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 'error'
    };
    
    console.error('📊 Error log:', JSON.stringify(errorLog));
    
    process.exit(1);
  }
  
  console.log('🏁 Cleanup job completed');
  process.exit(0);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Cleanup job interrupted');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Cleanup job terminated');
  process.exit(0);
});

// Run cleanup
runCleanup();