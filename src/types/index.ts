// 店铺信息
export interface Shop {
  id: string;
  name: string;
  platform: 'taobao' | 'jd' | 'pdd' | 'douyin';
}

// 商品信息
export interface Product {
  id: string;
  name: string;
  image: string;
  shopId: string;
}

// 召回批次
export interface RecallBatch {
  id: string;
  name: string;
  productId: string;
  startTime: string;
  endTime: string;
  description: string;
}

// 舆情分类
export type CommentCategory = 'safety' | 'refund' | 'distrust';

// 评论类型
export type CommentType = 'bad' | 'question' | 'review';

// 评论信息
export interface Comment {
  id: string;
  type: CommentType;
  category: CommentCategory;
  content: string;
  userNickname: string;
  userAvatar: string;
  productId: string;
  shopId: string;
  batchId: string;
  createTime: string;
  riskLevel: 'high' | 'medium' | 'low';
  hasImage: boolean;
  isMediaAccount: boolean;
  repeatCount: number;
  orderId?: string;
}

// 重复句子
export interface RepeatPhrase {
  text: string;
  count: number;
  category: CommentCategory;
}

// 安抚话术场景
export interface ComfortScene {
  id: string;
  name: string;
  category: CommentCategory;
}

// 安抚话术模板
export interface ComfortTemplate {
  id: string;
  sceneId: string;
  title: string;
  content: string;
  variables: string[];
}

// 订单状态
export type OrderStatus = 'pending_ship' | 'shipped' | 'received' | 'returned' | 'refunded';

// 寄回方式
export type ReturnMethod = 'express' | 'store' | 'pickup';

// 工单状态
export type TicketStatus = 'replied' | 'pending' | 'compensated' | 'closed';

// 工单优先级
export type TicketPriority = 'high' | 'medium' | 'low';

// 工单处理记录
export interface TicketActionLog {
  id: string;
  ticketId: string;
  action: 'status_change' | 'compensation' | 'remark' | 'assign' | 'create';
  operator: string;
  timestamp: string;
  detail: string;
  oldValue?: string;
  newValue?: string;
}

// 话术模板版本记录
export interface TemplateVersion {
  id: string;
  templateId: string;
  title: string;
  content: string;
  variables: string[];
  createTime: string;
  operator: string;
  changeType: 'create' | 'edit' | 'revert';
}

// 批量升级结果
export interface BatchEscalationResult {
  successCount: number;
  failCount: number;
  successIds: string[];
  failReasons: string[];
}

// 升级工单
export interface EscalationTicket {
  id: string;
  commentId: string;
  userNickname: string;
  userAvatar: string;
  content: string;
  hasImage: boolean;
  isMediaAccount: boolean;
  riskLevel: TicketPriority;
  status: TicketStatus;
  shopId: string;
  productId: string;
  batchId: string;
  createTime: string;
  updateTime: string;
  assignee: string;
  remark?: string;
  compensationAmount?: number;
  actionLogs: TicketActionLog[];
}

// 分类统计
export interface CategoryStats {
  category: CommentCategory;
  count: number;
  label: string;
}
