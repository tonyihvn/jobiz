import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Sample data generators
const companyNames = [
  'TechCore', 'InnovateLabs', 'CloudBridge', 'DataSync', 'VertexSoft',
  'NexusFlow', 'PrimeTech', 'QuantumLeap', 'HorizonX', 'FusionTech',
  'VisionAI', 'SpaceX', 'EliteTrading', 'PrologisAI', 'NetflixClone',
  'SpotifyHub', 'UberConnect', 'AmazonGo', 'MicroLink', 'AppleCore',
  'GoogleNet', 'FacebookMeta', 'InstagramStudio', 'TwitterFlow', 'LinkedInHub',
  'SlackChat', 'DiscordGaming', 'ZoomMeet', 'TeamsCollab', 'SkypeCall',
  'WhatsAppMsg', 'SignalSecure', 'TelegramBot', 'ViberChat', 'WeChatPay',
  'AlibabaShop', 'TaobaoStore', 'EbayMarket', 'ShopifyStore', 'EtcyArtisan',
  'PinterestBoard', 'TikTokVideo', 'YouTubeStudio', 'VimeoShare', 'DailyMotion',
  'SnapchatStory', 'RedditForum', 'QuoraAnswer', 'MediumBlog', 'HashNodeDev',
  'DevToCode', 'StackOverflow', 'GitHubRepo', 'GitLabProject', 'BitbucketCode',
  'JiraTicket', 'ConfluenceWiki', 'TrelloBoard', 'AsanaTask', 'MondayWorkflow',
  'NoitonNote', 'ObsidianVault', 'RoamResearch', 'LogseqGraph', 'RemNote',
  'NotionAI', 'EvernoteCloud', 'OneNoteMs', 'AppleNotes', 'GoogleKeep',
  'MicrosoftLoop', 'SlateEditor', 'NotoPad', 'TexpadLatex', 'OverleafShare',
];

const productCategories = [
  'Electronics', 'Software Licenses', 'Consulting Services', 'Support Plans',
  'Training Programs', 'Custom Development', 'Cloud Services', 'Security Solutions',
  'Analytics Tools', 'Automation Services', 'Data Management', 'Business Tools',
  'Design Services', 'Marketing Tools', 'Sales Solutions', 'Customer Support',
  'Logistics', 'Payment Solutions', 'Integration Services', 'Monitoring Tools'
];

const serviceCategories = [
  'Technical Support', 'Maintenance', 'Implementation', 'Migration Services',
  'Training', 'Consulting', 'Custom Development', 'Integration Support',
  'Data Analytics', 'Optimization Services', 'Security Services', 'Backup Services',
  'Disaster Recovery', 'Performance Tuning', 'Architecture Review', 'Code Review',
  'Testing Services', 'Deployment Support', 'Monitoring', 'Premium Support'
];

// Generate random username based on company name
function generateUsername(companyName, index) {
  const base = companyName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  return `${base}_admin_${String(index).padStart(3, '0')}`;
}

// Generate random email
function generateEmail(username) {
  return `${username}@company-demo.local`;
}

// Generate product name
function generateProductName(categoryIndex, productIndex) {
  const category = productCategories[categoryIndex % productCategories.length];
  return `${category} - Product ${String(productIndex + 1).padStart(2, '0')}`;
}

// Generate service name
function generateServiceName(categoryIndex, serviceIndex) {
  const category = serviceCategories[categoryIndex % serviceCategories.length];
  return `${category} - Service ${String(serviceIndex + 1).padStart(2, '0')}`;
}

