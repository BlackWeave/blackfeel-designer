import pool from '../config/db.js';

async function fixUndefinedUrls() {
    try {
        console.log('🔧 Fixing undefined URLs in database...');
        
        // Fix designs table - replace 'undefined/' with proper CDN URL
        const designsResult = await pool.query(`
            UPDATE designs
            SET finalized_image_url = REPLACE(finalized_image_url, 'undefined/', 'https://cdn.blackfeel.co.in/')
            WHERE finalized_image_url LIKE 'undefined/%'
        `);
        
        console.log(`✅ Updated ${designsResult.rowCount} rows in designs table`);
        
        // Fix fulfillment_queue table
        const fulfillmentResult = await pool.query(`
            UPDATE fulfillment_queue
            SET print_mockup_url = REPLACE(print_mockup_url, 'undefined/', 'https://cdn.blackfeel.co.in/')
            WHERE print_mockup_url LIKE 'undefined/%'
        `);
        
        console.log(`✅ Updated ${fulfillmentResult.rowCount} rows in fulfillment_queue table`);
        
        // Show sample of updated URLs
        const sampleResult = await pool.query(`
            SELECT id, finalized_image_url
            FROM designs
            WHERE finalized_image_url LIKE 'https://cdn.blackfeel.co.in/finals/%'
            LIMIT 5
        `);
        
        if (sampleResult.rows.length > 0) {
            console.log('\n📋 Sample updated URLs:');
            sampleResult.rows.forEach(row => {
                console.log(`   - ${row.finalized_image_url}`);
            });
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error);
        process.exit(1);
    }
}

fixUndefinedUrls();
