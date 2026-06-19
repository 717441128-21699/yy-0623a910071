import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Button, Image, Textarea } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import StatusBadge from '@/components/StatusBadge';
import RiskTag from '@/components/RiskTag';
import CategoryTag from '@/components/CategoryTag';
import { EscalationTicket, TicketStatus, TicketPriority, TicketActionLog } from '@/types';
import styles from './index.module.scss';

interface TicketDetailPanelProps {
  ticket: EscalationTicket | null;
  visible: boolean;
  onClose: () => void;
  onStatusChange: (ticketId: string, status: TicketStatus) => void;
  onCompensate: (ticketId: string, amount: number) => void;
  onRemarkUpdate: (ticketId: string, remark: string) => void;
  onAssigneeUpdate: (ticketId: string, assignee: string) => void;
}

const priorityTextMap: Record<TicketPriority, string> = {
  high: '高优先级',
  medium: '中优先级',
  low: '低优先级',
};

const actionTextMap: Record<TicketActionLog['action'], string> = {
  create: '创建工单',
  status_change: '状态变更',
  compensation: '发放补偿',
  remark: '更新备注',
  assign: '分配负责人',
};

const actionIconMap: Record<TicketActionLog['action'], string> = {
  create: '📝',
  status_change: '🔄',
  compensation: '💰',
  remark: '📌',
  assign: '👤',
};

const assigneeOptions = ['张经理', '李主管', '王客服', '刘专员', '陈组长'];

