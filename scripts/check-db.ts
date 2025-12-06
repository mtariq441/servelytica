import '../server/env';

console.log('Starting DB Check...');

async function check() {
    try {
        console.log('Importing DB...');
        const { db } = await import('../server/db');

        console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not Set');
        if (process.env.DATABASE_URL) {
            try {
                const url = new URL(process.env.DATABASE_URL);
                console.log('DB Host:', url.hostname);
            } catch (e) {
                console.log('Invalid DATABASE_URL format');
            }
        }

        console.log('Executing query...');
        const result = await db.execute('SELECT 1');
        console.log('DB Connection Successful:', result);
    } catch (error) {
        console.error('DB Check Failed:', error);
    }
}

check();
