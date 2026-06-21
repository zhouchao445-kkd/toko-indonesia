import { pgTable, serial, timestamp, index, unique, uuid, varchar, text, foreignKey, boolean, integer, numeric, jsonb, check } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	phone: varchar({ length: 20 }).notNull(),
	passwordHash: varchar("password_hash", { length: 255 }).notNull(),
	nickname: varchar({ length: 100 }),
	avatarUrl: text("avatar_url"),
	status: varchar({ length: 20 }).default('ACTIVE'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_users_phone").using("btree", table.phone.asc().nullsLast().op("text_ops")),
	unique("users_phone_key").on(table.phone),
]);

export const userAddresses = pgTable("user_addresses", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	name: varchar({ length: 100 }).notNull(),
	phone: varchar({ length: 20 }).notNull(),
	province: varchar({ length: 100 }).notNull(),
	city: varchar({ length: 100 }).notNull(),
	district: varchar({ length: 100 }).notNull(),
	address: text().notNull(),
	isDefault: boolean("is_default").default(false),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_user_addresses_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_addresses_user_id_fkey"
		}).onDelete("cascade"),
]);

export const roles = pgTable("roles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: varchar({ length: 50 }).notNull(),
	description: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	unique("roles_name_key").on(table.name),
]);

export const permissions = pgTable("permissions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	roleId: uuid("role_id").notNull(),
	module: varchar({ length: 50 }).notNull(),
	canView: boolean("can_view").default(false),
	canCreate: boolean("can_create").default(false),
	canEdit: boolean("can_edit").default(false),
	canDelete: boolean("can_delete").default(false),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_permissions_role_id").using("btree", table.roleId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.roleId],
			foreignColumns: [roles.id],
			name: "permissions_role_id_fkey"
		}).onDelete("cascade"),
	unique("permissions_role_id_module_key").on(table.roleId, table.module),
]);

export const admins = pgTable("admins", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	username: varchar({ length: 50 }).notNull(),
	passwordHash: varchar("password_hash", { length: 255 }).notNull(),
	name: varchar({ length: 100 }).notNull(),
	status: varchar({ length: 20 }).default('ACTIVE'),
	lastLoginAt: timestamp("last_login_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_admins_username").using("btree", table.username.asc().nullsLast().op("text_ops")),
	unique("admins_username_key").on(table.username),
]);

export const adminRoleAssignments = pgTable("admin_role_assignments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	adminId: uuid("admin_id").notNull(),
	roleId: uuid("role_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_admin_role_assignments_admin_id").using("btree", table.adminId.asc().nullsLast().op("uuid_ops")),
	index("idx_admin_role_assignments_role_id").using("btree", table.roleId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.adminId],
			foreignColumns: [admins.id],
			name: "admin_role_assignments_admin_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.roleId],
			foreignColumns: [roles.id],
			name: "admin_role_assignments_role_id_fkey"
		}).onDelete("cascade"),
	unique("admin_role_assignments_admin_id_role_id_key").on(table.adminId, table.roleId),
]);

export const categories = pgTable("categories", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	iconUrl: text("icon_url"),
	sortOrder: integer("sort_order").default(0),
	status: varchar({ length: 20 }).default('ACTIVE'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const products = pgTable("products", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	categoryId: uuid("category_id"),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	price: numeric({ precision: 15, scale:  2 }).notNull(),
	stock: integer().default(0),
	status: varchar({ length: 20 }).default('DRAFT'),
	sortOrder: integer("sort_order").default(0),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_products_category_id").using("btree", table.categoryId.asc().nullsLast().op("uuid_ops")),
	index("idx_products_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [categories.id],
			name: "products_category_id_fkey"
		}).onDelete("set null"),
]);

export const productImages = pgTable("product_images", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	productId: uuid("product_id").notNull(),
	imageUrl: text("image_url").notNull(),
	sortOrder: integer("sort_order").default(0),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_product_images_product_id").using("btree", table.productId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "product_images_product_id_fkey"
		}).onDelete("cascade"),
]);

export const productParams = pgTable("product_params", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	productId: uuid("product_id").notNull(),
	name: varchar({ length: 100 }).notNull(),
	value: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_product_params_product_id").using("btree", table.productId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "product_params_product_id_fkey"
		}).onDelete("cascade"),
]);

export const orders = pgTable("orders", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orderNo: varchar("order_no", { length: 50 }).notNull(),
	userId: uuid("user_id").notNull(),
	totalAmount: numeric("total_amount", { precision: 15, scale:  2 }).notNull(),
	status: varchar({ length: 20 }).default('PENDING'),
	paymentMethod: varchar("payment_method", { length: 50 }),
	shippingAddress: jsonb("shipping_address").notNull(),
	note: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_orders_order_no").using("btree", table.orderNo.asc().nullsLast().op("text_ops")),
	index("idx_orders_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_orders_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "orders_user_id_fkey"
		}),
	unique("orders_order_no_key").on(table.orderNo),
]);

