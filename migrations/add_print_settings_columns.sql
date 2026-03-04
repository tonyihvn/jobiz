-- Migration: Add print settings columns to settings table
-- This migration adds support for thermal printer width (50mm/80mm) and same-window receipt opening

ALTER TABLE `settings` ADD COLUMN `open_receipts_in_same_window` tinyint(1) DEFAULT 0 AFTER `invoice_notes`;
ALTER TABLE `settings` ADD COLUMN `thermal_printer_width` varchar(10) DEFAULT '80mm' AFTER `open_receipts_in_same_window`;

-- Verification query (run this to confirm the columns were added):
-- DESCRIBE settings;
