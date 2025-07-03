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

async function debugPropertyImages() {
    try {
        console.log('Debugging property images...\n');
        
        // Check if there are any property images
        const countResult = await pool.query('SELECT COUNT(*) as count FROM property_images');
        console.log('Total property images in database:', countResult.rows[0].count);
        
        if (countResult.rows[0].count > 0) {
            // Get sample property images
            const imageResult = await pool.query(`
                SELECT pi.property_id, pi.image_data, p.property_type, p.address,
                       pg_typeof(pi.image_data) as data_type, octet_length(pi.image_data) as data_length,
                       pi.image_data IS NOT NULL as has_data
                FROM property_images pi
                JOIN properties p ON pi.property_id = p.property_id
                LIMIT 3
            `);
            
            console.log('\nSample property images:');
            imageResult.rows.forEach((row, index) => {
                console.log(`Row ${index + 1}:`);
                console.log(`  Property ID: ${row.property_id}`);
                console.log(`  Property: ${row.property_type} in ${row.address}`);
                console.log(`  Data Type: ${row.data_type}`);
                console.log(`  Data Length: ${row.data_length} bytes`);
                console.log(`  Has Data: ${row.has_data}`);
                console.log(`  Is Buffer: ${Buffer.isBuffer(row.image_data)}`);
                if (row.image_data) {
                    const base64 = row.image_data.toString('base64');
                    console.log(`  Base64 Length: ${base64.length}`);
                    console.log(`  Base64 Start: ${base64.substring(0, 50)}...`);
                    console.log(`  Valid Base64: ${/^[A-Za-z0-9+/]*={0,2}$/.test(base64)}`);
                }
                console.log('---');
            });
        } else {
            console.log('No property images found in database!');
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

debugPropertyImages(); 