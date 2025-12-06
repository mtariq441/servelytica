const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const content = `DATABASE_URL=postgresql://postgres:EU5URRXWv1yPWop7@db.pxzlivocnykjjikkjago.supabase.co:5432/postgres
VERCEL=true
VERCEL_ENV=production
VITE_ENABLE_BLOG_SYSTEM=true
`;

try {
    fs.writeFileSync(envPath, content);
    console.log('.env.local updated successfully');
    console.log('New content:');
    console.log(content);
} catch (err) {
    console.error('Failed to update .env.local:', err);
}
