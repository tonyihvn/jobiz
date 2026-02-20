-- Migration: Add footer_image_top_margin field to settings table
-- This migration adds support for controlling footer image positioning on A4 invoices

ALTER TABLE `settings` ADD COLUMN `footer_image_top_margin` int(11) DEFAULT 0 AFTER `footer_image_height`;

-- Verification query (run this to confirm the column was added):
-- DESCRIBE settings;
