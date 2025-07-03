const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function testImageHandling() {
    try {
        console.log('Testing image handling...\n');
        
        // Check property_images table
        const imageResult = await pool.query(`
            SELECT property_id, image_data, pg_typeof(image_data) as data_type, octet_length(image_data) as data_length 
            FROM property_images 
            LIMIT 3
        `);
        
        console.log('Property Images:');
        imageResult.rows.forEach((row, index) => {
            console.log(`Row ${index + 1}:`);
            console.log(`  Property ID: ${row.property_id}`);
            console.log(`  Data Type: ${row.data_type}`);
            console.log(`  Data Length: ${row.data_length} bytes`);
            console.log(`  Is Buffer: ${Buffer.isBuffer(row.image_data)}`);
            console.log(`  First 50 chars: ${row.image_data ? row.image_data.toString().substring(0, 50) : 'NULL'}`);
            console.log('---');
        });
        
        // Check profiles table
        const profileResult = await pool.query(`
            SELECT user_id, full_name, profile_picture, pg_typeof(profile_picture) as data_type, 
                   CASE WHEN profile_picture IS NOT NULL THEN octet_length(profile_picture) ELSE 0 END as data_length
            FROM profiles 
            WHERE profile_picture IS NOT NULL
            LIMIT 3
        `);
        
        console.log('\nProfile Pictures:');
        profileResult.rows.forEach((row, index) => {
            console.log(`Row ${index + 1}:`);
            console.log(`  User ID: ${row.user_id}`);
            console.log(`  Full Name: ${row.full_name}`);
            console.log(`  Data Type: ${row.data_type}`);
            console.log(`  Data Length: ${row.data_length} bytes`);
            console.log(`  Is Buffer: ${Buffer.isBuffer(row.profile_picture)}`);
            console.log(`  First 50 chars: ${row.profile_picture ? row.profile_picture.toString().substring(0, 50) : 'NULL'}`);
            console.log('---');
        });
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

testImageHandling(); 