import { create } from 'zustand';
import {
  ComfortTemplate,
  EscalationTicket,
  Comment,
  TicketStatus,
  RepeatPhrase,
  CategoryStats,
  CommentCategory,
  TicketActionLog,
  TemplateVersion,
  BatchEscalationResult,
} from '@/types';
import { comfortTemplates as initialTemplates } from '@/data/templates';
import { tickets as initialTickets } from '@/data/tickets';
import { comments as allComments, repeatPhrases as allRepeatPhrases } from '@/data/comments';

interface AppState {
  templates: ComfortTemplate[];
  tickets: EscalationTicket[];
  templateVersions: Record<string, TemplateVersion[]>;

  updateTemplateContent: (templateId: string, newContent: string, newTitle?: string) => void;
  revertTemplateToVersion: (templateId: string, versionId: string) => void;
  getTemplateVersions: (templateId: string) => TemplateVersion[];

  addTicketFromComment: (comment: Comment) => EscalationTicket | null;
  batchAddTicketsFromComments: (comments: Comment[]) => BatchEscalationResult;
  updateTicketStatus: (ticketId: string, status: TicketStatus) => void;
  updateTicketCompensation: (ticketId: string, amount: number, status?: TicketStatus) => void;
  updateTicketRemark: (ticketId: string, remark: string) => void;
  updateTicketAssignee: (ticketId: string, assignee: string) => void;
  addTicketActionLog: (ticketId: string, log: Omit<TicketActionLog, 'id' | 'ticketId' | 'timestamp'>) => void;

  getFilteredComments: (shopId: string, productId: string, batchId: string) => Comment[];
  getCategoryStats: (shopId: string, productId: string, batchId: string) => CategoryStats[];
  getRepeatPhrases: (shopId: string, productId: string, batchId: string) => RepeatPhrase[];
}