export const orderItems = pgTable("order_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orderId: uuid("order_id").notNull(),
	productId: uuid("product_id").notNull(),
	productName: varchar("product_name", { length: 255 }).notNull(),
	productImage: text("product_image"),
	price: numeric({ precision: 15, scale:  2 }).notNull(),
	quantity: integer().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_order_items_order_id").using("btree", table.orderId.asc().nullsLast().op("uuid_ops")),
	index("idx_order_items_product_id").using("btree", table.productId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "order_items_order_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "order_items_product_id_fkey"
		}),
]);

export const paymentProofs = pgTable("payment_proofs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orderId: uuid("order_id").notNull(),
	imageUrl: text("image_url").notNull(),
	status: varchar({ length: 20 }).default('PENDING'),
	reviewedBy: uuid("reviewed_by"),
	reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_payment_proofs_order_id").using("btree", table.orderId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "payment_proofs_order_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.reviewedBy],
			foreignColumns: [admins.id],
			name: "payment_proofs_reviewed_by_fkey"
		}),
]);

export const shipments = pgTable("shipments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orderId: uuid("order_id").notNull(),
	courierName: varchar("courier_name", { length: 100 }).notNull(),
	trackingNo: varchar("tracking_no", { length: 100 }),
	status: varchar({ length: 20 }).default('PENDING'),
	shippedAt: timestamp("shipped_at", { withTimezone: true, mode: 'string' }),
	deliveredAt: timestamp("delivered_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_shipments_order_id").using("btree", table.orderId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "shipments_order_id_fkey"
		}).onDelete("cascade"),
]);

export const reviews = pgTable("reviews", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orderId: uuid("order_id").notNull(),
	productId: uuid("product_id").notNull(),
	userId: uuid("user_id").notNull(),
	rating: integer().notNull(),
	content: text(),
	images: jsonb(),
	status: varchar({ length: 20 }).default('PENDING'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_reviews_order_id").using("btree", table.orderId.asc().nullsLast().op("uuid_ops")),
	index("idx_reviews_product_id").using("btree", table.productId.asc().nullsLast().op("uuid_ops")),
	index("idx_reviews_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "reviews_order_id_fkey"
		}),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "reviews_product_id_fkey"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "reviews_user_id_fkey"
		}),
	check("reviews_rating_check", sql`(rating >= 1) AND (rating <= 5)`),
]);

export const balances = pgTable("balances", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	amount: numeric({ precision: 15, scale:  2 }).default('0'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_balances_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "balances_user_id_fkey"
		}).onDelete("cascade"),
	unique("balances_user_id_key").on(table.userId),
]);

export const balanceTransactions = pgTable("balance_transactions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	amount: numeric({ precision: 15, scale:  2 }).notNull(),
	type: varchar({ length: 50 }).notNull(),
	description: text(),
	referenceId: uuid("reference_id"),
	referenceType: varchar("reference_type", { length: 50 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_balance_transactions_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "balance_transactions_user_id_fkey"
		}),
]);

export const withdrawalRequests = pgTable("withdrawal_requests", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	amount: numeric({ precision: 15, scale:  2 }).notNull(),
	bankName: varchar("bank_name", { length: 100 }).notNull(),
	accountNo: varchar("account_no", { length: 100 }).notNull(),
	accountName: varchar("account_name", { length: 100 }).notNull(),
	status: varchar({ length: 20 }).default('PENDING'),
	reviewedBy: uuid("reviewed_by"),
	reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_withdrawal_requests_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_withdrawal_requests_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "withdrawal_requests_user_id_fkey"
		}),
	foreignKey({
			columns: [table.reviewedBy],
			foreignColumns: [admins.id],
			name: "withdrawal_requests_reviewed_by_fkey"
		}),
]);

