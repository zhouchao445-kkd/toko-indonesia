-- ============================================================
-- Toko Indonesia - Complete Database Setup
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================

-- 1. Create all tables
CREATE TABLE IF NOT EXISTS "roles" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "display_name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "roles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "roles_name_key" UNIQUE ("name")
);

CREATE TABLE IF NOT EXISTS "permissions" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "module" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "permissions_code_key" UNIQUE ("code")
);

CREATE TABLE IF NOT EXISTS "role_permissions" (
    "id" SERIAL NOT NULL,
    "role_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "role_permissions_role_id_permission_id_key" UNIQUE ("role_id", "permission_id"),
    CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE,
    CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "admins" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(20),
    "avatar" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admins_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "admins_username_key" UNIQUE ("username"),
    CONSTRAINT "admins_email_key" UNIQUE ("email")
);

CREATE TABLE IF NOT EXISTS "admin_role_assignments" (
    "id" SERIAL NOT NULL,
    "admin_id" INTEGER NOT NULL,
    "role_id" INTEGER NOT NULL,
    "assigned_by" INTEGER,
    "assigned_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admin_role_assignments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "admin_role_assignments_admin_id_role_id_key" UNIQUE ("admin_id", "role_id"),
    CONSTRAINT "admin_role_assignments_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE CASCADE,
    CONSTRAINT "admin_role_assignments_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "operation_logs" (
    "id" SERIAL NOT NULL,
    "operator_id" INTEGER NOT NULL,
    "operator_name" VARCHAR(100) NOT NULL,
    "module" VARCHAR(50) NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "target_type" VARCHAR(50) NOT NULL,
    "target_id" VARCHAR(50) NOT NULL,
    "description" TEXT NOT NULL,
    "details" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "operation_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "operation_logs_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "admins"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "members" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(20),
    "avatar" VARCHAR(500),
    "balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "frozen_balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "members_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "members_username_key" UNIQUE ("username"),
    CONSTRAINT "members_email_key" UNIQUE ("email")
);

