import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Button, Image } from '@tarojs/components';
import Taro, { usePullDownRefresh } from '@tarojs/taro';
import classnames from 'classnames';
import StatusBadge from '@/components/StatusBadge';
import RiskTag from '@/components/RiskTag';
import TicketDetailPanel from '@/components/TicketDetailPanel';
import { EscalationTicket, TicketStatus, TicketPriority } from '@/types';
import useAppStore from '@/store/useAppStore';
import styles from './index.module.scss';

type FilterStatus = 'all' | TicketStatus;

const statusFilterList: { key: FilterStatus; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待核实' },
  { key: 'replied', label: '已回复' },
  { key: 'compensated', label: '已补偿' },
  { key: 'closed', label: '已关闭' },
];

const priorityTextMap: Record<TicketPriority, string> = {
  high: '高优先级',
  medium: '中优先级',
  low: '低优先级',
};

const EscalationTicketPage: React.FC = () => {
  const tickets = useAppStore(state => state.tickets);
  const updateTicketStatus = useAppStore(state => state.updateTicketStatus);
  const updateTicketCompensation = useAppStore(state => state.updateTicketCompensation);
  const updateTicketRemark = useAppStore(state => state.updateTicketRemark);
  const updateTicketAssignee = useAppStore(state => state.updateTicketAssignee);

  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');
  const [detailTicket, setDetailTicket] = useState<EscalationTicket | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: tickets.length,
      pending: 0,
      replied: 0,
      compensated: 0,
      closed: 0,
    };
    tickets.forEach(t => {
      counts[t.status]++;
    });
    return counts;
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    let result = [...tickets];
    if (activeFilter !== 'all') {
      result = result.filter(t => t.status === activeFilter);
    }
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    result.sort((a, b) => {
      if (priorityOrder[a.riskLevel] !== priorityOrder[b.riskLevel]) {
        return priorityOrder[a.riskLevel] - priorityOrder[b.riskLevel];
      }
      return new Date(b.createTime).getTime() - new Date(a.createTime).getTime();
    });
    return result;
  }, [tickets, activeFilter]);

  const liveDetailTicket = useMemo(() => {
    if (!detailTicket) return null;
    return tickets.find(t => t.id === detailTicket.id) || null;
  }, [tickets, detailTicket]);

  usePullDownRefresh(() => {
    setTimeout(() => {
      Taro.stopPullDownRefresh();
    }, 300);
  });

  const handleTicketClick = (ticket: EscalationTicket) => {
    console.log('[Escalation] 查看工单详情:', ticket.id);
    setDetailTicket(ticket);
    setShowDetail(true);
  };

  const handleCloseDetail = () => {
    setShowDetail(false);
    setDetailTicket(null);
  };

  const handleDetailStatusChange = (ticketId: string, status: TicketStatus) => {
    updateTicketStatus(ticketId, status);
    Taro.showToast({ title: '状态已更新', icon: 'success' });
  };

  const handleDetailCompensate = (ticketId: string, amount: number) => {
    updateTicketCompensation(ticketId, amount, 'compensated');
    Taro.showToast({ title: '补偿已发放', icon: 'success' });
  };

  const handleDetailRemarkUpdate = (ticketId: string, remark: string) => {
    updateTicketRemark(ticketId, remark);
  };

  const handleDetailAssigneeUpdate = (ticketId: string, assignee: string) => {
    updateTicketAssignee(ticketId, assignee);
    Taro.showToast({ title: '负责人已更新', icon: 'success' });
  };

  const handleStatusChange = (ticket: EscalationTicket, newStatus: TicketStatus) => {
    const statusTextMap: Record<TicketStatus, string> = {
      replied: '已回复',
      pending: '待核实',
      compensated: '已补偿',
      closed: '已关闭',
    };
    Taro.showModal({
      title: '确认操作',
      content: `确定要将工单状态改为"${statusTextMap[newStatus]}"吗？`,
      success: (res) => {
        if (res.confirm) {
          updateTicketStatus(ticket.id, newStatus);
          Taro.showToast({ title: '状态已更新', icon: 'success' });
        }
      },
    });
  };

  const handleCompensate = (ticket: EscalationTicket) => {
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
              updateTicketCompensation(ticket.id, selected.value, 'compensated');
              Taro.showToast({ title: '补偿已发放', icon: 'success' });
            }
          },
        });
      },
    });
  };

  const getActionButton = (ticket: EscalationTicket) => {
    switch (ticket.status) {
      case 'pending':
        return (
          <Button
            className={classnames(styles.actionBtn, styles.primaryAction)}
            onClick={(e) => {
              e.stopPropagation();
              handleStatusChange(ticket, 'replied');
            }}
          >
            <Text className={styles.btnText}>标记已回复</Text>
          </Button>
        );
      case 'replied':
        return (
          <Button
            className={classnames(styles.actionBtn, styles.primaryAction)}
            onClick={(e) => {
              e.stopPropagation();
              handleCompensate(ticket);
            }}
          >
            <Text className={styles.btnText}>发放补偿</Text>
          </Button>
        );
      case 'compensated':
        return (
          <Button
            className={classnames(styles.actionBtn, styles.secondaryAction)}
            onClick={(e) => {
              e.stopPropagation();
              handleStatusChange(ticket, 'closed');
            }}
          >
            <Text className={styles.btnText}>关闭工单</Text>
          </Button>
        );
      case 'closed':
        return (
          <Button
            className={classnames(styles.actionBtn, styles.secondaryAction)}
            onClick={(e) => {
              e.stopPropagation();
              handleStatusChange(ticket, 'pending');
            }}
          >
            <Text className={styles.btnText}>重新打开</Text>
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <ScrollView scrollY className={styles.pageContainer}>
      <View className={styles.headerSection}>
        <Text className={styles.pageTitle}>升级工单</Text>
        <View className={styles.statsRow}>
          <View className={styles.statItem}>
            <Text className={styles.statCount}>{statusCounts.pending}</Text>
            <Text className={styles.statLabel}>待核实</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statCount}>{statusCounts.replied}</Text>
            <Text className={styles.statLabel}>已回复</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statCount}>{statusCounts.compensated}</Text>
            <Text className={styles.statLabel}>已补偿</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statCount}>{statusCounts.closed}</Text>
            <Text className={styles.statLabel}>已关闭</Text>
          </View>
        </View>
      </View>

      <View className={styles.filterTabs}>
        {statusFilterList.map(tab => (
          <View
            key={tab.key}
            className={classnames(styles.filterTab, activeFilter === tab.key && styles.active)}
            onClick={() => setActiveFilter(tab.key)}
          >
            <Text className={styles.tabText}>{tab.label}</Text>
            <Text className={styles.tabCount}>({statusCounts[tab.key]})</Text>
          </View>
        ))}
      </View>

      <View className={styles.ticketList}>
        {filteredTickets.length > 0 ? (
          filteredTickets.map(ticket => (
            <View
              key={ticket.id}
              className={styles.ticketCard}
              onClick={() => handleTicketClick(ticket)}
            >
              <View className={styles.ticketHeader}>
                <View className={styles.userInfo}>
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
                    <Text className={styles.ticketTime}>{ticket.createTime}</Text>
                  </View>
                </View>
                <StatusBadge status={ticket.status} size="sm" />
              </View>

              <View className={styles.ticketBody}>
                <View className={styles.tagsRow}>
                  <View className={classnames(styles.priorityDot, styles[ticket.riskLevel])} />
                  <RiskTag level={ticket.riskLevel} size="sm" text={priorityTextMap[ticket.riskLevel]} />
                  {ticket.hasImage && (
                    <View className={styles.imageBadge}>
                      <Text className={styles.imageText}>含图片</Text>
                    </View>
                  )}
                  {ticket.compensationAmount && (
                    <View className={styles.compensationBadge}>
                      <Text className={styles.compensationText}>
                        补偿 ¥{ticket.compensationAmount}
                      </Text>
                    </View>
                  )}
                </View>
                <Text className={styles.ticketContent}>{ticket.content}</Text>
              </View>

              <View className={styles.ticketFooter}>
                <View className={styles.assigneeInfo}>
                  <Text className={styles.assigneeLabel}>负责人：</Text>
                  <Text className={styles.assigneeName}>{ticket.assignee}</Text>
                </View>
                {getActionButton(ticket)}
              </View>
            </View>
          ))
        ) : (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>📋</Text>
            <Text className={styles.emptyText}>
              {activeFilter === 'all'
                ? '暂无工单数据'
                : `暂无${statusFilterList.find(f => f.key === activeFilter)?.label}工单`}
            </Text>
            {tickets.length > 0 && activeFilter !== 'all' && (
              <Text style={{ fontSize: 24, color: '#86909C', marginTop: 8, display: 'block' }}>
                可切换"全部"标签查看其他工单
              </Text>
            )}
          </View>
        )}
      </View>

      <TicketDetailPanel
        ticket={liveDetailTicket}
        visible={showDetail}
        onClose={handleCloseDetail}
        onStatusChange={handleDetailStatusChange}
        onCompensate={handleDetailCompensate}
        onRemarkUpdate={handleDetailRemarkUpdate}
        onAssigneeUpdate={handleDetailAssigneeUpdate}
      />
    </ScrollView>
  );
};

export default EscalationTicketPage;