// Main seeding function
(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'emdb',
    port: process.env.DB_PORT || 3306,
  });

  const conn = await pool.getConnection();

  try {
    console.log('🌱 Starting database seeding...');
    console.log('📊 Creating 500 companies with 20 products and 5 services each...\n');

    // Hash password once
    const hashedPassword = await bcrypt.hash('password123', 10);

    const NUM_COMPANIES = 500;
    const PRODUCTS_PER_COMPANY = 20;
    const SERVICES_PER_COMPANY = 5;

    const credentials = []; // Store all created credentials for export

    for (let companyIdx = 0; companyIdx < NUM_COMPANIES; companyIdx++) {
      // Generate company data
      const companyNameBase = companyNames[companyIdx % companyNames.length];
      const companyName = `${companyNameBase} Corp ${String(companyIdx + 1).padStart(4, '0')}`;
      const businessId = `biz_${String(companyIdx + 1).padStart(5, '0')}`;
      const username = generateUsername(companyNameBase, companyIdx + 1);
      const email = generateEmail(username);
      const phone = `+234${String(Math.floor(Math.random() * 9000000000) + 1000000000).padStart(10, '0')}`;

      // 1. Create Business
      try {
        await conn.execute(
          `INSERT INTO businesses (id, name, email, phone, status, paymentStatus, account_approved, account_approved_at, planId, subscriptionExpiry, registeredAt)
           VALUES (?, ?, ?, ?, 'active', 'paid', 1, NOW(), ?, '2030-01-01', NOW())`,
          [businessId, companyName, email, phone, 'plan_pro']
        );
      } catch (err) {
        console.error(`❌ Failed to create business ${businessId}:`, err.message);
        continue;
      }

      // 2. Create Admin Role
      const roleId = `role_${businessId}_admin`;
      const adminPermissions = JSON.stringify([
        'dashboard', 'pos', 'stock', 'suppliers', 'clients', 'sales_history',
        'finance', 'communications', 'settings', 'categories',
        'inventory:create', 'inventory:read', 'inventory:update', 'inventory:delete', 'inventory:move',
        'pos:any_location', 'products:create', 'products:read', 'products:update', 'products:delete',
        'categories:create', 'categories:read', 'categories:update', 'categories:delete',
        'suppliers:create', 'suppliers:read', 'suppliers:update', 'suppliers:delete',
        'customers:create', 'customers:read', 'customers:update', 'customers:delete',
        'sales:create', 'sales:read', 'sales:update', 'sales:delete',
        'employees:create', 'employees:read', 'employees:update', 'employees:delete',
        'finance:read', 'finance:create', 'finance:update', 'audit:read',
        'stock:increase', 'stock:decrease', 'stock:move'
      ]);

      try {
        await conn.execute(
          `INSERT INTO roles (id, business_id, name, permissions) VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE permissions = VALUES(permissions)`,
          [roleId, businessId, 'Admin', adminPermissions]
        );
      } catch (err) {
        console.error(`❌ Failed to create role for ${businessId}:`, err.message);
      }

      // 3. Create Admin Employee
      const employeeId = `emp_${businessId}_admin`;
      try {
        await conn.execute(
          `INSERT INTO employees (id, business_id, is_super_admin, name, role_id, password, salary, email, phone,
                                   email_verified, email_verified_at, account_approved, account_approved_at)
           VALUES (?, ?, 0, ?, ?, ?, 5000, ?, ?, 1, NOW(), 1, NOW())
           ON DUPLICATE KEY UPDATE email = VALUES(email), email_verified = 1, account_approved = 1`,
          [employeeId, businessId, `${companyName} Admin`, roleId, hashedPassword, email, phone]
        );
      } catch (err) {
        console.error(`❌ Failed to create employee for ${businessId}:`, err.message);
      }

      // 4. Create Default Location
      const locationId = `loc_${businessId}_main`;
      try {
        await conn.execute(
          `INSERT INTO locations (id, business_id, name, address) VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name = VALUES(name)`,
          [locationId, businessId, 'Main Store', `${companyName} Headquarters`]
        );
      } catch (err) {
        console.error(`❌ Failed to create location for ${businessId}:`, err.message);
      }

      // 5. Set default location for employee
      try {
        await conn.execute(
          `UPDATE employees SET default_location_id = ? WHERE id = ?`,
          [locationId, employeeId]
        );
      } catch (err) {
        console.error(`❌ Failed to set default location for ${employeeId}:`, err.message);
      }

      // 6. Create Products
      for (let prodIdx = 0; prodIdx < PRODUCTS_PER_COMPANY; prodIdx++) {
        const productId = `prod_${businessId}_${String(prodIdx + 1).padStart(3, '0')}`;
        const productName = generateProductName(companyIdx + prodIdx, prodIdx);
        const categoryName = productCategories[(companyIdx + prodIdx) % productCategories.length];
        const price = Math.floor(Math.random() * 50000) / 100 + 10; // Random price 10-510
        const stock = Math.floor(Math.random() * 1000);

        try {
          await conn.execute(
            `INSERT INTO products (id, business_id, name, category_name, category_group, price, stock, unit, is_service)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'unit', 0)
             ON DUPLICATE KEY UPDATE price = VALUES(price), stock = VALUES(stock)`,
            [productId, businessId, productName, categoryName, 'Physical Products', price, stock]
          );

          // Create stock entry for the product
          const stockEntryId = `se_${productId}_${locationId}`;
          try {
            await conn.execute(
              `INSERT INTO stock_entries (id, business_id, product_id, location_id, quantity)
               VALUES (?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE quantity = VALUES(quantity)`,
              [stockEntryId, businessId, productId, locationId, stock]
            );
          } catch (err) {
            // Stock entry errors are non-critical
          }
        } catch (err) {
          console.error(`❌ Failed to create product ${productId}:`, err.message);
        }
      }

      // 7. Create Services
      for (let svcIdx = 0; svcIdx < SERVICES_PER_COMPANY; svcIdx++) {
        const serviceId = `svc_${businessId}_${String(svcIdx + 1).padStart(3, '0')}`;
        const serviceName = generateServiceName(companyIdx + svcIdx, svcIdx);
        const categoryName = serviceCategories[(companyIdx + svcIdx) % serviceCategories.length];
        const price = Math.floor(Math.random() * 100000) / 100 + 50; // Random price 50-1050

        try {
          await conn.execute(
            `INSERT INTO products (id, business_id, name, category_name, category_group, price, stock, unit, is_service)
             VALUES (?, ?, ?, ?, ?, ?, 9999, 'service', 1)
             ON DUPLICATE KEY UPDATE price = VALUES(price), is_service = 1`,
            [serviceId, businessId, serviceName, categoryName, 'Services', price]
          );
        } catch (err) {
          console.error(`❌ Failed to create service ${serviceId}:`, err.message);
        }
      }

      // Store credentials
      credentials.push({
        companyIndex: companyIdx + 1,
        businessId,
        companyName,
        username,
        email,
        password: 'password123',
        phone
      });

      // Progress indicator
      if ((companyIdx + 1) % 50 === 0) {
        console.log(`✅ Completed ${companyIdx + 1}/${NUM_COMPANIES} companies`);
      }
    }

    console.log(`\n✅ Seeding complete!\n`);
    console.log(`📊 Summary:`);
    console.log(`   • Companies created: ${NUM_COMPANIES}`);
    console.log(`   • Products created: ${NUM_COMPANIES * PRODUCTS_PER_COMPANY}`);
    console.log(`   • Services created: ${NUM_COMPANIES * SERVICES_PER_COMPANY}`);
    console.log(`   • Total items: ${NUM_COMPANIES * (PRODUCTS_PER_COMPANY + SERVICES_PER_COMPANY)}\n`);

    // Save credentials to file
    const credentialsPath = path.join(__dirname, '..', 'SEED_CREDENTIALS.json');
    fs.writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2));
    console.log(`📝 Credentials saved to: SEED_CREDENTIALS.json\n`);

    // Print sample credentials
    console.log('📋 Sample Credentials (first 5):\n');
    for (let i = 0; i < Math.min(5, credentials.length); i++) {
      const cred = credentials[i];
      console.log(`Company ${cred.companyIndex}:`);
      console.log(`  Business ID: ${cred.businessId}`);
      console.log(`  Company Name: ${cred.companyName}`);
      console.log(`  Username: ${cred.username}`);
      console.log(`  Email: ${cred.email}`);
      console.log(`  Password: ${cred.password}`);
      console.log(`  Phone: ${cred.phone}\n`);
    }

    console.log(`⚠️  IMPORTANT: All passwords are set to "password123" - change them in production!\n`);

  } catch (err) {
    console.error('💥 Seeding failed:', err.message);
    console.error(err);
  } finally {
    conn.release();
    pool.end();
  }
})();
