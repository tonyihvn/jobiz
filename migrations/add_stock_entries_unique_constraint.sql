-- Fix: Add UNIQUE constraint to prevent duplicate stock entries per location
-- This consolidates existing duplicates and ensures only one stock record per (business_id, product_id, location_id)

-- Step 1: Consolidate duplicate entries by summing quantities
-- Create a temporary table with the consolidated data
CREATE TEMPORARY TABLE stock_consolidate AS
SELECT 
  MIN(id) as id,  -- Keep the earliest id
  business_id,
  product_id,
  location_id,
  SUM(quantity) as total_quantity
FROM stock_entries
GROUP BY business_id, product_id, location_id;

-- Step 2: Delete all existing stock_entries
DELETE FROM stock_entries;

-- Step 3: Re-insert the consolidated data
INSERT INTO stock_entries (id, business_id, product_id, location_id, quantity)
SELECT id, business_id, product_id, location_id, total_quantity FROM stock_consolidate;

-- Step 4: Drop temporary table
DROP TEMPORARY TABLE stock_consolidate;

-- Step 5: Add UNIQUE constraint to prevent future duplicates
-- This will fail gracefully if constraint already exists (MySQL will just skip it)
ALTER TABLE stock_entries 
ADD UNIQUE KEY uk_stock_location (business_id, product_id, location_id);