const generateTicketId = () => `tk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const generateLogId = () => `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const generateVersionId = () => `v_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const priorityMap = {
  high: 'high' as const,
  medium: 'medium' as const,
  low: 'low' as const,
};

const statusTextMap: Record<TicketStatus, string> = {
  pending: '待核实',
  replied: '已回复',
  compensated: '已补偿',
  closed: '已关闭',
};

const getCurrentTime = () =>
  new Date().toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).replace(/\//g, '-');

const createActionLog = (
  ticketId: string,
  action: TicketActionLog['action'],
  detail: string,
  oldValue?: string,
  newValue?: string
): TicketActionLog => ({
  id: generateLogId(),
  ticketId,
  action,
  operator: '当前用户',
  timestamp: getCurrentTime(),
  detail,
  oldValue,
  newValue,
});

const enhanceInitialTickets = (tickets: EscalationTicket[]): EscalationTicket[] => {
  return tickets.map(ticket => {
    const logs: TicketActionLog[] = [
      createActionLog(
        ticket.id,
        'create',
        `创建工单，来源：${ticket.remark || '评论巡检'}`
      ),
    ];

    if (ticket.status !== 'pending') {
      logs.push(
        createActionLog(
          ticket.id,
          'status_change',
          `状态变更：待核实 → ${statusTextMap[ticket.status]}`,
          '待核实',
          statusTextMap[ticket.status]
        )
      );
    }

    if (ticket.compensationAmount) {
      logs.push(
        createActionLog(
          ticket.id,
          'compensation',
          `发放补偿 ¥${ticket.compensationAmount}`,
          undefined,
          `¥${ticket.compensationAmount}`
        )
      );
    }

    return {
      ...ticket,
      actionLogs: logs,
    };
  });
};

const initTemplateVersions = (): Record<string, TemplateVersion[]> => {
  const versions: Record<string, TemplateVersion[]> = {};
  initialTemplates.forEach(tpl => {
    versions[tpl.id] = [
      {
        id: generateVersionId(),
        templateId: tpl.id,
        title: tpl.title,
        content: tpl.content,
        variables: [...tpl.variables],
        createTime: getCurrentTime(),
        operator: '系统',
        changeType: 'create',
      },
    ];
  });
  return versions;
};

const useAppStore = create<AppState>((set, get) => ({
  templates: JSON.parse(JSON.stringify(initialTemplates)),
  tickets: enhanceInitialTickets(JSON.parse(JSON.stringify(initialTickets))),
  templateVersions: initTemplateVersions(),

  updateTemplateContent: (templateId, newContent, newTitle) => {
    const template = get().templates.find(t => t.id === templateId);
    if (!template) return;

    const newTemplate = {
      ...template,
      content: newContent,
      ...(newTitle ? { title: newTitle } : {}),
    };

    const version: TemplateVersion = {
      id: generateVersionId(),
      templateId,
      title: newTitle || template.title,
      content: newContent,
      variables: [...template.variables],
      createTime: getCurrentTime(),
      operator: '当前用户',
      changeType: 'edit',
    };

    set(state => ({
      templates: state.templates.map(t => (t.id === templateId ? newTemplate : t)),
      templateVersions: {
        ...state.templateVersions,
        [templateId]: [version, ...(state.templateVersions[templateId] || [])].slice(0, 20),
      },
    }));

    console.log('[Store] 更新模板:', templateId);
  },

  revertTemplateToVersion: (templateId, versionId) => {
    const versions = get().templateVersions[templateId];
    if (!versions) return;

    const targetVersion = versions.find(v => v.id === versionId);
    if (!targetVersion) return;

    const currentTemplate = get().templates.find(t => t.id === templateId);
    if (!currentTemplate) return;

    const revertVersion: TemplateVersion = {
      id: generateVersionId(),
      templateId,
      title: targetVersion.title,
      content: targetVersion.content,
      variables: [...targetVersion.variables],
      createTime: getCurrentTime(),
      operator: '当前用户',
      changeType: 'revert',
    };

    set(state => ({
      templates: state.templates.map(t =>
        t.id === templateId
          ? {
              ...t,
              title: targetVersion.title,
              content: targetVersion.content,
            }
          : t
      ),
      templateVersions: {
        ...state.templateVersions,
        [templateId]: [revertVersion, ...versions].slice(0, 20),
      },
    }));

    console.log('[Store] 恢复模板版本:', templateId, versionId);
  },

  getTemplateVersions: (templateId) => {
    return get().templateVersions[templateId] || [];
  },

  addTicketFromComment: (comment) => {
    const existingTicket = get().tickets.find(t => t.commentId === comment.id);
    if (existingTicket) {
      console.log('[Store] 工单已存在，跳过:', comment.id);
      return null;
    }

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
      createTime: getCurrentTime(),
      updateTime: getCurrentTime(),
      assignee: '待分配',
      remark: `从评论巡检升级工单，评论ID：${comment.id}`,
      actionLogs: [
        createActionLog(
          '',
          'create',
          `从评论巡检升级工单，评论ID：${comment.id}`
        ),
      ],
    };

    newTicket.actionLogs[0].ticketId = newTicket.id;
    newTicket.actionLogs[0].id = generateLogId();

    set(state => ({
      tickets: [newTicket, ...state.tickets],
    }));

    console.log('[Store] 新增工单:', newTicket.id);
    return newTicket;
  },

  batchAddTicketsFromComments: (comments) => {
    const result: BatchEscalationResult = {
      successCount: 0,
      failCount: 0,
      successIds: [],
      failReasons: [],
    };

    const currentTickets = get().tickets;
    const newTickets: EscalationTicket[] = [];

    comments.forEach((comment, index) => {
      const existingTicket = currentTickets.find(t => t.commentId === comment.id) ||
        newTickets.find(t => t.commentId === comment.id);

      if (existingTicket) {
        result.failCount++;
        result.failReasons.push(`评论 ${index + 1}：已存在工单`);
        return;
      }

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
        createTime: getCurrentTime(),
        updateTime: getCurrentTime(),
        assignee: '待分配',
        remark: `从评论巡检批量升级，评论ID：${comment.id}`,
        actionLogs: [
          {
            id: generateLogId(),
            ticketId: '',
            action: 'create',
            operator: '当前用户',
            timestamp: getCurrentTime(),
            detail: `从评论巡检批量升级工单，评论ID：${comment.id}`,
          },
        ],
      };
      newTicket.actionLogs[0].ticketId = newTicket.id;

      newTickets.push(newTicket);
      result.successCount++;
      result.successIds.push(newTicket.id);
    });

    set(state => ({
      tickets: [...newTickets, ...state.tickets],
    }));

    console.log('[Store] 批量升级工单结果:', result);
    return result;
  },

  updateTicketStatus: (ticketId, status) => {
    const ticket = get().tickets.find(t => t.id === ticketId);
    if (!ticket) return;

    const oldStatusText = statusTextMap[ticket.status];
    const newStatusText = statusTextMap[status];

    const log = createActionLog(
      ticketId,
      'status_change',
      `状态变更：${oldStatusText} → ${newStatusText}`,
      oldStatusText,
      newStatusText
    );

    set(state => ({
      tickets: state.tickets.map(t =>
        t.id === ticketId
          ? {
              ...t,
              status,
              updateTime: getCurrentTime(),
              actionLogs: [...t.actionLogs, log],
            }
          : t
      ),
    }));

    console.log('[Store] 更新工单状态:', ticketId, status);
  },

  updateTicketCompensation: (ticketId, amount, status) => {
    const ticket = get().tickets.find(t => t.id === ticketId);
    if (!ticket) return;

    const logs: TicketActionLog[] = [
      createActionLog(
        ticketId,
        'compensation',
        `发放补偿 ¥${amount}`,
        ticket.compensationAmount ? `¥${ticket.compensationAmount}` : '无',
        `¥${amount}`
      ),
    ];

    let newStatus = status || ticket.status;
    if (status && status !== ticket.status) {
      logs.push(
        createActionLog(
          ticketId,
          'status_change',
          `状态变更：${statusTextMap[ticket.status]} → ${statusTextMap[status]}`,
          statusTextMap[ticket.status],
          statusTextMap[status]
        )
      );
    }

    set(state => ({
      tickets: state.tickets.map(t =>
        t.id === ticketId
          ? {
              ...t,
              compensationAmount: amount,
              status: newStatus,
              updateTime: getCurrentTime(),
              remark: t.remark ? `${t.remark}；已补偿 ¥${amount}` : `已补偿 ¥${amount}`,
              actionLogs: [...t.actionLogs, ...logs],
            }
          : t
      ),
    }));

    console.log('[Store] 工单补偿:', ticketId, amount);
  },

  updateTicketRemark: (ticketId, remark) => {
    const ticket = get().tickets.find(t => t.id === ticketId);
    if (!ticket) return;

    const log = createActionLog(
      ticketId,
      'remark',
      `更新备注`,
      ticket.remark || '无',
      remark
    );

    set(state => ({
      tickets: state.tickets.map(t =>
        t.id === ticketId
          ? {
              ...t,
              remark,
              updateTime: getCurrentTime(),
              actionLogs: [...t.actionLogs, log],
            }
          : t
      ),
    }));

    console.log('[Store] 更新工单备注:', ticketId);
  },

  updateTicketAssignee: (ticketId, assignee) => {
    const ticket = get().tickets.find(t => t.id === ticketId);
    if (!ticket) return;

    const log = createActionLog(
      ticketId,
      'assign',
      `变更负责人：${ticket.assignee} → ${assignee}`,
      ticket.assignee,
      assignee
    );

    set(state => ({
      tickets: state.tickets.map(t =>
        t.id === ticketId
          ? {
              ...t,
              assignee,
              updateTime: getCurrentTime(),
              actionLogs: [...t.actionLogs, log],
            }
          : t
      ),
    }));

    console.log('[Store] 更新工单负责人:', ticketId, assignee);
  },

  addTicketActionLog: (ticketId, logData) => {
    const log: TicketActionLog = {
      ...logData,
      id: generateLogId(),
      ticketId,
      timestamp: getCurrentTime(),
    };

    set(state => ({
      tickets: state.tickets.map(t =>
        t.id === ticketId
          ? {
              ...t,
              updateTime: getCurrentTime(),
              actionLogs: [...t.actionLogs, log],
            }
          : t
      ),
    }));
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
