import { relations } from "drizzle-orm/relations";
import { users, userAddresses, roles, permissions, admins, adminRoleAssignments, categories, products, productImages, productParams, orders, orderItems, paymentProofs, shipments, reviews, balances, balanceTransactions, withdrawalRequests, userCoupons, coupons, conversations, messages, operationLogs } from "./schema";

export const userAddressesRelations = relations(userAddresses, ({one}) => ({
	user: one(users, {
		fields: [userAddresses.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	userAddresses: many(userAddresses),
	orders: many(orders),
	reviews: many(reviews),
	balances: many(balances),
	balanceTransactions: many(balanceTransactions),
	withdrawalRequests: many(withdrawalRequests),
	userCoupons: many(userCoupons),
	conversations: many(conversations),
}));

export const permissionsRelations = relations(permissions, ({one}) => ({
	role: one(roles, {
		fields: [permissions.roleId],
		references: [roles.id]
	}),
}));

export const rolesRelations = relations(roles, ({many}) => ({
	permissions: many(permissions),
	adminRoleAssignments: many(adminRoleAssignments),
}));

export const adminRoleAssignmentsRelations = relations(adminRoleAssignments, ({one}) => ({
	admin: one(admins, {
		fields: [adminRoleAssignments.adminId],
		references: [admins.id]
	}),
	role: one(roles, {
		fields: [adminRoleAssignments.roleId],
		references: [roles.id]
	}),
}));

export const adminsRelations = relations(admins, ({many}) => ({
	adminRoleAssignments: many(adminRoleAssignments),
	paymentProofs: many(paymentProofs),
	withdrawalRequests: many(withdrawalRequests),
	conversations: many(conversations),
	operationLogs: many(operationLogs),
}));

export const productsRelations = relations(products, ({one, many}) => ({
	category: one(categories, {
		fields: [products.categoryId],
		references: [categories.id]
	}),
	productImages: many(productImages),
	productParams: many(productParams),
	orderItems: many(orderItems),
	reviews: many(reviews),
	messages: many(messages),
}));

export const categoriesRelations = relations(categories, ({many}) => ({
	products: many(products),
}));

export const productImagesRelations = relations(productImages, ({one}) => ({
	product: one(products, {
		fields: [productImages.productId],
		references: [products.id]
	}),
}));

export const productParamsRelations = relations(productParams, ({one}) => ({
	product: one(products, {
		fields: [productParams.productId],
		references: [products.id]
	}),
}));

export const ordersRelations = relations(orders, ({one, many}) => ({
	user: one(users, {
		fields: [orders.userId],
		references: [users.id]
	}),
	orderItems: many(orderItems),
	paymentProofs: many(paymentProofs),
	shipments: many(shipments),
	reviews: many(reviews),
}));

export const orderItemsRelations = relations(orderItems, ({one}) => ({
	order: one(orders, {
		fields: [orderItems.orderId],
		references: [orders.id]
	}),
	product: one(products, {
		fields: [orderItems.productId],
		references: [products.id]
	}),
}));

export const paymentProofsRelations = relations(paymentProofs, ({one}) => ({
	order: one(orders, {
		fields: [paymentProofs.orderId],
		references: [orders.id]
	}),
	admin: one(admins, {
		fields: [paymentProofs.reviewedBy],
		references: [admins.id]
	}),
}));

export const shipmentsRelations = relations(shipments, ({one}) => ({
	order: one(orders, {
		fields: [shipments.orderId],
		references: [orders.id]
	}),
}));

export const reviewsRelations = relations(reviews, ({one}) => ({
	order: one(orders, {
		fields: [reviews.orderId],
		references: [orders.id]
	}),
	product: one(products, {
		fields: [reviews.productId],
		references: [products.id]
	}),
	user: one(users, {
		fields: [reviews.userId],
		references: [users.id]
	}),
}));

export const balancesRelations = relations(balances, ({one}) => ({
	user: one(users, {
		fields: [balances.userId],
		references: [users.id]
	}),
}));

export const balanceTransactionsRelations = relations(balanceTransactions, ({one}) => ({
	user: one(users, {
		fields: [balanceTransactions.userId],
		references: [users.id]
	}),
}));

export const withdrawalRequestsRelations = relations(withdrawalRequests, ({one}) => ({
	user: one(users, {
		fields: [withdrawalRequests.userId],
		references: [users.id]
	}),
	admin: one(admins, {
		fields: [withdrawalRequests.reviewedBy],
		references: [admins.id]
	}),
}));

export const userCouponsRelations = relations(userCoupons, ({one}) => ({
	user: one(users, {
		fields: [userCoupons.userId],
		references: [users.id]
	}),
	coupon: one(coupons, {
		fields: [userCoupons.couponId],
		references: [coupons.id]
	}),
}));

export const couponsRelations = relations(coupons, ({many}) => ({
	userCoupons: many(userCoupons),
}));

export const conversationsRelations = relations(conversations, ({one, many}) => ({
	user: one(users, {
		fields: [conversations.userId],
		references: [users.id]
	}),
	admin: one(admins, {
		fields: [conversations.adminId],
		references: [admins.id]
	}),
	messages: many(messages),
}));

export const messagesRelations = relations(messages, ({one}) => ({
	conversation: one(conversations, {
		fields: [messages.conversationId],
		references: [conversations.id]
	}),
	product: one(products, {
		fields: [messages.productId],
		references: [products.id]
	}),
}));

export const operationLogsRelations = relations(operationLogs, ({one}) => ({
	admin: one(admins, {
		fields: [operationLogs.adminId],
		references: [admins.id]
	}),
}));