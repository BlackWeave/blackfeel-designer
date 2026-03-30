-- Migration: Update orders table to support front/back designs
-- This migration updates the orders table to store separate design IDs for front and back
-- and adds a column for the combined mockup URL

-- Add design_id_front column (replaces the old design_id)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS design_id_front uuid REFERENCES designs(id) ON DELETE RESTRICT;

-- Add design_id_back column for back-side designs
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS design_id_back uuid REFERENCES designs(id) ON DELETE RESTRICT;

-- Add combined_mockup_url column for the side-by-side mockup
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS combined_mockup_url VARCHAR(1024);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_design_id_front ON orders(design_id_front);
CREATE INDEX IF NOT EXISTS idx_orders_design_id_back ON orders(design_id_back);

-- Add foreign key constraints if they don't exist
DO $$ 
BEGIN 
    -- Add foreign key for design_id_front if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'orders_design_id_front_fkey' 
        AND table_name = 'orders'
    ) THEN
        ALTER TABLE orders 
        ADD CONSTRAINT orders_design_id_front_fkey 
        FOREIGN KEY (design_id_front) REFERENCES designs(id) ON DELETE RESTRICT;
    END IF;

    -- Add foreign key for design_id_back if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'orders_design_id_back_fkey' 
        AND table_name = 'orders'
    ) THEN
        ALTER TABLE orders 
        ADD CONSTRAINT orders_design_id_back_fkey 
        FOREIGN KEY (design_id_back) REFERENCES designs(id) ON DELETE RESTRICT;
    END IF;
END $$;

-- Note: The old design_id column can be dropped after verifying all data is migrated
-- ALTER TABLE orders DROP COLUMN IF EXISTS design_id;
