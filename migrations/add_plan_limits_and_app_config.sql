-- Adds product/service publish limits per plan and an app_config table
-- for super-admin global settings (e.g. unactivated account limits).

ALTER TABLE `plans`
  ADD COLUMN `product_limit` INT NULL DEFAULT NULL,
  ADD COLUMN `service_limit` INT NULL DEFAULT NULL;

CREATE TABLE IF NOT EXISTS `app_config` (
  `config_key` varchar(128) NOT NULL,
  `config_value` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`config_value`)),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Default limits for unactivated accounts: 5 products, 1 service
INSERT INTO `app_config` (`config_key`, `config_value`)
VALUES ('subscription_limits', '{"unactivatedProductLimit":5,"unactivatedServiceLimit":1}')
ON DUPLICATE KEY UPDATE `config_value` = `config_value`;