CREATE TABLE IF NOT EXISTS "member_addresses" (
    "id" SERIAL NOT NULL,
    "member_id" INTEGER NOT NULL,
    "receiver_name" VARCHAR(100) NOT NULL,
    "receiver_phone" VARCHAR(20) NOT NULL,
    "province" VARCHAR(100) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "district" VARCHAR(100),
    "subdistrict" VARCHAR(100),
    "detail_address" TEXT NOT NULL,
    "postal_code" VARCHAR(10),
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "member_addresses_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "member_addresses_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "categories" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "icon_emoji" VARCHAR(10),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "products" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "price" DECIMAL(15,2) NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "category_id" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "products_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "product_images" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "image_url" VARCHAR(500) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "product_params" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "param_name" VARCHAR(100) NOT NULL,
    "param_value" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "product_params_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "product_params_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "shipping_methods" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "base_fee" DECIMAL(10,2) NOT NULL,
    "estimated_days" VARCHAR(50),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "shipping_methods_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "orders" (
    "id" SERIAL NOT NULL,
    "order_no" VARCHAR(50) NOT NULL,
    "member_id" INTEGER NOT NULL,
    "total_amount" DECIMAL(15,2) NOT NULL,
    "shipping_fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "final_amount" DECIMAL(15,2) NOT NULL,
    "coupon_id" INTEGER,
    "shipping_method_id" INTEGER,
    "shipping_address" TEXT NOT NULL,
    "receiver_name" VARCHAR(100) NOT NULL,
    "receiver_phone" VARCHAR(20) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'pending_payment',
    "payment_proof" VARCHAR(500),
    "paid_at" TIMESTAMP(6),
    "shipped_at" TIMESTAMP(6),
    "completed_at" TIMESTAMP(6),
    "cancelled_at" TIMESTAMP(6),
    "reject_reason" TEXT,
    "tracking_number" VARCHAR(100),
    "remark" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "orders_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "orders_order_no_key" UNIQUE ("order_no"),
    CONSTRAINT "orders_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT,
    CONSTRAINT "orders_shipping_method_id_fkey" FOREIGN KEY ("shipping_method_id") REFERENCES "shipping_methods"("id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "order_items" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "product_name" VARCHAR(200) NOT NULL,
    "product_image" VARCHAR(500),
    "unit_price" DECIMAL(15,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "subtotal" DECIMAL(15,2) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE,
    CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "reviews" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "member_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "content" TEXT,
    "images" TEXT[],
    "is_anonymous" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "reviews_order_id_product_id_key" UNIQUE ("order_id", "product_id"),
    CONSTRAINT "reviews_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE,
    CONSTRAINT "reviews_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE,
    CONSTRAINT "reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE,
    CONSTRAINT "reviews_rating_check" CHECK ("rating" >= 1 AND "rating" <= 5)
);

CREATE TABLE IF NOT EXISTS "balance_logs" (
    "id" SERIAL NOT NULL,
    "member_id" INTEGER NOT NULL,
    "type" VARCHAR(30) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "balance_before" DECIMAL(15,2) NOT NULL,
    "balance_after" DECIMAL(15,2) NOT NULL,
    "description" TEXT,
    "related_order_id" INTEGER,
    "operator_id" INTEGER,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "balance_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "balance_logs_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE,
    CONSTRAINT "balance_logs_related_order_id_fkey" FOREIGN KEY ("related_order_id") REFERENCES "orders"("id") ON DELETE SET NULL,
    CONSTRAINT "balance_logs_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "admins"("id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "balance_change_requests" (
    "id" SERIAL NOT NULL,
    "member_id" INTEGER NOT NULL,
    "change_type" VARCHAR(10) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "reviewed_by" INTEGER,
    "reviewed_at" TIMESTAMP(6),
    "review_note" TEXT,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "balance_change_requests_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "balance_change_requests_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE,
    CONSTRAINT "balance_change_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "admins"("id") ON DELETE SET NULL,
    CONSTRAINT "balance_change_requests_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admins"("id") ON DELETE CASCADE,
    CONSTRAINT "balance_change_requests_change_type_check" CHECK ("change_type" IN ('increase', 'decrease')),
    CONSTRAINT "balance_change_requests_status_check" CHECK ("status" IN ('pending', 'approved', 'rejected'))
);

CREATE TABLE IF NOT EXISTS "withdrawals" (
    "id" SERIAL NOT NULL,
    "member_id" INTEGER NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "bank_name" VARCHAR(50) NOT NULL,
    "account_number" VARCHAR(50) NOT NULL,
    "account_name" VARCHAR(100) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
    "reject_reason" TEXT,
    "reviewed_by" INTEGER,
    "reviewed_at" TIMESTAMP(6),
    "paid_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "withdrawals_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "withdrawals_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE,
    CONSTRAINT "withdrawals_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "admins"("id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "coupons" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "value" DECIMAL(15,2) NOT NULL,
    "min_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "max_discount" DECIMAL(15,2),
    "total_count" INTEGER NOT NULL,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "start_date" TIMESTAMP(6) NOT NULL,
    "end_date" TIMESTAMP(6) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "coupons_code_key" UNIQUE ("code"),
    CONSTRAINT "coupons_type_check" CHECK ("type" IN ('fixed', 'percent'))
);

CREATE TABLE IF NOT EXISTS "coupon_records" (
    "id" SERIAL NOT NULL,
    "coupon_id" INTEGER NOT NULL,
    "member_id" INTEGER NOT NULL,
    "order_id" INTEGER,
    "status" VARCHAR(20) NOT NULL DEFAULT 'unused',
    "used_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "coupon_records_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "coupon_records_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE CASCADE,
    CONSTRAINT "coupon_records_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE,
    CONSTRAINT "coupon_records_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL,
    CONSTRAINT "coupon_records_status_check" CHECK ("status" IN ('unused', 'used', 'expired'))
);

CREATE TABLE IF NOT EXISTS "banners" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "image_url" VARCHAR(500) NOT NULL,
    "link_url" VARCHAR(500),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "popups" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "content" TEXT,
    "image_url" VARCHAR(500),
    "link_url" VARCHAR(500),
    "start_time" TIMESTAMP(6) NOT NULL,
    "end_time" TIMESTAMP(6) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "popups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ad_schedules" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "image_url" VARCHAR(500) NOT NULL,
    "link_url" VARCHAR(500),
    "position" VARCHAR(50) NOT NULL,
    "start_time" TIMESTAMP(6) NOT NULL,
    "end_time" TIMESTAMP(6) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ad_schedules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "conversations" (
    "id" SERIAL NOT NULL,
    "member_id" INTEGER NOT NULL,
    "admin_id" INTEGER,
    "status" VARCHAR(20) NOT NULL DEFAULT 'open',
    "last_message_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "conversations_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE,
    CONSTRAINT "conversations_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "messages" (
    "id" SERIAL NOT NULL,
    "conversation_id" INTEGER NOT NULL,
    "sender_type" VARCHAR(20) NOT NULL,
    "sender_id" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "messages_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "bank_accounts" (
    "id" SERIAL NOT NULL,
    "bank_name" VARCHAR(50) NOT NULL,
    "account_number" VARCHAR(50) NOT NULL,
    "account_name" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "settings" (
    "id" SERIAL NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "settings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "settings_key_key" UNIQUE ("key")
);

CREATE TABLE IF NOT EXISTS "cart_items" (
    "id" SERIAL NOT NULL,
    "member_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "cart_items_member_id_product_id_key" UNIQUE ("member_id", "product_id"),
    CONSTRAINT "cart_items_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE,
    CONSTRAINT "cart_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_operation_logs_module" ON "operation_logs"("module");
CREATE INDEX IF NOT EXISTS "idx_operation_logs_created_at" ON "operation_logs"("created_at");
CREATE INDEX IF NOT EXISTS "idx_operation_logs_operator_id" ON "operation_logs"("operator_id");
CREATE INDEX IF NOT EXISTS "idx_orders_member_id" ON "orders"("member_id");
CREATE INDEX IF NOT EXISTS "idx_orders_status" ON "orders"("status");
CREATE INDEX IF NOT EXISTS "idx_orders_created_at" ON "orders"("created_at");
CREATE INDEX IF NOT EXISTS "idx_order_items_order_id" ON "order_items"("order_id");
CREATE INDEX IF NOT EXISTS "idx_order_items_product_id" ON "order_items"("product_id");
CREATE INDEX IF NOT EXISTS "idx_reviews_product_id" ON "reviews"("product_id");
CREATE INDEX IF NOT EXISTS "idx_reviews_member_id" ON "reviews"("member_id");
CREATE INDEX IF NOT EXISTS "idx_balance_logs_member_id" ON "balance_logs"("member_id");
CREATE INDEX IF NOT EXISTS "idx_balance_logs_type" ON "balance_logs"("type");
CREATE INDEX IF NOT EXISTS "idx_balance_logs_created_at" ON "balance_logs"("created_at");
CREATE INDEX IF NOT EXISTS "idx_balance_change_requests_member_id" ON "balance_change_requests"("member_id");
CREATE INDEX IF NOT EXISTS "idx_balance_change_requests_status" ON "balance_change_requests"("status");
CREATE INDEX IF NOT EXISTS "idx_withdrawals_member_id" ON "withdrawals"("member_id");
CREATE INDEX IF NOT EXISTS "idx_withdrawals_status" ON "withdrawals"("status");
CREATE INDEX IF NOT EXISTS "idx_products_category_id" ON "products"("category_id");
CREATE INDEX IF NOT EXISTS "idx_products_is_active" ON "products"("is_active");
CREATE INDEX IF NOT EXISTS "idx_product_images_product_id" ON "product_images"("product_id");
CREATE INDEX IF NOT EXISTS "idx_product_params_product_id" ON "product_params"("product_id");
CREATE INDEX IF NOT EXISTS "idx_conversations_member_id" ON "conversations"("member_id");
CREATE INDEX IF NOT EXISTS "idx_conversations_status" ON "conversations"("status");
CREATE INDEX IF NOT EXISTS "idx_messages_conversation_id" ON "messages"("conversation_id");
CREATE INDEX IF NOT EXISTS "idx_coupon_records_member_id" ON "coupon_records"("member_id");
CREATE INDEX IF NOT EXISTS "idx_coupon_records_coupon_id" ON "coupon_records"("coupon_id");
CREATE INDEX IF NOT EXISTS "idx_member_addresses_member_id" ON "member_addresses"("member_id");
CREATE INDEX IF NOT EXISTS "idx_admin_role_assignments_admin_id" ON "admin_role_assignments"("admin_id");
CREATE INDEX IF NOT EXISTS "idx_role_permissions_role_id" ON "role_permissions"("role_id");

-- ============================================================
-- SEED DATA
-- ============================================================

-- Roles
INSERT INTO roles (name, display_name, description, is_system) VALUES
('super_admin', '超级管理员', '拥有所有权限，可以管理所有模块', true),
('finance_super_admin', '财务超级管理员', '拥有财务模块全部权限，可直接修改余额', true),
('product_manager', '商品管理员', '管理商品、分类、属性', true),
('order_manager', '订单管理员', '管理订单、发货、退款', true),
('customer_service', '客服专员', '处理客户咨询、投诉', true),
('finance_manager', '财务管理员', '管理财务、提现、对账', true),
('marketing_manager', '营销管理员', '管理优惠券、广告、活动', true)
ON CONFLICT (name) DO NOTHING;

-- Permissions
INSERT INTO permissions (code, name, module, description) VALUES
('products.view', '查看商品', 'products', '查看商品列表和详情'),
('products.create', '创建商品', 'products', '创建新商品'),
('products.edit', '编辑商品', 'products', '编辑商品信息'),
('products.delete', '删除商品', 'products', '删除商品'),
('categories.view', '查看分类', 'categories', '查看分类列表'),
('categories.create', '创建分类', 'categories', '创建新分类'),
('categories.edit', '编辑分类', 'categories', '编辑分类信息'),
('categories.delete', '删除分类', 'categories', '删除分类'),
('orders.view', '查看订单', 'orders', '查看订单列表和详情'),
('orders.create', '创建订单', 'orders', '手动创建订单'),
('orders.edit', '编辑订单', 'orders', '编辑订单信息'),
('orders.delete', '删除订单', 'orders', '删除订单'),
('orders.ship', '发货', 'orders', '处理订单发货'),
('orders.refund', '退款', 'orders', '处理订单退款'),
('users.view', '查看用户', 'users', '查看用户列表和详情'),
('users.create', '创建用户', 'users', '手动创建用户'),
('users.edit', '编辑用户', 'users', '编辑用户信息'),
('users.delete', '删除用户', 'users', '删除用户'),
('finance.view', '查看财务', 'finance', '查看财务数据'),
('finance.withdrawal', '处理提现', 'finance', '审核和处理提现申请'),
('finance.balance', '管理余额', 'finance', '管理用户余额'),
('marketing.view', '查看营销', 'marketing', '查看营销活动'),
('marketing.create', '创建活动', 'marketing', '创建优惠券和活动'),
('marketing.edit', '编辑活动', 'marketing', '编辑营销活动'),
('marketing.delete', '删除活动', 'marketing', '删除营销活动'),
('support.view', '查看客服', 'support', '查看客服对话'),
('support.reply', '回复客户', 'support', '回复客户咨询'),
('settings.view', '查看设置', 'settings', '查看系统设置'),
('settings.edit', '编辑设置', 'settings', '修改系统设置'),
('statistics.view', '查看统计', 'statistics', '查看数据统计')
ON CONFLICT (code) DO NOTHING;

-- Assign all permissions to super_admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'super_admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign finance permissions to finance_super_admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'finance_super_admin' AND (p.module = 'finance' OR p.code IN ('users.view', 'statistics.view'))
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign product permissions to product_manager
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'product_manager' AND p.module IN ('products', 'categories')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign order permissions to order_manager
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'order_manager' AND (p.module = 'orders' OR p.code = 'users.view')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign support permissions to customer_service
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'customer_service' AND (p.module = 'support' OR p.code IN ('users.view', 'orders.view'))
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign limited finance permissions to finance_manager
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'finance_manager' AND p.code IN ('finance.view', 'finance.withdrawal', 'users.view')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign marketing permissions to marketing_manager
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'marketing_manager' AND p.module = 'marketing'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Admin accounts (passwords: admin/admin123, finance/finance123)
INSERT INTO admins (username, password_hash, full_name, email, is_active) VALUES
('admin', '$2b$10$KjhTqk61rvlsJQ9c1q.zxuQ4t4ji3YN2shSxIbqjZ4.zvwTXQLPzm', '超级管理员', 'admin@toko.com', true),
('finance', '$2b$10$57113e29eO92TS.R6mk5.uCkkUTmDRGPnlsBvrXuZu0s3OOoCVf4W', '财务超级管理员', 'finance@toko.com', true)
ON CONFLICT (username) DO NOTHING;

-- Assign roles to admins
INSERT INTO admin_role_assignments (admin_id, role_id)
SELECT a.id, r.id FROM admins a, roles r
WHERE (a.username = 'admin' AND r.name = 'super_admin')
   OR (a.username = 'finance' AND r.name = 'finance_super_admin')
ON CONFLICT (admin_id, role_id) DO NOTHING;

-- Categories
INSERT INTO categories (name, icon_emoji, sort_order, is_active) VALUES
('Elektronik', '📱', 1, true),
('Aksesoris HP', '🎧', 2, true)
ON CONFLICT DO NOTHING;

-- Products (using raw insert to get IDs)
DO $$
DECLARE
  cat_elektronik INTEGER;
  cat_aksesoris INTEGER;
  prod_phone INTEGER;
  prod_tablet INTEGER;
  prod_earbuds INTEGER;
BEGIN
  SELECT id INTO cat_elektronik FROM categories WHERE name = 'Elektronik';
  SELECT id INTO cat_aksesoris FROM categories WHERE name = 'Aksesoris HP';

  -- Product 1: Samsung Galaxy A55 5G
  IF NOT EXISTS (SELECT 1 FROM products WHERE name = 'Samsung Galaxy A55 5G') THEN
    INSERT INTO products (name, description, price, stock, category_id, is_active, sort_order)
    VALUES ('Samsung Galaxy A55 5G', 'Samsung Galaxy A55 5G 12GB/256GB - Garansi Resmi Indonesia', 5499000, 50, cat_elektronik, true, 1)
    RETURNING id INTO prod_phone;
    
    INSERT INTO product_images (product_id, image_url, sort_order) VALUES (prod_phone, '/test-images/phone.jpg', 1);
    INSERT INTO product_params (product_id, param_name, param_value, sort_order) VALUES
      (prod_phone, 'Brand', 'Samsung', 1),
      (prod_phone, 'RAM', '12GB', 2),
      (prod_phone, 'Storage', '256GB', 3),
      (prod_phone, 'Network', '5G', 4);
  END IF;

  -- Product 2: iPad Air M2
  IF NOT EXISTS (SELECT 1 FROM products WHERE name = 'iPad Air M2 2024') THEN
    INSERT INTO products (name, description, price, stock, category_id, is_active, sort_order)
    VALUES ('iPad Air M2 2024', 'Apple iPad Air M2 11 inch WiFi 128GB - Garansi Resmi iBox', 9299000, 30, cat_elektronik, true, 2)
    RETURNING id INTO prod_tablet;
    
    INSERT INTO product_images (product_id, image_url, sort_order) VALUES (prod_tablet, '/test-images/tablet.jpg', 1);
    INSERT INTO product_params (product_id, param_name, param_value, sort_order) VALUES
      (prod_tablet, 'Brand', 'Apple', 1),
      (prod_tablet, 'Chip', 'M2', 2),
      (prod_tablet, 'Storage', '128GB', 3),
      (prod_tablet, 'Display', '11 inch', 4);
  END IF;

  -- Product 3: Samsung Galaxy Buds FE
  IF NOT EXISTS (SELECT 1 FROM products WHERE name = 'Samsung Galaxy Buds FE') THEN
    INSERT INTO products (name, description, price, stock, category_id, is_active, sort_order)
    VALUES ('Samsung Galaxy Buds FE', 'Samsung Galaxy Buds FE - True Wireless Earbuds ANC - Garansi Resmi', 1599000, 100, cat_aksesoris, true, 1)
    RETURNING id INTO prod_earbuds;
    
    INSERT INTO product_images (product_id, image_url, sort_order) VALUES (prod_earbuds, '/test-images/earbuds.jpg', 1);
    INSERT INTO product_params (product_id, param_name, param_value, sort_order) VALUES
      (prod_earbuds, 'Brand', 'Samsung', 1),
      (prod_earbuds, 'Type', 'TWS', 2),
      (prod_earbuds, 'ANC', 'Yes', 3),
      (prod_earbuds, 'Battery', '6h + 20h case', 4);
  END IF;
END $$;

-- Shipping methods
INSERT INTO shipping_methods (name, description, base_fee, estimated_days, is_active, sort_order) VALUES
('JNE Reguler', 'Layanan reguler JNE (2-3 hari)', 15000, '2-3 hari', true, 1),
('JNE YES', 'Layanan ekspres JNE (1 hari)', 30000, '1 hari', true, 2),
('SiCepat HALU', 'SiCepat same day delivery', 25000, '1 hari', true, 3),
('AnterAja Reguler', 'AnterAja reguler (2-4 hari)', 12000, '2-4 hari', true, 4)
ON CONFLICT DO NOTHING;

-- Bank account
INSERT INTO bank_accounts (bank_name, account_number, account_name, is_active, sort_order) VALUES
('BCA', '7260388724', 'ZHOU CHAO', true, 1)
ON CONFLICT DO NOTHING;

-- Site settings
INSERT INTO settings (key, value, description) VALUES
('site_name', 'Toko Indonesia', 'Nama toko'),
('site_logo', '/logo.png', 'Logo toko'),
('site_description', 'Toko online terpercaya di Indonesia', 'Deskripsi toko'),
('contact_phone', '+62 812-3456-7890', 'Nomor telepon kontak'),
('contact_email', 'cs@tokoindonesia.com', 'Email kontak'),
('working_hours', 'Senin-Sabtu 09:00-18:00 WIB', 'Jam operasional'),
('address', 'Jakarta, Indonesia', 'Alamat toko'),
('min_order_amount', '50000', 'Minimum pesanan (Rupiah)'),
('free_shipping_threshold', '500000', 'Gratis ongkir minimal belanja')
ON CONFLICT (key) DO NOTHING;

-- Done!
SELECT '✅ Database setup complete!' AS status,
  (SELECT COUNT(*) FROM roles) AS roles_count,
  (SELECT COUNT(*) FROM permissions) AS permissions_count,
  (SELECT COUNT(*) FROM admins) AS admins_count,
  (SELECT COUNT(*) FROM categories) AS categories_count,
  (SELECT COUNT(*) FROM products) AS products_count,
  (SELECT COUNT(*) FROM shipping_methods) AS shipping_count,
  (SELECT COUNT(*) FROM bank_accounts) AS bank_count,
  (SELECT COUNT(*) FROM settings) AS settings_count;
