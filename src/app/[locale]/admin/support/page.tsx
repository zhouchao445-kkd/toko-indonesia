'use client';

import { useTranslations } from 'next-intl';
import { AdminAuthGuard } from '@/components/admin/AdminAuthGuard';
import { useAdminAuth } from '@/lib/useAdminAuth';
import { adminApi } from '@/lib/adminApi';
import { useChatPolling } from '@/lib/useChatPolling';
import { useHeartbeat } from '@/lib/useHeartbeat';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Send, AlertCircle, WifiOff, User, MessageSquare, Clock } from 'lucide-react';

interface Conversation {
  id: string;
  member_id: string;
  customer_service_id: string | null;
  status: string;
  last_message_at: string | null;
  created_at: string;
  member?: { id: string; full_name: string; email: string; avatar_url: string | null };
  last_message?: { content: string; created_at: string } | null;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_type: string;
  sender_id: string;
  content: string;
  type: string;
  created_at: string;
}

export default function AdminSupportPage() {
  const t = useTranslations('admin');
  const { hasPermission, admin } = useAdminAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Heartbeat for connection status
  const { isOnline, failureCount } = useHeartbeat({
    intervalMs: 30000,
    failureThreshold: 3,
  });

  // Chat polling for selected conversation
  const { messages, isConnected: chatConnected, refresh: refreshMessages } = useChatPolling(
    selectedConv?.id || null,
    { intervalMs: 5000, failureThreshold: 3, enabled: !!selectedConv }
  );

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const data = await adminApi.get<{ conversations: Conversation[] }>(`/conversations?${params.toString()}`);
      setConversations(data.conversations || []);
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConv(conv);
    refreshMessages();
  };

  const handleSendMessage = async () => {
    if (!selectedConv || !messageInput.trim()) return;
    setSending(true);
    try {
      await adminApi.post(`/conversations/${selectedConv.id}/messages`, {
        content: messageInput.trim(),
        type: 'text',
      });
      setMessageInput('');
      refreshMessages();
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleAssign = async (convId: string) => {
    if (!admin?.id) return;
    try {
      await adminApi.post(`/conversations/${convId}/assign`, { customer_service_id: admin.id });
      fetchConversations();
    } catch (err) {
      console.error('Failed to assign:', err);
    }
  };

  const handleClose = async (convId: string) => {
    try {
      await adminApi.post(`/conversations/${convId}/close`, {});
      fetchConversations();
    } catch (err) {
      console.error('Failed to close:', err);
    }
  };

  const handleReopen = async (convId: string) => {
    try {
      await adminApi.post(`/conversations/${convId}/reopen`, {});
      fetchConversations();
    } catch (err) {
      console.error('Failed to reopen:', err);
    }
  };

  const canEdit = hasPermission('support.can_edit');

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      active: 'bg-green-100 text-green-700',
      closed: 'bg-gray-100 text-gray-600',
    };
    return colors[status] || 'bg-gray-100 text-gray-600';
  };

  const statusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: t('support.statusPending'),
      active: t('support.statusActive'),
      closed: t('support.statusClosed'),
    };
    return labels[status] || status;
  };

  return (
    <AdminAuthGuard>
      <div className="space-y-4">
        {/* Connection Status Banner */}
        {!isOnline && (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <WifiOff className="w-4 h-4" />
            {t('support.connectionLost')}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('support.title')}</h1>
            <p className="text-gray-600 mt-1">{t('support.subtitle')}</p>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg min-h-[44px]"
          >
            <option value="">{t('common.allStatus')}</option>
            <option value="pending">{t('support.statusPending')}</option>
            <option value="active">{t('support.statusActive')}</option>
            <option value="closed">{t('support.statusClosed')}</option>
          </select>
        </div>

        {/* Dual Column Layout */}
        <div className="flex gap-4 h-[calc(100vh-220px)] min-h-[500px]">
          {/* Left: Conversation List */}
          <div className="w-80 flex-shrink-0 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
            <div className="p-3 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">{t('support.conversations')}</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-gray-500 text-sm">{t('common.loading')}</div>
              ) : conversations.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">{t('common.noData')}</div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 min-h-[44px] ${selectedConv?.id === conv.id ? 'bg-blue-50 border-l-2 border-l-blue-600' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm truncate">{conv.member?.full_name || 'Unknown'}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${statusBadge(conv.status)}`}>
                            {statusLabel(conv.status)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 truncate mt-0.5">
                          {conv.last_message?.content || t('support.noMessages')}
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right: Message Window */}
          <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
            {!selectedConv ? (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>{t('support.selectConversation')}</p>
                </div>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{selectedConv.member?.full_name}</p>
                      <p className="text-xs text-gray-500">{selectedConv.member?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!chatConnected && (
                      <span className="flex items-center gap-1 text-xs text-orange-600">
                        <AlertCircle className="w-3 h-3" />
                        {t('support.reconnecting')}
                      </span>
                    )}
                    {canEdit && selectedConv.status !== 'closed' && (
                      <>
                        {!selectedConv.customer_service_id && (
                          <button onClick={() => handleAssign(selectedConv.id)} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 min-h-[44px]">
                            {t('support.assign')}
                          </button>
                        )}
                        <button onClick={() => handleClose(selectedConv.id)} className="px-3 py-1.5 text-xs border rounded hover:bg-gray-50 min-h-[44px]">
                          {t('support.closeConversation')}
                        </button>
                      </>
                    )}
                    {canEdit && selectedConv.status === 'closed' && (
                      <button onClick={() => handleReopen(selectedConv.id)} className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 min-h-[44px]">
                        {t('support.reopen')}
                      </button>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map((msg) => {
                    const isAgent = msg.sender_type === 'admin';
                    return (
                      <div key={msg.id} className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] px-3 py-2 rounded-lg ${isAgent ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          <p className={`text-[10px] mt-1 ${isAgent ? 'text-blue-200' : 'text-gray-400'}`}>
                            <Clock className="w-3 h-3 inline mr-1" />
                            {new Date(msg.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                {selectedConv.status !== 'closed' && (
                  <div className="px-4 py-3 border-t border-gray-200">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                        placeholder={t('support.typeMessage')}
                        className="flex-1 px-3 py-2 border rounded-lg min-h-[44px]"
                        disabled={sending}
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!messageInput.trim() || sending}
                        className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </AdminAuthGuard>
  );
}
