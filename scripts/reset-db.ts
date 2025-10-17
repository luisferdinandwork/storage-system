import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function resetDatabase() {
  try {
    console.log('Resetting database...');
    
    await sql`DROP TABLE IF EXISTS item_clearances CASCADE`;
    await sql`DROP TABLE IF EXISTS return_requests CASCADE`;
    await sql`DROP TABLE IF EXISTS borrow_requests CASCADE`;
    await sql`DROP TABLE IF EXISTS item_requests CASCADE`;
    await sql`DROP TABLE IF EXISTS item_images CASCADE`;
    await sql`DROP TABLE IF EXISTS items CASCADE`;
    await sql`DROP TABLE IF EXISTS users CASCADE`;
    await sql`DROP TABLE IF EXISTS departments CASCADE`;
    await sql`DROP TABLE IF EXISTS item_stock CASCADE`;
    await sql`DROP TABLE IF EXISTS stock_movements CASCADE`
    await sql`DROP TABLE IF EXISTS borrow_request_items CASCADE`
    
    console.log('All tables dropped successfully');
    console.log('Database reset successfully. Please run "npm run db:generate" and "npm run db:migrate" to create the new schema.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error resetting database:', error);
    process.exit(1);
  }
}

resetDatabase();