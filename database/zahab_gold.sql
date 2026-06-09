-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jun 09, 2026 at 08:55 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `zahab_gold`
--

-- --------------------------------------------------------

--
-- Table structure for table `branches`
--

CREATE TABLE `branches` (
  `id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `country_id` int(11) NOT NULL,
  `city` varchar(100) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `manager_name` varchar(100) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `branches`
--

INSERT INTO `branches` (`id`, `name`, `country_id`, `city`, `address`, `phone`, `email`, `manager_name`, `is_active`, `created_at`) VALUES
(1, 'Kuwait City Main', 1, 'Kuwait City', NULL, '+965-2200-0001', 'kw-main@zahab.com', 'Ahmad Al-Rashidi', 1, '2026-06-01 07:34:21'),
(2, 'Salmiya Branch', 1, 'Salmiya', NULL, '+965-2200-0002', 'kw-salm@zahab.com', 'Sara Al-Mansouri', 1, '2026-06-01 07:34:21'),
(3, 'Riyadh Branch', 2, 'Riyadh', NULL, '+966-11-000-0001', 'sa-riyad@zahab.com', 'Mohammed Al-Harbi', 1, '2026-06-01 07:34:21'),
(4, 'Dubai Branch', 3, 'Dubai', NULL, '+971-4-000-0001', 'ae-dubai@zahab.com', 'Fatima Al-Kuwari', 1, '2026-06-01 07:34:21'),
(5, 'Manama Branch', 4, 'Manama', 'salmiya', '+973-1700-0001', 'bh-manam@zahab.com', 'Khalid Al-Otaibi', 0, '2026-06-01 07:34:21'),
(6, 'Doha Branch', 5, 'Doha', NULL, '+974-4000-0001', 'qa-doha@zahab.com', 'Noor Al-Ansari', 1, '2026-06-01 07:34:21'),
(7, 'Muscat Branch', 6, 'Muscat', NULL, '+968-2400-0001', 'om-muscat@zahab.com', 'Hessa Al-Najjar', 1, '2026-06-01 07:34:21');

-- --------------------------------------------------------

--
-- Table structure for table `catalogs`
--

CREATE TABLE `catalogs` (
  `id` int(11) NOT NULL,
  `title` varchar(200) NOT NULL,
  `description` text DEFAULT NULL,
  `filename` varchar(255) NOT NULL,
  `filesize` int(11) DEFAULT 0,
  `uploaded_by` int(11) NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `id` int(11) NOT NULL,
  `parent_id` int(11) DEFAULT NULL,
  `name` varchar(80) NOT NULL,
  `name_ar` varchar(80) DEFAULT NULL,
  `icon` varchar(10) DEFAULT NULL,
  `sort_order` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`id`, `parent_id`, `name`, `name_ar`, `icon`, `sort_order`, `is_active`) VALUES
(1, NULL, 'Rings', 'خواتم1', '0', 1, 1),
(2, NULL, 'Necklaces', 'قلادات', '📿', 2, 1),
(3, NULL, 'Bracelets', 'أساور', '📿', 3, 1),
(4, NULL, 'Earrings', 'أقراط', '💎', 4, 1),
(5, NULL, 'Coins', 'عملات', '🪙', 5, 1),
(6, NULL, 'Bars', 'سبائك', '🥇', 6, 1),
(7, NULL, 'Pendants', 'تعليقات', '💎', 7, 1),
(8, NULL, 'Sets', 'طقم مجوهرات', '💍', 8, 1);

-- --------------------------------------------------------

--
-- Table structure for table `countries`
--

CREATE TABLE `countries` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `code` char(2) NOT NULL,
  `flag` varchar(10) DEFAULT NULL,
  `currency_code` char(3) NOT NULL,
  `vat_rate` decimal(5,2) DEFAULT 15.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `countries`
--

INSERT INTO `countries` (`id`, `name`, `code`, `flag`, `currency_code`, `vat_rate`, `created_at`) VALUES
(1, 'Kuwait', 'KW', '🇰🇼', 'KWD', 0.00, '2026-06-01 07:34:21'),
(2, 'Saudi Arabia', 'SA', '🇸🇦', 'SAR', 15.00, '2026-06-01 07:34:21'),
(3, 'UAE', 'AE', '🇦🇪', 'AED', 5.00, '2026-06-01 07:34:21'),
(4, 'Bahrain', 'BH', '🇧🇭', 'BHD', 10.00, '2026-06-01 07:34:21'),
(5, 'Qatar', 'QA', '🇶🇦', 'QAR', 0.00, '2026-06-01 07:34:21'),
(6, 'Oman', 'OM', '🇴🇲', 'OMR', 5.00, '2026-06-01 07:34:21');

-- --------------------------------------------------------

--
-- Table structure for table `currencies`
--

CREATE TABLE `currencies` (
  `id` int(11) NOT NULL,
  `code` char(3) NOT NULL,
  `name` varchar(80) NOT NULL,
  `symbol` varchar(10) DEFAULT NULL,
  `rate_to_usd` decimal(12,6) NOT NULL DEFAULT 1.000000,
  `is_gcc` tinyint(1) DEFAULT 0,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `currencies`
--

INSERT INTO `currencies` (`id`, `code`, `name`, `symbol`, `rate_to_usd`, `is_gcc`, `updated_at`) VALUES
(1, 'KWD', 'Kuwaiti Dinar', 'KD', 0.308000, 1, '2026-06-01 07:34:21'),
(2, 'SAR', 'Saudi Riyal', 'SR', 3.750000, 1, '2026-06-01 07:34:21'),
(3, 'AED', 'UAE Dirham', 'AED', 3.670000, 1, '2026-06-01 07:34:21'),
(4, 'BHD', 'Bahraini Dinar', 'BD', 0.376000, 1, '2026-06-01 07:34:21'),
(5, 'QAR', 'Qatari Riyal', 'QR', 3.640000, 1, '2026-06-01 07:34:21'),
(6, 'OMR', 'Omani Rial', 'OMR', 0.385000, 1, '2026-06-01 07:34:21'),
(7, 'USD', 'US Dollar', '$', 1.000000, 0, '2026-06-01 07:34:21'),
(8, 'EUR', 'Euro', '€', 0.920000, 0, '2026-06-01 07:34:21'),
(9, 'GBP', 'British Pound', '£', 0.790000, 0, '2026-06-01 07:34:21');

-- --------------------------------------------------------

--
-- Table structure for table `customers`
--

CREATE TABLE `customers` (
  `id` int(11) NOT NULL,
  `branch_id` int(11) DEFAULT NULL,
  `name` varchar(150) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `nationality` varchar(80) DEFAULT NULL,
  `id_number` varchar(50) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `loyalty_points` int(11) DEFAULT 0,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `customers`
--

INSERT INTO `customers` (`id`, `branch_id`, `name`, `phone`, `email`, `nationality`, `id_number`, `address`, `loyalty_points`, `notes`, `created_at`) VALUES
(1, 1, 'mohamed ibrahim', '66680241', 'it@batoclinic.com', NULL, NULL, NULL, 0, NULL, '2026-06-01 07:59:30');

-- --------------------------------------------------------

--
-- Table structure for table `gold_rates`
--

CREATE TABLE `gold_rates` (
  `id` int(11) NOT NULL,
  `date` date NOT NULL,
  `usd_per_oz` decimal(10,4) NOT NULL,
  `source` varchar(50) DEFAULT 'manual',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `gold_rates`
--

INSERT INTO `gold_rates` (`id`, `date`, `usd_per_oz`, `source`, `created_at`) VALUES
(1, '2026-06-01', 2387.4000, 'manual', '2026-06-01 07:34:21');

-- --------------------------------------------------------

--
-- Table structure for table `invoices`
--

CREATE TABLE `invoices` (
  `id` int(11) NOT NULL,
  `invoice_number` varchar(40) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `customer_id` int(11) DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `currency_code` char(3) NOT NULL DEFAULT 'KWD',
  `exchange_rate` decimal(12,6) NOT NULL DEFAULT 1.000000,
  `gold_rate_usd` decimal(10,4) NOT NULL,
  `subtotal` decimal(14,4) NOT NULL DEFAULT 0.0000,
  `making_total` decimal(14,4) NOT NULL DEFAULT 0.0000,
  `discount_pct` decimal(5,2) DEFAULT 0.00,
  `discount_amount` decimal(14,4) DEFAULT 0.0000,
  `vat_pct` decimal(5,2) DEFAULT 15.00,
  `vat_amount` decimal(14,4) NOT NULL DEFAULT 0.0000,
  `total` decimal(14,4) NOT NULL DEFAULT 0.0000,
  `payment_method` enum('cash','card','bank_transfer','knet','installment') DEFAULT 'cash',
  `payment_status` enum('paid','pending','partial','refunded') DEFAULT 'paid',
  `notes` text DEFAULT NULL,
  `notes_ar` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `invoice_items`
--

CREATE TABLE `invoice_items` (
  `id` int(11) NOT NULL,
  `invoice_id` int(11) NOT NULL,
  `item_id` int(11) DEFAULT NULL,
  `name` varchar(200) NOT NULL,
  `karat` varchar(10) NOT NULL,
  `weight_grams` decimal(10,4) NOT NULL,
  `making_pct` decimal(5,2) DEFAULT 8.00,
  `gold_rate_used` decimal(10,4) NOT NULL,
  `unit_price` decimal(14,4) NOT NULL,
  `qty` int(11) NOT NULL DEFAULT 1,
  `line_total` decimal(14,4) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `items`
--

CREATE TABLE `items` (
  `id` int(11) NOT NULL,
  `sku` varchar(60) NOT NULL,
  `name` varchar(200) NOT NULL,
  `name_ar` varchar(200) DEFAULT NULL,
  `category_id` int(11) NOT NULL,
  `karat` varchar(10) NOT NULL,
  `weight_grams` decimal(10,4) NOT NULL,
  `making_pct` decimal(5,2) DEFAULT 8.00,
  `description` text DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL,
  `description_ar` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `is_special_order` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `items`
--

INSERT INTO `items` (`id`, `sku`, `name`, `name_ar`, `category_id`, `karat`, `weight_grams`, `making_pct`, `description`, `image`, `description_ar`, `is_active`, `is_special_order`, `created_at`, `updated_at`) VALUES
(1, '24k-01', 'Internet', NULL, 7, '24K', 30.0000, 8.00, '', 'item_1780835013_993.jpg', NULL, 1, 0, '2026-06-07 12:23:33', '2026-06-07 12:23:33');

-- --------------------------------------------------------

--
-- Table structure for table `item_branch_stock`
--

CREATE TABLE `item_branch_stock` (
  `id` int(11) NOT NULL,
  `item_id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `qty` int(11) DEFAULT 0,
  `min_qty` int(11) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `item_images`
--

CREATE TABLE `item_images` (
  `id` int(11) NOT NULL,
  `item_id` int(11) NOT NULL,
  `filename` varchar(255) NOT NULL,
  `is_primary` tinyint(1) DEFAULT 0,
  `sort_order` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `karat_making_charges`
--

CREATE TABLE `karat_making_charges` (
  `id` int(11) NOT NULL,
  `branch_id` int(11) DEFAULT NULL,
  `category` varchar(60) NOT NULL,
  `karat` varchar(10) NOT NULL,
  `making_pct` decimal(5,2) NOT NULL DEFAULT 8.00,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `karat_making_charges`
--

INSERT INTO `karat_making_charges` (`id`, `branch_id`, `category`, `karat`, `making_pct`, `updated_at`) VALUES
(1, NULL, 'Rings', '24K', 2.00, '2026-06-01 07:34:21'),
(2, NULL, 'Rings', '22K', 8.00, '2026-06-01 07:34:21'),
(3, NULL, 'Rings', '21K', 8.00, '2026-06-01 07:34:21'),
(4, NULL, 'Rings', '18K', 10.00, '2026-06-01 07:34:21'),
(5, NULL, 'Rings', '14K', 12.00, '2026-06-01 07:34:21'),
(6, NULL, 'Necklaces', '24K', 2.00, '2026-06-01 07:34:21'),
(7, NULL, 'Necklaces', '22K', 9.00, '2026-06-01 07:34:21'),
(8, NULL, 'Necklaces', '21K', 10.00, '2026-06-01 07:34:21'),
(9, NULL, 'Necklaces', '18K', 11.00, '2026-06-01 07:34:21'),
(10, NULL, 'Bracelets', '24K', 2.00, '2026-06-01 07:34:21'),
(11, NULL, 'Bracelets', '22K', 9.00, '2026-06-01 07:34:21'),
(12, NULL, 'Bracelets', '21K', 9.00, '2026-06-01 07:34:21'),
(13, NULL, 'Bracelets', '18K', 10.00, '2026-06-01 07:34:21'),
(14, NULL, 'Earrings', '24K', 2.00, '2026-06-01 07:34:21'),
(15, NULL, 'Earrings', '22K', 11.00, '2026-06-01 07:34:21'),
(16, NULL, 'Earrings', '21K', 12.00, '2026-06-01 07:34:21'),
(17, NULL, 'Earrings', '18K', 13.00, '2026-06-01 07:34:21'),
(18, NULL, 'Coins', '24K', 1.00, '2026-06-01 07:34:21'),
(19, NULL, 'Bars', '24K', 0.50, '2026-06-01 07:34:21');

-- --------------------------------------------------------

--
-- Table structure for table `refunds`
--

CREATE TABLE `refunds` (
  `id` int(11) NOT NULL,
  `refund_number` varchar(60) NOT NULL,
  `invoice_id` int(11) NOT NULL,
  `refund_type` enum('full','partial') NOT NULL DEFAULT 'full',
  `refund_amount` decimal(14,4) NOT NULL,
  `currency_code` char(3) NOT NULL DEFAULT 'KWD',
  `reason` text NOT NULL,
  `processed_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `refund_items`
--

CREATE TABLE `refund_items` (
  `id` int(11) NOT NULL,
  `refund_id` int(11) NOT NULL,
  `invoice_item_id` int(11) NOT NULL,
  `item_name` varchar(200) NOT NULL,
  `qty` int(11) NOT NULL DEFAULT 1,
  `amount` decimal(14,4) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `permissions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`permissions`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`id`, `name`, `permissions`, `created_at`) VALUES
(1, 'admin', '[\"all\"]', '2026-06-01 07:34:21'),
(2, 'manager', '[\"sales\",\"invoices\",\"orders\",\"reports\",\"items\",\"customers\"]', '2026-06-01 07:34:21'),
(3, 'cashier', '[\"sales\",\"invoices\",\"orders\",\"customers\"]', '2026-06-01 07:34:21'),
(4, 'inventory', '[\"items\",\"stock\"]', '2026-06-01 07:34:21');

-- --------------------------------------------------------

--
-- Table structure for table `settings`
--

CREATE TABLE `settings` (
  `id` int(11) NOT NULL,
  `branch_id` int(11) DEFAULT NULL,
  `setting_key` varchar(80) NOT NULL,
  `setting_value` text DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `settings`
--

INSERT INTO `settings` (`id`, `branch_id`, `setting_key`, `setting_value`, `updated_at`) VALUES
(1, NULL, 'shop_name', 'Zahab Gold & Jewelry', '2026-06-01 07:34:21'),
(2, NULL, 'shop_name_ar', 'ذهب للمجوهرات', '2026-06-01 07:34:21'),
(3, NULL, 'invoice_prefix', 'ZHB-', '2026-06-01 07:34:21'),
(4, NULL, 'default_currency', 'KWD', '2026-06-01 07:34:21'),
(5, NULL, 'vat_rate', '15', '2026-06-01 07:34:21'),
(6, NULL, 'invoice_language', 'bilingual', '2026-06-01 07:34:21'),
(7, NULL, 'show_gold_rate_on_invoice', '1', '2026-06-01 07:34:21'),
(8, NULL, 'logo_on_invoice', '1', '2026-06-01 07:34:21'),
(9, NULL, 'shop_name', 'Zahab Gold & Jewelry', '2026-06-07 11:16:04'),
(10, NULL, 'shop_name_ar', 'ذهب للمجوهرات', '2026-06-07 11:16:04'),
(11, NULL, 'invoice_prefix', 'ZHB-', '2026-06-07 11:16:04'),
(12, NULL, 'default_currency', 'KWD', '2026-06-07 11:16:04'),
(13, NULL, 'default_country', 'KW', '2026-06-07 11:16:04'),
(14, NULL, 'vat_rate', '0.00', '2026-06-07 11:16:04'),
(15, NULL, 'invoice_language', 'bilingual', '2026-06-07 11:16:04'),
(16, NULL, 'show_gold_rate_on_invoice', '1', '2026-06-07 11:16:04'),
(17, NULL, 'logo_on_invoice', '1', '2026-06-07 11:16:04');

-- --------------------------------------------------------

--
-- Table structure for table `special_orders`
--

CREATE TABLE `special_orders` (
  `id` int(11) NOT NULL,
  `order_number` varchar(40) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `customer_id` int(11) DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `description` text NOT NULL,
  `description_ar` text DEFAULT NULL,
  `karat` varchar(10) NOT NULL,
  `approx_weight` decimal(10,4) DEFAULT NULL,
  `advance_amount` decimal(14,4) DEFAULT 0.0000,
  `advance_currency` char(3) DEFAULT 'KWD',
  `estimated_total` decimal(14,4) DEFAULT NULL,
  `currency_code` char(3) DEFAULT 'KWD',
  `due_date` date DEFAULT NULL,
  `status` enum('pending','design','fabrication','quality','ready','delivered','cancelled') DEFAULT 'pending',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `special_order_images`
--

CREATE TABLE `special_order_images` (
  `id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `filename` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `special_order_timeline`
--

CREATE TABLE `special_order_timeline` (
  `id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `status` varchar(60) NOT NULL,
  `notes` text DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `stock_transfers`
--

CREATE TABLE `stock_transfers` (
  `id` int(11) NOT NULL,
  `from_branch_id` int(11) NOT NULL,
  `to_branch_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `item_id` int(11) NOT NULL,
  `qty` int(11) NOT NULL DEFAULT 1,
  `status` enum('pending','in_transit','received','cancelled') DEFAULT 'pending',
  `notes` text DEFAULT NULL,
  `transfer_date` date DEFAULT NULL,
  `received_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `branch_id` int(11) DEFAULT NULL,
  `role_id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `last_login` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `branch_id`, `role_id`, `name`, `email`, `password_hash`, `phone`, `is_active`, `last_login`, `created_at`) VALUES
(1, 1, 1, 'Super Admin', 'admin@zahab.com', '$2y$10$UDsu1o3JOwH6qHcuIDhIW.nYoMDWxg3Z7PfaSML.4b41wUnPqm9Mm', '+965-9999-0000', 1, '2026-06-08 07:07:33', '2026-06-01 07:53:41');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `branches`
--
ALTER TABLE `branches`
  ADD PRIMARY KEY (`id`),
  ADD KEY `country_id` (`country_id`);

--
-- Indexes for table `catalogs`
--
ALTER TABLE `catalogs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `uploaded_by` (`uploaded_by`);

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_cat_parent` (`parent_id`);

--
-- Indexes for table `countries`
--
ALTER TABLE `countries`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`);

--
-- Indexes for table `currencies`
--
ALTER TABLE `currencies`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`);

--
-- Indexes for table `customers`
--
ALTER TABLE `customers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `branch_id` (`branch_id`);

--
-- Indexes for table `gold_rates`
--
ALTER TABLE `gold_rates`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_date` (`date`);

--
-- Indexes for table `invoices`
--
ALTER TABLE `invoices`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `invoice_number` (`invoice_number`),
  ADD KEY `customer_id` (`customer_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `idx_invoice_number` (`invoice_number`),
  ADD KEY `idx_branch_date` (`branch_id`,`created_at`),
  ADD KEY `idx_status` (`payment_status`);

--
-- Indexes for table `invoice_items`
--
ALTER TABLE `invoice_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `invoice_id` (`invoice_id`),
  ADD KEY `item_id` (`item_id`);

--
-- Indexes for table `items`
--
ALTER TABLE `items`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `sku` (`sku`),
  ADD KEY `category_id` (`category_id`),
  ADD KEY `idx_sku` (`sku`),
  ADD KEY `idx_karat` (`karat`);

--
-- Indexes for table `item_branch_stock`
--
ALTER TABLE `item_branch_stock`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_item_branch` (`item_id`,`branch_id`),
  ADD KEY `branch_id` (`branch_id`);

--
-- Indexes for table `item_images`
--
ALTER TABLE `item_images`
  ADD PRIMARY KEY (`id`),
  ADD KEY `item_id` (`item_id`);

--
-- Indexes for table `karat_making_charges`
--
ALTER TABLE `karat_making_charges`
  ADD PRIMARY KEY (`id`),
  ADD KEY `branch_id` (`branch_id`);

--
-- Indexes for table `refunds`
--
ALTER TABLE `refunds`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `refund_number` (`refund_number`),
  ADD KEY `invoice_id` (`invoice_id`),
  ADD KEY `processed_by` (`processed_by`);

--
-- Indexes for table `refund_items`
--
ALTER TABLE `refund_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `refund_id` (`refund_id`),
  ADD KEY `invoice_item_id` (`invoice_item_id`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `settings`
--
ALTER TABLE `settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_branch_key` (`branch_id`,`setting_key`);

--
-- Indexes for table `special_orders`
--
ALTER TABLE `special_orders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `order_number` (`order_number`),
  ADD KEY `customer_id` (`customer_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_branch` (`branch_id`);

--
-- Indexes for table `special_order_images`
--
ALTER TABLE `special_order_images`
  ADD PRIMARY KEY (`id`),
  ADD KEY `order_id` (`order_id`);

--
-- Indexes for table `special_order_timeline`
--
ALTER TABLE `special_order_timeline`
  ADD PRIMARY KEY (`id`),
  ADD KEY `order_id` (`order_id`);

--
-- Indexes for table `stock_transfers`
--
ALTER TABLE `stock_transfers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `from_branch_id` (`from_branch_id`),
  ADD KEY `to_branch_id` (`to_branch_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `item_id` (`item_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `branch_id` (`branch_id`),
  ADD KEY `role_id` (`role_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `branches`
--
ALTER TABLE `branches`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `catalogs`
--
ALTER TABLE `catalogs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `countries`
--
ALTER TABLE `countries`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `currencies`
--
ALTER TABLE `currencies`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `customers`
--
ALTER TABLE `customers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `gold_rates`
--
ALTER TABLE `gold_rates`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `invoices`
--
ALTER TABLE `invoices`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `invoice_items`
--
ALTER TABLE `invoice_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `items`
--
ALTER TABLE `items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `item_branch_stock`
--
ALTER TABLE `item_branch_stock`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `item_images`
--
ALTER TABLE `item_images`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `karat_making_charges`
--
ALTER TABLE `karat_making_charges`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT for table `refunds`
--
ALTER TABLE `refunds`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `refund_items`
--
ALTER TABLE `refund_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `settings`
--
ALTER TABLE `settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `special_orders`
--
ALTER TABLE `special_orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `special_order_images`
--
ALTER TABLE `special_order_images`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `special_order_timeline`
--
ALTER TABLE `special_order_timeline`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `stock_transfers`
--
ALTER TABLE `stock_transfers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `branches`
--
ALTER TABLE `branches`
  ADD CONSTRAINT `branches_ibfk_1` FOREIGN KEY (`country_id`) REFERENCES `countries` (`id`);

--
-- Constraints for table `catalogs`
--
ALTER TABLE `catalogs`
  ADD CONSTRAINT `catalogs_ibfk_1` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `categories`
--
ALTER TABLE `categories`
  ADD CONSTRAINT `fk_cat_parent` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `customers`
--
ALTER TABLE `customers`
  ADD CONSTRAINT `customers_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`);

--
-- Constraints for table `invoices`
--
ALTER TABLE `invoices`
  ADD CONSTRAINT `invoices_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  ADD CONSTRAINT `invoices_ibfk_2` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  ADD CONSTRAINT `invoices_ibfk_3` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `invoice_items`
--
ALTER TABLE `invoice_items`
  ADD CONSTRAINT `invoice_items_ibfk_1` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `invoice_items_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `items`
--
ALTER TABLE `items`
  ADD CONSTRAINT `items_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`);

--
-- Constraints for table `item_branch_stock`
--
ALTER TABLE `item_branch_stock`
  ADD CONSTRAINT `item_branch_stock_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`),
  ADD CONSTRAINT `item_branch_stock_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`);

--
-- Constraints for table `item_images`
--
ALTER TABLE `item_images`
  ADD CONSTRAINT `item_images_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `karat_making_charges`
--
ALTER TABLE `karat_making_charges`
  ADD CONSTRAINT `karat_making_charges_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`);

--
-- Constraints for table `refunds`
--
ALTER TABLE `refunds`
  ADD CONSTRAINT `refunds_ibfk_1` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`),
  ADD CONSTRAINT `refunds_ibfk_2` FOREIGN KEY (`processed_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `refund_items`
--
ALTER TABLE `refund_items`
  ADD CONSTRAINT `refund_items_ibfk_1` FOREIGN KEY (`refund_id`) REFERENCES `refunds` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `refund_items_ibfk_2` FOREIGN KEY (`invoice_item_id`) REFERENCES `invoice_items` (`id`);

--
-- Constraints for table `settings`
--
ALTER TABLE `settings`
  ADD CONSTRAINT `settings_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`);

--
-- Constraints for table `special_orders`
--
ALTER TABLE `special_orders`
  ADD CONSTRAINT `special_orders_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  ADD CONSTRAINT `special_orders_ibfk_2` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  ADD CONSTRAINT `special_orders_ibfk_3` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `special_order_images`
--
ALTER TABLE `special_order_images`
  ADD CONSTRAINT `special_order_images_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `special_orders` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `special_order_timeline`
--
ALTER TABLE `special_order_timeline`
  ADD CONSTRAINT `special_order_timeline_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `special_orders` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `stock_transfers`
--
ALTER TABLE `stock_transfers`
  ADD CONSTRAINT `stock_transfers_ibfk_1` FOREIGN KEY (`from_branch_id`) REFERENCES `branches` (`id`),
  ADD CONSTRAINT `stock_transfers_ibfk_2` FOREIGN KEY (`to_branch_id`) REFERENCES `branches` (`id`),
  ADD CONSTRAINT `stock_transfers_ibfk_3` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `stock_transfers_ibfk_4` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`);

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  ADD CONSTRAINT `users_ibfk_2` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