export const financialRecords = pgTable("financial_records", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	type: varchar({ length: 50 }).notNull(),
	amount: numeric({ precision: 15, scale:  2 }).notNull(),
	description: text(),
	referenceId: uuid("reference_id"),
	referenceType: varchar("reference_type", { length: 50 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_financial_records_type").using("btree", table.type.asc().nullsLast().op("text_ops")),
]);

export const bankAccounts = pgTable("bank_accounts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	bankName: varchar("bank_name", { length: 100 }).notNull(),
	accountNo: varchar("account_no", { length: 100 }).notNull(),
	accountName: varchar("account_name", { length: 100 }).notNull(),
	status: varchar({ length: 20 }).default('ACTIVE'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const coupons = pgTable("coupons", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	code: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 100 }).notNull(),
	type: varchar({ length: 20 }).notNull(),
	value: numeric({ precision: 15, scale:  2 }).notNull(),
	minAmount: numeric("min_amount", { precision: 15, scale:  2 }).default('0'),
	maxUses: integer("max_uses"),
	usedCount: integer("used_count").default(0),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
	status: varchar({ length: 20 }).default('ACTIVE'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_coupons_code").using("btree", table.code.asc().nullsLast().op("text_ops")),
	unique("coupons_code_key").on(table.code),
]);

export const userCoupons = pgTable("user_coupons", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	couponId: uuid("coupon_id").notNull(),
	status: varchar({ length: 20 }).default('UNUSED'),
	usedAt: timestamp("used_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_user_coupons_coupon_id").using("btree", table.couponId.asc().nullsLast().op("uuid_ops")),
	index("idx_user_coupons_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_coupons_user_id_fkey"
		}),
	foreignKey({
			columns: [table.couponId],
			foreignColumns: [coupons.id],
			name: "user_coupons_coupon_id_fkey"
		}),
]);

export const banners = pgTable("banners", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	title: varchar({ length: 255 }).notNull(),
	imageUrl: text("image_url").notNull(),
	linkUrl: text("link_url"),
	sortOrder: integer("sort_order").default(0),
	status: varchar({ length: 20 }).default('ACTIVE'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_banners_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
]);

export const popups = pgTable("popups", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	title: varchar({ length: 255 }).notNull(),
	imageUrl: text("image_url").notNull(),
	linkUrl: text("link_url"),
	startAt: timestamp("start_at", { withTimezone: true, mode: 'string' }),
	endAt: timestamp("end_at", { withTimezone: true, mode: 'string' }),
	status: varchar({ length: 20 }).default('ACTIVE'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_popups_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
]);

export const adSchedules = pgTable("ad_schedules", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	title: varchar({ length: 255 }).notNull(),
	content: text(),
	startAt: timestamp("start_at", { withTimezone: true, mode: 'string' }).notNull(),
	endAt: timestamp("end_at", { withTimezone: true, mode: 'string' }).notNull(),
	status: varchar({ length: 20 }).default('ACTIVE'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_ad_schedules_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
]);

export const conversations = pgTable("conversations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	adminId: uuid("admin_id"),
	status: varchar({ length: 20 }).default('OPEN'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_conversations_admin_id").using("btree", table.adminId.asc().nullsLast().op("uuid_ops")),
	index("idx_conversations_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "conversations_user_id_fkey"
		}),
	foreignKey({
			columns: [table.adminId],
			foreignColumns: [admins.id],
			name: "conversations_admin_id_fkey"
		}),
]);

export const messages = pgTable("messages", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	conversationId: uuid("conversation_id").notNull(),
	senderType: varchar("sender_type", { length: 20 }).notNull(),
	senderId: uuid("sender_id").notNull(),
	content: text().notNull(),
	productId: uuid("product_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_messages_conversation_id").using("btree", table.conversationId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.conversationId],
			foreignColumns: [conversations.id],
			name: "messages_conversation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "messages_product_id_fkey"
		}),
]);

export const settings = pgTable("settings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	key: varchar({ length: 100 }).notNull(),
	value: text(),
	description: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_settings_key").using("btree", table.key.asc().nullsLast().op("text_ops")),
	unique("settings_key_key").on(table.key),
]);

export const shippingMethods = pgTable("shipping_methods", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	price: numeric({ precision: 15, scale:  2 }).default('0'),
	description: text(),
	status: varchar({ length: 20 }).default('ACTIVE'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const operationLogs = pgTable("operation_logs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	adminId: uuid("admin_id"),
	action: varchar({ length: 50 }).notNull(),
	targetType: varchar("target_type", { length: 50 }).notNull(),
	targetId: uuid("target_id"),
	beforeData: jsonb("before_data"),
	afterData: jsonb("after_data"),
	ipAddress: varchar("ip_address", { length: 50 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_operation_logs_action").using("btree", table.action.asc().nullsLast().op("text_ops")),
	index("idx_operation_logs_admin_id").using("btree", table.adminId.asc().nullsLast().op("uuid_ops")),
	index("idx_operation_logs_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_operation_logs_target_type").using("btree", table.targetType.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.adminId],
			foreignColumns: [admins.id],
			name: "operation_logs_admin_id_fkey"
		}),
]);
