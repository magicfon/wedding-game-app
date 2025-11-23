
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Manually load .env.local
const envPath = path.join(process.cwd(), '.env.local');
console.log('Loading env from:', envPath);

if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["']|["']$/g, ''); // Remove quotes if present
            process.env[key] = value;
        }
    });
} else {
    console.error('❌ .env.local file not found!');
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Service Key length:', supabaseServiceKey ? supabaseServiceKey.length : 0);

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase URL or Service Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
    console.log('Checking photos table schema...');

    const { data, error } = await supabase
        .from('photos')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error querying photos table:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('No photos found, cannot determine schema from data.');
        return;
    }

    const photo = data[0];
    console.log('Available columns:', Object.keys(photo));

    const requiredColumns = [
        'thumbnail_url_template',
        'thumbnail_small_url',
        'thumbnail_medium_url',
        'thumbnail_large_url',
        'thumbnail_generated_at'
    ];

    const missingColumns = requiredColumns.filter(col => !(col in photo));

    if (missingColumns.length > 0) {
        console.error('❌ Missing columns:', missingColumns);
    } else {
        console.log('✅ All thumbnail columns are present.');
    }
}

checkSchema();
