// @ts-nocheck
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // ============================================
  // 1. CREATE ROLES
  // ============================================
  console.log('📋 Creating admin roles...');

  const roles = [
    {
      name: 'super_admin',
      display_name: '超级管理员',
      description: '拥有所有权限，可以管理所有模块',
      is_system: true,
    },
    {
      name: 'finance_super_admin',
      display_name: '财务超级管理员',
      description: '拥有财务模块全部权限，可直接修改余额',
      is_system: true,
    },
    {
      name: 'product_manager',
      display_name: '商品管理员',
      description: '管理商品、分类、属性',
      is_system: true,
    },
    {
      name: 'order_manager',
      display_name: '订单管理员',
      description: '管理订单、发货、退款',
      is_system: true,
    },
    {
      name: 'customer_service',
      display_name: '客服专员',
      description: '处理客户咨询、投诉',
      is_system: true,
    },
    {
      name: 'finance_manager',
      display_name: '财务管理员',
      description: '管理财务、提现、对账',
      is_system: true,
    },
    {
      name: 'marketing_manager',
      display_name: '营销管理员',
      description: '管理优惠券、广告、活动',
      is_system: true,
    },
  ];

  for (const role of roles) {
    await prisma.roles.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
    console.log(`  ✓ Created role: ${role.display_name}`);
  }

  // ============================================
  // 2. CREATE PERMISSIONS
  // ============================================
  console.log('\n🔐 Creating permissions...');

  const permissions = [
    // Products module
    { code: 'products.view', name: '查看商品', module: 'products', description: '查看商品列表和详情' },
    { code: 'products.create', name: '创建商品', module: 'products', description: '创建新商品' },
    { code: 'products.edit', name: '编辑商品', module: 'products', description: '编辑商品信息' },
    { code: 'products.delete', name: '删除商品', module: 'products', description: '删除商品' },

    // Categories module
    { code: 'categories.view', name: '查看分类', module: 'categories', description: '查看分类列表' },
    { code: 'categories.create', name: '创建分类', module: 'categories', description: '创建新分类' },
    { code: 'categories.edit', name: '编辑分类', module: 'categories', description: '编辑分类信息' },
    { code: 'categories.delete', name: '删除分类', module: 'categories', description: '删除分类' },

    // Orders module
    { code: 'orders.view', name: '查看订单', module: 'orders', description: '查看订单列表和详情' },
    { code: 'orders.create', name: '创建订单', module: 'orders', description: '手动创建订单' },
    { code: 'orders.edit', name: '编辑订单', module: 'orders', description: '编辑订单信息' },
    { code: 'orders.delete', name: '删除订单', module: 'orders', description: '删除订单' },
    { code: 'orders.ship', name: '发货', module: 'orders', description: '处理订单发货' },
    { code: 'orders.refund', name: '退款', module: 'orders', description: '处理订单退款' },

    // Users module
    { code: 'users.view', name: '查看用户', module: 'users', description: '查看用户列表和详情' },
    { code: 'users.create', name: '创建用户', module: 'users', description: '手动创建用户' },
    { code: 'users.edit', name: '编辑用户', module: 'users', description: '编辑用户信息' },
    { code: 'users.delete', name: '删除用户', module: 'users', description: '删除用户' },

    // Finance module
    { code: 'finance.view', name: '查看财务', module: 'finance', description: '查看财务数据' },
    { code: 'finance.withdrawal', name: '处理提现', module: 'finance', description: '审核和处理提现申请' },
    { code: 'finance.balance', name: '管理余额', module: 'finance', description: '管理用户余额' },

    // Marketing module
    { code: 'marketing.view', name: '查看营销', module: 'marketing', description: '查看营销活动' },
    { code: 'marketing.create', name: '创建活动', module: 'marketing', description: '创建优惠券和活动' },
    { code: 'marketing.edit', name: '编辑活动', module: 'marketing', description: '编辑营销活动' },
    { code: 'marketing.delete', name: '删除活动', module: 'marketing', description: '删除营销活动' },

    // Support module
    { code: 'support.view', name: '查看客服', module: 'support', description: '查看客服对话' },
    { code: 'support.reply', name: '回复客户', module: 'support', description: '回复客户咨询' },

    // Settings module
    { code: 'settings.view', name: '查看设置', module: 'settings', description: '查看系统设置' },
    { code: 'settings.edit', name: '编辑设置', module: 'settings', description: '修改系统设置' },

    // Statistics module
    { code: 'statistics.view', name: '查看统计', module: 'statistics', description: '查看数据统计' },
  ];

  for (const perm of permissions) {
    await prisma.permissions.upsert({
      where: { code: perm.code },
      update: {},
      create: perm,
    });
  }
  console.log(`  ✓ Created ${permissions.length} permissions`);

  // ============================================
  // 3. ASSIGN PERMISSIONS TO ROLES
  // ============================================
  console.log('\n🔗 Assigning permissions to roles...');

  const superAdminRole = await prisma.roles.findUnique({ where: { name: 'super_admin' } });
  const allPermissions = await prisma.permissions.findMany();

  if (superAdminRole) {
    for (const perm of allPermissions) {
      await prisma.role_permissions.upsert({
        where: {
          role_id_permission_id: {
            role_id: superAdminRole.id,
            permission_id: perm.id,
          },
        },
        update: {},
        create: {
          role_id: superAdminRole.id,
          permission_id: perm.id,
        },
      });
    }
    console.log(`  ✓ Super admin: all ${allPermissions.length} permissions`);
  }

  // Finance super admin: finance (all) + users.view + statistics.view
  const financeSuperAdminRole = await prisma.roles.findUnique({ where: { name: 'finance_super_admin' } });
  const financeSuperAdminPerms = allPermissions.filter(p =>
    p.module === 'finance' || p.code === 'users.view' || p.code === 'statistics.view'
  );
  if (financeSuperAdminRole) {
    for (const perm of financeSuperAdminPerms) {
      await prisma.role_permissions.upsert({
        where: {
          role_id_permission_id: { role_id: financeSuperAdminRole.id, permission_id: perm.id },
        },
        update: {},
        create: { role_id: financeSuperAdminRole.id, permission_id: perm.id },
      });
    }
    console.log(`  ✓ Finance super admin: ${financeSuperAdminPerms.length} permissions`);
  }

  // Product manager: products + categories
  const productManagerRole = await prisma.roles.findUnique({ where: { name: 'product_manager' } });
  const productPermissions = allPermissions.filter(p => p.module === 'products' || p.module === 'categories');
  if (productManagerRole) {
    for (const perm of productPermissions) {
      await prisma.role_permissions.upsert({
        where: { role_id_permission_id: { role_id: productManagerRole.id, permission_id: perm.id } },
        update: {},
        create: { role_id: productManagerRole.id, permission_id: perm.id },
      });
    }
    console.log(`  ✓ Product manager: ${productPermissions.length} permissions`);
  }

  // Order manager: orders + users.view
  const orderManagerRole = await prisma.roles.findUnique({ where: { name: 'order_manager' } });
  const orderPermissions = allPermissions.filter(p => p.module === 'orders' || p.code === 'users.view');
  if (orderManagerRole) {
    for (const perm of orderPermissions) {
      await prisma.role_permissions.upsert({
        where: { role_id_permission_id: { role_id: orderManagerRole.id, permission_id: perm.id } },
        update: {},
        create: { role_id: orderManagerRole.id, permission_id: perm.id },
      });
    }
    console.log(`  ✓ Order manager: ${orderPermissions.length} permissions`);
  }

  // Customer service: support + users.view + orders.view
  const customerServiceRole = await prisma.roles.findUnique({ where: { name: 'customer_service' } });
  const csPermissions = allPermissions.filter(p => p.module === 'support' || p.code === 'users.view' || p.code === 'orders.view');
  if (customerServiceRole) {
    for (const perm of csPermissions) {
      await prisma.role_permissions.upsert({
        where: { role_id_permission_id: { role_id: customerServiceRole.id, permission_id: perm.id } },
        update: {},
        create: { role_id: customerServiceRole.id, permission_id: perm.id },
      });
    }
    console.log(`  ✓ Customer service: ${csPermissions.length} permissions`);
  }

  // Finance manager: finance.view + finance.withdrawal + users.view
  const financeManagerRole = await prisma.roles.findUnique({ where: { name: 'finance_manager' } });
  const financeManagerPerms = allPermissions.filter(p =>
    p.code === 'finance.view' || p.code === 'finance.withdrawal' || p.code === 'users.view'
  );
  if (financeManagerRole) {
    for (const perm of financeManagerPerms) {
      await prisma.role_permissions.upsert({
        where: { role_id_permission_id: { role_id: financeManagerRole.id, permission_id: perm.id } },
        update: {},
        create: { role_id: financeManagerRole.id, permission_id: perm.id },
      });
    }
    console.log(`  ✓ Finance manager: ${financeManagerPerms.length} permissions`);
  }

  // Marketing manager: marketing
  const marketingManagerRole = await prisma.roles.findUnique({ where: { name: 'marketing_manager' } });
  const marketingPermissions = allPermissions.filter(p => p.module === 'marketing');
  if (marketingManagerRole) {
    for (const perm of marketingPermissions) {
      await prisma.role_permissions.upsert({
        where: { role_id_permission_id: { role_id: marketingManagerRole.id, permission_id: perm.id } },
        update: {},
        create: { role_id: marketingManagerRole.id, permission_id: perm.id },
      });
    }
    console.log(`  ✓ Marketing manager: ${marketingPermissions.length} permissions`);
  }

  // ============================================
  // 4. CREATE DEFAULT ADMIN ACCOUNTS
  // ============================================
  console.log('\n👤 Creating default admin accounts...');

  // Super admin
  const superAdminPassword = await bcrypt.hash('admin123', 10);
  const superAdmin = await prisma.admins.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password_hash: superAdminPassword,
      full_name: '超级管理员',
      email: 'admin@toko.com',
      is_active: true,
    },
  });

  if (superAdminRole) {
    await prisma.admin_role_assignments.upsert({
      where: { admin_id_role_id: { admin_id: superAdmin.id, role_id: superAdminRole.id } },
      update: {},
      create: { admin_id: superAdmin.id, role_id: superAdminRole.id },
    });
  }
  console.log('  ✓ Super admin: admin / admin123');

  // Finance super admin
  const financeAdminPassword = await bcrypt.hash('finance123', 10);
  const financeAdmin = await prisma.admins.upsert({
    where: { username: 'finance' },
    update: {},
    create: {
      username: 'finance',
      password_hash: financeAdminPassword,
      full_name: '财务超级管理员',
      email: 'finance@toko.com',
      is_active: true,
    },
  });

  if (financeSuperAdminRole) {
    await prisma.admin_role_assignments.upsert({
      where: { admin_id_role_id: { admin_id: financeAdmin.id, role_id: financeSuperAdminRole.id } },
      update: {},
      create: { admin_id: financeAdmin.id, role_id: financeSuperAdminRole.id },
    });
  }
  console.log('  ✓ Finance super admin: finance / finance123');

  // ============================================
  // 5. CREATE SAMPLE CATEGORIES
  // ============================================
  console.log('\n📦 Creating sample categories...');

  // Use raw SQL for insert since categories has no unique field besides id
  const existingCategories = await prisma.categories.findMany({ select: { id: true, name: true } });
  
  let electronicsCategory = existingCategories.find(c => c.name === 'Elektronik');
  let accessoriesCategory = existingCategories.find(c => c.name === 'Aksesoris HP');

  if (!electronicsCategory) {
    const result = await prisma.categories.create({
      data: {
        name: 'Elektronik',
        icon_emoji: '📱',
        sort_order: 1,
        is_active: true,
      },
    });
    electronicsCategory = result;
    console.log('  ✓ Created category: Elektronik');
  }

  if (!accessoriesCategory) {
    const result = await prisma.categories.create({
      data: {
        name: 'Aksesoris HP',
        icon_emoji: '🎧',
        sort_order: 2,
        is_active: true,
      },
    });
    accessoriesCategory = result;
    console.log('  ✓ Created category: Aksesoris HP');
  }

  // ============================================
  // 6. CREATE SAMPLE PRODUCTS (with images)
  // ============================================
  console.log('\n🛍️  Creating sample products...');

  const existingProducts = await prisma.products.findMany({ select: { id: true, name: true } });

  // Product 1: Smartphone
  let phoneProduct = existingProducts.find(p => p.name === 'Samsung Galaxy A55 5G');
  if (!phoneProduct && electronicsCategory) {
    const result = await prisma.products.create({
      data: {
        name: 'Samsung Galaxy A55 5G',
        description: 'Samsung Galaxy A55 5G 12GB/256GB - Garansi Resmi Indonesia',
        price: 5499000,
        stock: 50,
        category_id: electronicsCategory.id,
        is_active: true,
        sort_order: 1,
      },
    });
    phoneProduct = result;

    // Add product images
    await prisma.product_images.create({
      data: {
        product_id: result.id,
        image_url: '/test-images/phone.jpg',
        sort_order: 1,
      },
    });

    // Add product params
    await prisma.product_params.createMany({
      data: [
        { product_id: result.id, param_name: 'Brand', param_value: 'Samsung' },
        { product_id: result.id, param_name: 'RAM', param_value: '12GB' },
        { product_id: result.id, param_name: 'Storage', param_value: '256GB' },
        { product_id: result.id, param_name: 'Network', param_value: '5G' },
      ],
    });
    console.log('  ✓ Created product: Samsung Galaxy A55 5G');
  }

  // Product 2: Tablet
  let tabletProduct = existingProducts.find(p => p.name === 'iPad Air M2 2024');
  if (!tabletProduct && electronicsCategory) {
    const result = await prisma.products.create({
      data: {
        name: 'iPad Air M2 2024',
        description: 'Apple iPad Air M2 11 inch WiFi 128GB - Garansi Resmi iBox',
        price: 9299000,
        stock: 30,
        category_id: electronicsCategory.id,
        is_active: true,
        sort_order: 2,
      },
    });
    tabletProduct = result;

    await prisma.product_images.create({
      data: {
        product_id: result.id,
        image_url: '/test-images/tablet.jpg',
        sort_order: 1,
      },
    });

    await prisma.product_params.createMany({
      data: [
        { product_id: result.id, param_name: 'Brand', param_value: 'Apple' },
        { product_id: result.id, param_name: 'Chip', param_value: 'M2' },
        { product_id: result.id, param_name: 'Storage', param_value: '128GB' },
        { product_id: result.id, param_name: 'Display', param_value: '11 inch' },
      ],
    });
    console.log('  ✓ Created product: iPad Air M2 2024');
  }

  // Product 3: Wireless Earbuds
  let earbudsProduct = existingProducts.find(p => p.name === 'Samsung Galaxy Buds FE');
  if (!earbudsProduct && accessoriesCategory) {
    const result = await prisma.products.create({
      data: {
        name: 'Samsung Galaxy Buds FE',
        description: 'Samsung Galaxy Buds FE - True Wireless Earbuds ANC - Garansi Resmi',
        price: 1599000,
        stock: 100,
        category_id: accessoriesCategory.id,
        is_active: true,
        sort_order: 1,
      },
    });
    earbudsProduct = result;

    await prisma.product_images.create({
      data: {
        product_id: result.id,
        image_url: '/test-images/earbuds.jpg',
        sort_order: 1,
      },
    });

    await prisma.product_params.createMany({
      data: [
        { product_id: result.id, param_name: 'Brand', param_value: 'Samsung' },
        { product_id: result.id, param_name: 'Type', param_value: 'TWS' },
        { product_id: result.id, param_name: 'ANC', param_value: 'Yes' },
        { product_id: result.id, param_name: 'Battery', param_value: '6h + 20h case' },
      ],
    });
    console.log('  ✓ Created product: Samsung Galaxy Buds FE');
  }

  // ============================================
  // 7. CREATE SHIPPING METHODS
  // ============================================
  console.log('\n🚚 Creating shipping methods...');

  const existingShipping = await prisma.shipping_methods.findMany({ select: { id: true, name: true } });

  const shippingData = [
    { name: 'JNE Reguler', description: 'Layanan reguler JNE (2-3 hari)', base_fee: 15000, estimated_days: '2-3 hari', sort_order: 1 },
    { name: 'JNE YES', description: 'Layanan ekspres JNE (1 hari)', base_fee: 30000, estimated_days: '1 hari', sort_order: 2 },
    { name: 'SiCepat HALU', description: 'SiCepat same day delivery', base_fee: 25000, estimated_days: '1 hari', sort_order: 3 },
    { name: 'AnterAja Reguler', description: 'AnterAja reguler (2-4 hari)', base_fee: 12000, estimated_days: '2-4 hari', sort_order: 4 },
  ];

  for (const ship of shippingData) {
    if (!existingShipping.find(s => s.name === ship.name)) {
      await prisma.shipping_methods.create({ data: { ...ship, is_active: true } });
      console.log(`  ✓ Created shipping: ${ship.name}`);
    }
  }

  // ============================================
  // 8. CREATE BANK ACCOUNTS
  // ============================================
  console.log('\n🏦 Creating bank accounts...');

  const existingBanks = await prisma.bank_accounts.findMany({ select: { id: true, bank_name: true, account_number: true } });

  // BCA account (main)
  if (!existingBanks.find(b => b.bank_name === 'BCA' && b.account_number === '7260388724')) {
    await prisma.bank_accounts.create({
      data: {
        bank_name: 'BCA',
        account_number: '7260388724',
        account_name: 'ZHOU CHAO',
        is_active: true,
        sort_order: 1,
      },
    });
    console.log('  ✓ Created bank: BCA / 7260388724 / ZHOU CHAO');
  }

  // ============================================
  // 9. CREATE SITE SETTINGS
  // ============================================
  console.log('\n⚙️  Creating site settings...');

  const settingsData = [
    { key: 'site_name', value: 'Toko Indonesia', description: 'Nama toko' },
    { key: 'site_logo', value: '/logo.png', description: 'Logo toko' },
    { key: 'site_description', value: 'Toko online terpercaya di Indonesia', description: 'Deskripsi toko' },
    { key: 'contact_phone', value: '+62 812-3456-7890', description: 'Nomor telepon kontak' },
    { key: 'contact_email', value: 'cs@tokoindonesia.com', description: 'Email kontak' },
    { key: 'working_hours', value: 'Senin-Sabtu 09:00-18:00 WIB', description: 'Jam operasional' },
    { key: 'address', value: 'Jakarta, Indonesia', description: 'Alamat toko' },
    { key: 'min_order_amount', value: '50000', description: 'Minimum pesanan ( Rupiah)' },
    { key: 'free_shipping_threshold', value: '500000', description: 'Gratis ongkir minimal belanja' },
  ];

  for (const setting of settingsData) {
    await prisma.settings.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
  console.log(`  ✓ Created ${settingsData.length} settings`);

  // ============================================
  // DONE
  // ============================================
  console.log('\n✅ Seed completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`  - ${roles.length} admin roles`);
  console.log(`  - ${permissions.length} permissions`);
  console.log('  - 2 admin accounts (admin/admin123, finance/finance123)');
  console.log('  - 2 categories (Elektronik, Aksesoris HP)');
  console.log('  - 3 products (with images + params)');
  console.log('  - 4 shipping methods');
  console.log('  - 1 bank account (BCA)');
  console.log('  - 9 site settings');
  console.log('\n🎉 Ready to use!');
}

main()
  .catch((e) => {
    console.error('\n❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
