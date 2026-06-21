// @ts-nocheck
import { Router, Request, Response } from 'express';
import { prisma } from '../index.js';
import { authenticateToken } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permission.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /dashboard
 * Get aggregated statistics for dashboard
 * Query params: range = today | week | month | year
 */
router.get('/dashboard', requirePermission('statistics', 'read'), async (req: Request, res: Response) => {
  try {
    const range = (req.query.range as string) || 'today';
    
    // Calculate date range
    const now = new Date();
    let startDate: Date;
    let previousStartDate: Date;
    
    switch (range) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        previousStartDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        previousStartDate = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        previousStartDate = new Date(now.getFullYear() - 1, 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        previousStartDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
    }

    // 1. Orders Statistics
    const [
      currentOrders,
      previousOrders,
      pendingPaymentCount,
      pendingShipmentCount,
      completedCount,
      totalUsers
    ] = await Promise.all([
      // Current period orders
      prisma.orders.findMany({
        where: { created_at: { gte: startDate } },
        select: { id: true, final_amount: true, status: true }
      }),
      // Previous period orders
      prisma.orders.findMany({
        where: { created_at: { gte: previousStartDate, lt: startDate } },
        select: { id: true, final_amount: true }
      }),
      // Pending payment count
      prisma.orders.count({
        where: { status: 'PENDING_PAYMENT' }
      }),
      // Pending shipment count (paid but not shipped)
      prisma.orders.count({
        where: { status: 'PAID' }
      }),
      // Completed count
      prisma.orders.count({
        where: { status: 'COMPLETED' }
      }),
      // Total users
      prisma.users.count()
    ]);

    const currentOrderCount = currentOrders.length;
    const currentOrderAmount = currentOrders.reduce((sum, o) => sum + Number(o.final_amount), 0);
    const previousOrderCount = previousOrders.length;
    const previousOrderAmount = previousOrders.reduce((sum, o) => sum + Number(o.final_amount), 0);

    const orderStats = {
      count: currentOrderCount,
      amount: currentOrderAmount,
      pendingPayment: pendingPaymentCount,
      pendingShipment: pendingShipmentCount,
      completed: completedCount,
      conversionRate: totalUsers > 0 ? (currentOrderCount / totalUsers * 100).toFixed(2) : '0',
      countChange: previousOrderCount > 0 
        ? ((currentOrderCount - previousOrderCount) / previousOrderCount * 100).toFixed(2)
        : '0',
      amountChange: previousOrderAmount > 0
        ? ((currentOrderAmount - previousOrderAmount) / previousOrderAmount * 100).toFixed(2)
        : '0'
    };

    // 2. Members Statistics
    const [
      currentNewUsers,
      previousNewUsers,
      activeUsers,
      vipUsers,
      totalBalance
    ] = await Promise.all([
      // New users in period
      prisma.users.count({
        where: { created_at: { gte: startDate } }
      }),
      // New users in previous period
      prisma.users.count({
        where: { created_at: { gte: previousStartDate, lt: startDate } }
      }),
      // Active users (logged in within 7 days)
      prisma.users.count({
        where: {
          last_login_at: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }
        }
      }),
      // VIP users
      prisma.users.count({
        where: { role: 'VIP' }
      }),
      // Total balance
      prisma.balances.aggregate({
        _sum: { balance: true }
      })
    ]);

    const memberStats = {
      newCount: currentNewUsers,
      activeCount: activeUsers,
      vipCount: vipUsers,
      totalBalance: Number(totalBalance._sum.balance || 0),
      newCountChange: previousNewUsers > 0
        ? ((currentNewUsers - previousNewUsers) / previousNewUsers * 100).toFixed(2)
        : '0'
    };

    // 3. Products Statistics
    const [
      activeProducts,
      totalStock,
      lowStockProducts,
      inactiveProducts
    ] = await Promise.all([
      // Active products
      prisma.products.count({
        where: { is_active: true }
      }),
      // Total stock
      prisma.products.aggregate({
        _sum: { stock: true }
      }),
      // Low stock (< 10)
      prisma.products.count({
        where: { stock: { lt: 10 }, is_active: true }
      }),
      // Inactive products
      prisma.products.count({
        where: { is_active: false }
      })
    ]);

    const productStats = {
      activeCount: activeProducts,
      totalStock: totalStock._sum.stock || 0,
      lowStockCount: lowStockProducts,
      inactiveCount: inactiveProducts
    };

    // 4. Financial Statistics
    const [
      todayIncome,
      todayRefund,
      todayWithdrawalCount,
      pendingWithdrawalCount
    ] = await Promise.all([
      // Today income (from financial_records)
      prisma.financial_records.aggregate({
        _sum: { amount: true },
        where: {
          type: 'income',
          created_at: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) }
        }
      }),
      // Today refund
      prisma.financial_records.aggregate({
        _sum: { amount: true },
        where: {
          type: 'refund',
          created_at: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) }
        }
      }),
      // Today withdrawal requests
      prisma.withdrawal_requests.count({
        where: {
          created_at: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) }
        }
      }),
      // Pending withdrawal count
      prisma.withdrawal_requests.count({
        where: { status: 'PENDING' }
      })
    ]);

    const financialStats = {
      todayIncome: Number(todayIncome._sum.amount || 0),
      todayRefund: Number(todayRefund._sum.amount || 0),
      todayWithdrawalCount,
      pendingWithdrawalCount
    };

    // 5. Marketing Statistics
    const [
      issuedCoupons,
      usedCoupons,
      activeBanners,
      activePopups
    ] = await Promise.all([
      // Issued coupons (user_coupons)
      prisma.user_coupons.count(),
      // Used coupons
      prisma.user_coupons.count({
        where: { status: 'USED' }
      }),
      // Active banners
      prisma.banners.count({
        where: { is_active: true }
      }),
      // Active popups
      prisma.popups.count({
        where: { is_active: true }
      })
    ]);

    const marketingStats = {
      issuedCoupons,
      usedCoupons,
      activeBanners,
      activePopups,
      couponUsageRate: issuedCoupons > 0 
        ? (usedCoupons / issuedCoupons * 100).toFixed(2)
        : '0'
    };

    // 6. Customer Service Statistics
    const [
      openConversations,
      pendingMessages,
      todayNewConversations,
      allMessages
    ] = await Promise.all([
      // Open conversations
      prisma.conversations.count({
        where: { status: 'open' }
      }),
      // Pending messages (unread from users)
      prisma.messages.count({
        where: { 
          is_read: false,
          sender: 'USER'
        }
      }),
      // Today new conversations
      prisma.conversations.count({
        where: {
          created_at: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) }
        }
      }),
      // All messages for response time calculation
      prisma.messages.findMany({
        where: { sender: 'ADMIN' },
        select: { created_at: true, conversation_id: true },
        orderBy: { created_at: 'desc' },
        take: 100
      })
    ]);

    // Calculate average response time (simplified)
    let avgResponseTime = 0;
    if (allMessages.length > 0) {
      // Get user messages that preceded admin messages
      const userMessages = await prisma.messages.findMany({
        where: {
          sender: 'USER',
          conversation_id: { in: allMessages.map(m => m.conversation_id) }
        },
        select: { created_at: true, conversation_id: true },
        orderBy: { created_at: 'desc' }
      });

      // Simple calculation: average time between user message and next admin message
      const responseTimes: number[] = [];
      for (const adminMsg of allMessages) {
        const userMsg = userMessages.find(
          u => u.conversation_id === adminMsg.conversation_id && 
               u.created_at < adminMsg.created_at
        );
        if (userMsg) {
          responseTimes.push(
            (adminMsg.created_at.getTime() - userMsg.created_at.getTime()) / 1000 / 60
          );
        }
      }
      avgResponseTime = responseTimes.length > 0
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : 0;
    }

    const supportStats = {
      openConversations,
      pendingMessages,
      todayNewConversations,
      avgResponseTime // in minutes
    };

    // 7. Logistics Statistics
    const [
      pendingShipment,
      shippedNotDelivered,
      delivered,
      abnormalShipments
    ] = await Promise.all([
      // Pending shipment (orders paid but not shipped)
      prisma.orders.count({
        where: { status: 'PAID' }
      }),
      // Shipped but not delivered
      prisma.shipments.count({
        where: { delivered_at: null }
      }),
      // Delivered
      prisma.shipments.count({
        where: { delivered_at: { not: null } }
      }),
      // Abnormal (shipped more than 7 days ago but not delivered)
      prisma.shipments.count({
        where: {
          delivered_at: null,
          shipped_at: { lt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }
        }
      })
    ]);

    const logisticsStats = {
      pendingShipment,
      shippedNotDelivered,
      delivered,
      abnormal: abnormalShipments
    };

    // Return all statistics
    res.json({
      success: true,
      data: {
        range,
        startDate: startDate.toISOString(),
        orders: orderStats,
        members: memberStats,
        products: productStats,
        financial: financialStats,
        marketing: marketingStats,
        support: supportStats,
        logistics: logisticsStats
      }
    });
  } catch (error) {
    console.error('Get dashboard statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard statistics'
    });
  }
});

export default router;
