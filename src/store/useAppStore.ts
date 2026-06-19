import { create } from 'zustand';
import {
  ComfortTemplate,
  EscalationTicket,
  Comment,
  TicketStatus,
  RepeatPhrase,
  CategoryStats,
  CommentCategory,
} from '@/types';
import { comfortTemplates as initialTemplates } from '@/data/templates';
import { tickets as initialTickets } from '@/data/tickets';
import { comments as allComments, repeatPhrases as allRepeatPhrases } from '@/data/comments';

interface AppState {
  templates: ComfortTemplate[];
  tickets: EscalationTicket[];

  updateTemplateContent: (templateId: string, newContent: string, newTitle?: string) => void;

  addTicketFromComment: (comment: Comment) => void;
  updateTicketStatus: (ticketId: string, status: TicketStatus) => void;
  updateTicketCompensation: (ticketId: string, amount: number, status?: TicketStatus) => void;

  getFilteredComments: (shopId: string, productId: string, batchId: string) => Comment[];
  getCategoryStats: (shopId: string, productId: string, batchId: string) => CategoryStats[];
  getRepeatPhrases: (shopId: string, productId: string, batchId: string) => RepeatPhrase[];
}

const generateTicketId = () => `tk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const priorityMap = {
  high: 'high' as const,
  medium: 'medium' as const,
  low: 'low' as const,
};

const useAppStore = create<AppState>((set, get) => ({
  templates: JSON.parse(JSON.stringify(initialTemplates)),
  tickets: JSON.parse(JSON.stringify(initialTickets)),

  updateTemplateContent: (templateId, newContent, newTitle) => {
    set(state => ({
      templates: state.templates.map(t =>
        t.id === templateId
          ? { ...t, content: newContent, ...(newTitle ? { title: newTitle } : {}) }
          : t
      ),
    }));
    console.log('[Store] 更新模板:', templateId);
  },

  addTicketFromComment: (comment) => {
    const newTicket: EscalationTicket = {
      id: generateTicketId(),
      commentId: comment.id,
      userNickname: comment.userNickname,
      userAvatar: comment.userAvatar,
      content: comment.content,
      hasImage: comment.hasImage,
      isMediaAccount: comment.isMediaAccount,
      riskLevel: priorityMap[comment.riskLevel],
      status: 'pending',
      shopId: comment.shopId,
      productId: comment.productId,
      batchId: comment.batchId,
      createTime: new Date().toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).replace(/\//g, '-'),
      updateTime: new Date().toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).replace(/\//g, '-'),
      assignee: '待分配',
      remark: `从评论巡检升级工单，评论ID：${comment.id}`,
    };

    set(state => ({
      tickets: [newTicket, ...state.tickets],
    }));

    console.log('[Store] 新增工单:', newTicket.id);
  },

  updateTicketStatus: (ticketId, status) => {
    const now = new Date().toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).replace(/\//g, '-');

    set(state => ({
      tickets: state.tickets.map(t =>
        t.id === ticketId ? { ...t, status, updateTime: now } : t
      ),
    }));

    console.log('[Store] 更新工单状态:', ticketId, status);
  },

  updateTicketCompensation: (ticketId, amount, status) => {
    const now = new Date().toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).replace(/\//g, '-');

    set(state => ({
      tickets: state.tickets.map(t =>
        t.id === ticketId
          ? {
              ...t,
              compensationAmount: amount,
              status: status || t.status,
              updateTime: now,
              remark: t.remark ? `${t.remark}；已补偿 ¥${amount}` : `已补偿 ¥${amount}`,
            }
          : t
      ),
    }));

    console.log('[Store] 工单补偿:', ticketId, amount);
  },

  getFilteredComments: (shopId, productId, batchId) => {
    return allComments.filter(
      c => c.shopId === shopId && c.productId === productId && c.batchId === batchId
    );
  },

  getCategoryStats: (shopId, productId, batchId) => {
    const filtered = allComments.filter(
      c => c.shopId === shopId && c.productId === productId && c.batchId === batchId
    );

    const categories: CommentCategory[] = ['safety', 'refund', 'distrust'];
    const labels: Record<CommentCategory, string> = {
      safety: '安全担忧',
      refund: '退款换货',
      distrust: '不信任官方说明',
    };

    return categories.map(cat => ({
      category: cat,
      count: filtered.filter(c => c.category === cat).length,
      label: labels[cat],
    }));
  },

  getRepeatPhrases: (shopId, productId, batchId) => {
    const filtered = allComments.filter(
      c => c.shopId === shopId && c.productId === productId && c.batchId === batchId
    );

    if (filtered.length === 0) return [];

    const contentText = filtered.map(c => c.content).join(' ');

    const result: RepeatPhrase[] = [];
    const usedCategories = new Set<CommentCategory>();

    filtered.forEach(c => usedCategories.add(c.category));

    allRepeatPhrases.forEach(phrase => {
      if (contentText.includes(phrase.text)) {
        const count = filtered.filter(c => c.content.includes(phrase.text)).length;
        if (count > 0) {
          result.push({
            text: phrase.text,
            count,
            category: phrase.category,
          });
        }
      }
    });

    if (result.length === 0) {
      const categoryCount: Record<string, number> = {};
      filtered.forEach(c => {
        categoryCount[c.category] = (categoryCount[c.category] || 0) + 1;
      });

      const hintMap: Record<CommentCategory, string> = {
        safety: '担忧产品安全问题',
        refund: '询问退款退货流程',
        distrust: '质疑官方说明',
      };

      Object.entries(categoryCount).forEach(([cat, count]) => {
        if (count >= 2) {
          result.push({
            text: hintMap[cat as CommentCategory],
            count,
            category: cat as CommentCategory,
          });
        }
      });
    }

    return result.sort((a, b) => b.count - a.count).slice(0, 4);
  },
}));

export default useAppStore;