const TicketDetailPanel: React.FC<TicketDetailPanelProps> = ({
  ticket,
  visible,
  onClose,
  onStatusChange,
  onCompensate,
  onRemarkUpdate,
  onAssigneeUpdate,
}) => {
  const [editingRemark, setEditingRemark] = useState('');
  const [showRemarkEditor, setShowRemarkEditor] = useState(false);
  const [remarkInput, setRemarkInput] = useState('');

  const actionLogs = useMemo(() => {
    if (!ticket) return [];
    return [...ticket.actionLogs].sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [ticket]);

  if (!visible || !ticket) return null;

  const handleStatusChange = (newStatus: TicketStatus) => {
    const statusTextMap: Record<TicketStatus, string> = {
      pending: '待核实',
      replied: '已回复',
      compensated: '已补偿',
      closed: '已关闭',
    };
    Taro.showModal({
      title: '确认操作',
      content: `确定要将工单状态改为"${statusTextMap[newStatus]}"吗？`,
      success: (res) => {
        if (res.confirm) {
          onStatusChange(ticket.id, newStatus);
        }
      },
    });
  };

  const handleCompensate = () => {
    const options = [
      { label: '50元优惠券', value: 50 },
      { label: '100元优惠券', value: 100 },
      { label: '200元现金补偿', value: 200 },
      { label: '500元现金补偿', value: 500 },
    ];
    Taro.showActionSheet({
      itemList: options.map(o => o.label),
      success: (res) => {
        const selected = options[res.tapIndex];
        Taro.showModal({
          title: '确认补偿',
          content: `确定补偿 ${selected.value} 元吗？`,
          success: (modalRes) => {
            if (modalRes.confirm) {
              onCompensate(ticket.id, selected.value);
            }
          },
        });
      },
    });
  };

  const handleRemarkEdit = () => {
    setRemarkInput(ticket.remark || '');
    setShowRemarkEditor(true);
  };

  const handleRemarkSave = () => {
    if (!remarkInput.trim()) {
      Taro.showToast({ title: '请输入备注内容', icon: 'none' });
      return;
    }
    onRemarkUpdate(ticket.id, remarkInput.trim());
    setShowRemarkEditor(false);
    Taro.showToast({ title: '备注已更新', icon: 'success' });
  };

  const handleAssigneeChange = () => {
    Taro.showActionSheet({
      itemList: assigneeOptions,
      success: (res) => {
        const assignee = assigneeOptions[res.tapIndex];
        Taro.showModal({
          title: '确认分配',
          content: `确定将工单分配给 ${assignee} 吗？`,
          success: (modalRes) => {
            if (modalRes.confirm) {
              onAssigneeUpdate(ticket.id, assignee);
            }
          },
        });
      },
    });
  };

  const getStatusActions = () => {
    switch (ticket.status) {
      case 'pending':
        return (
          <>
            <Button
              className={classnames(styles.actionBtn, styles.actionBtnPrimary)}
              onClick={() => handleStatusChange('replied')}
            >
              <Text className={styles.btnTextWhite}>标记已回复</Text>
            </Button>
            <Button
              className={classnames(styles.actionBtn, styles.actionBtnSecondary)}
              onClick={handleCompensate}
            >
              <Text className={styles.btnText}>直接补偿</Text>
            </Button>
          </>
        );
      case 'replied':
        return (
          <>
            <Button
              className={classnames(styles.actionBtn, styles.actionBtnPrimary)}
              onClick={handleCompensate}
            >
              <Text className={styles.btnTextWhite}>发放补偿</Text>
            </Button>
            <Button
              className={classnames(styles.actionBtn, styles.actionBtnSecondary)}
              onClick={() => handleStatusChange('closed')}
            >
              <Text className={styles.btnText}>关闭工单</Text>
            </Button>
          </>
        );
      case 'compensated':
        return (
          <Button
            className={classnames(styles.actionBtn, styles.actionBtnPrimary)}
            onClick={() => handleStatusChange('closed')}
          >
            <Text className={styles.btnTextWhite}>关闭工单</Text>
          </Button>
        );
      case 'closed':
        return (
          <Button
            className={classnames(styles.actionBtn, styles.actionBtnSecondary)}
            onClick={() => handleStatusChange('pending')}
          >
            <Text className={styles.btnText}>重新打开</Text>
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <View className={styles.panelOverlay}>
      <View className={styles.panelContainer}>
        <View className={styles.panelHeader}>
          <Text className={styles.panelTitle}>工单详情</Text>
          <View className={styles.closeBtn} onClick={onClose}>
            <Text className={styles.closeText}>✕</Text>
          </View>
        </View>

        <ScrollView scrollY className={styles.panelBody}>
          <View className={styles.section}>
            <View className={styles.userHeader}>
              <Image
                className={styles.avatar}
                src={ticket.userAvatar}
                mode="aspectFill"
              />
              <View className={styles.userMeta}>
                <View className={styles.userNameRow}>
                  <Text className={styles.nickname}>{ticket.userNickname}</Text>
                  {ticket.isMediaAccount && (
                    <View className={styles.mediaBadge}>
                      <Text className={styles.mediaText}>媒体</Text>
                    </View>
                  )}
                </View>
                <Text className={styles.createTime}>{ticket.createTime}</Text>
              </View>
            </View>

            <View className={styles.tagsRow}>
              <View className={classnames(styles.priorityDot, styles[ticket.riskLevel])} />
              <RiskTag level={ticket.riskLevel} size="sm" text={priorityTextMap[ticket.riskLevel]} />
              <StatusBadge status={ticket.status} size="sm" />
              {ticket.hasImage && (
                <View className={styles.imageBadge}>
                  <Text className={styles.imageText}>📷 含图片</Text>
                </View>
              )}
            </View>
          </View>

          <View className={styles.section}>
            <Text className={styles.sectionTitle}>评论原文</Text>
            <View className={styles.commentContent}>
              <Text className={styles.commentText}>{ticket.content}</Text>
            </View>
          </View>

          <View className={styles.section}>
            <View className={styles.infoRow}>
              <Text className={styles.infoLabel}>负责人</Text>
              <View className={styles.infoValueRow}>
                <Text className={styles.infoValue}>{ticket.assignee}</Text>
                <Button className={styles.miniEditBtn} onClick={handleAssigneeChange}>
                  <Text className={styles.miniEditText}>更换</Text>
                </Button>
              </View>
            </View>
            <View className={styles.infoRow}>
              <Text className={styles.infoLabel}>更新时间</Text>
              <Text className={styles.infoValue}>{ticket.updateTime}</Text>
            </View>
            {ticket.compensationAmount && (
              <View className={styles.infoRow}>
                <Text className={styles.infoLabel}>补偿金额</Text>
                <View className={styles.compensationTag}>
                  <Text className={styles.compensationText}>¥{ticket.compensationAmount}</Text>
                </View>
              </View>
            )}
          </View>

          <View className={styles.section}>
            <View className={styles.sectionHeaderRow}>
              <Text className={styles.sectionTitle}>处理备注</Text>
              <Button className={styles.miniEditBtn} onClick={handleRemarkEdit}>
                <Text className={styles.miniEditText}>编辑</Text>
              </Button>
            </View>
            <View className={styles.remarkContent}>
              <Text className={styles.remarkText}>
                {ticket.remark || '暂无处理备注'}
              </Text>
            </View>
          </View>

          <View className={styles.section}>
            <Text className={styles.sectionTitle}>处理记录</Text>
            <View className={styles.logList}>
              {actionLogs.map((log, index) => (
                <View key={log.id} className={styles.logItem}>
                  <View className={styles.logDot} />
                  {index < actionLogs.length - 1 && <View className={styles.logLine} />}
                  <View className={styles.logContent}>
                    <View className={styles.logHeader}>
                      <Text className={styles.logIcon}>{actionIconMap[log.action]}</Text>
                      <Text className={styles.logAction}>{actionTextMap[log.action]}</Text>
                      <Text className={styles.logOperator}>{log.operator}</Text>
                    </View>
                    <Text className={styles.logDetail}>{log.detail}</Text>
                    {(log.oldValue || log.newValue) && (
                      <View className={styles.logChange}>
                        {log.oldValue && (
                          <Text className={styles.logOld}>{log.oldValue}</Text>
                        )}
                        {log.newValue && (
                          <>
                            <Text className={styles.logArrow}> → </Text>
                            <Text className={styles.logNew}>{log.newValue}</Text>
                          </>
                        )}
                      </View>
                    )}
                    <Text className={styles.logTime}>{log.timestamp}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={{ height: 160 }} />
        </ScrollView>

        <View className={styles.panelFooter}>
          {getStatusActions()}
        </View>

        {showRemarkEditor && (
          <View className={styles.editorOverlay}>
            <View className={styles.editorContainer}>
              <View className={styles.editorHeader}>
                <Text className={styles.editorTitle}>编辑备注</Text>
              </View>
              <ScrollView scrollY className={styles.editorBody}>
                <Textarea
                  className={styles.editorTextarea}
                  value={remarkInput}
                  onInput={(e) => setRemarkInput(e.detail.value)}
                  placeholder="请输入处理备注信息..."
                  placeholderClass={styles.placeholderClass}
                  maxlength={500}
                  autoHeight
                />
              </ScrollView>
              <View className={styles.editorFooter}>
                <Button
                  className={classnames(styles.editorBtn, styles.editorBtnCancel)}
                  onClick={() => setShowRemarkEditor(false)}
                >
                  <Text className={styles.editorBtnCancelText}>取消</Text>
                </Button>
                <Button
                  className={classnames(styles.editorBtn, styles.editorBtnConfirm)}
                  onClick={handleRemarkSave}
                >
                  <Text className={styles.editorBtnConfirmText}>保存</Text>
                </Button>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

export default TicketDetailPanel;
