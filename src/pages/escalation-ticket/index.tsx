import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Button, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import StatusBadge from '@/components/StatusBadge';
import RiskTag from '@/components/RiskTag';
import { tickets } from '@/data/tickets';
import { EscalationTicket, TicketStatus, TicketPriority } from '@/types';
import styles from './index.module.scss';

type FilterStatus = 'all' | TicketStatus;

const statusFilterList: { key: FilterStatus; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待核实' },
  { key: 'replied', label: '已回复' },
  { key: 'compensated', label: '已补偿' },
];

const priorityTextMap = {
  high: '高优先级',
  medium: '中优先级',
  low: '低优先级',
};

const EscalationTicketPage: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');

  const filteredTickets = useMemo(() => {
    let result = [...tickets];

    if (activeFilter !== 'all') {
      result = result.filter(t => t.status === activeFilter);
    }

    const priorityOrder = { high: 0, medium: 1, low: 2 };
    result.sort((a, b) => priorityOrder[a.riskLevel] - priorityOrder[b.riskLevel]);

    return result;
  }, [activeFilter]);

  const statusCounts = useMemo(() => {
    const counts = {
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
  }, []);

  const handleTicketClick = (ticket: EscalationTicket) => {
    console.log('[Escalation] 查看工单详情:', ticket.id);
    Taro.showToast({ title: '查看详情', icon: 'none' });
  };

  const handleStatusChange = (ticket: EscalationTicket, newStatus: TicketStatus) => {
    Taro.showModal({
      title: '确认操作',
      content: `确定要将工单状态改为"${newStatus === 'replied' ? '已回复' : newStatus === 'compensated' ? '已补偿' : '待核实'}"吗？`,
      success: (res) => {
        if (res.confirm) {
          Taro.showToast({ title: '状态已更新', icon: 'success' });
          console.log('[Escalation] 更新工单状态:', ticket.id, newStatus);
        }
      },
    });
  };

  const handleCompensate = (ticket: EscalationTicket) => {
    Taro.showActionSheet({
      itemList: ['50元优惠券', '100元优惠券', '200元现金补偿', '500元现金补偿'],
      success: (res) => {
        const amounts = [50, 100, 200, 500];
        Taro.showModal({
          title: '确认补偿',
          content: `确定补偿 ${amounts[res.tapIndex]} 元吗？`,
          success: (modalRes) => {
            if (modalRes.confirm) {
              Taro.showToast({ title: '补偿已发放', icon: 'success' });
              console.log('[Escalation] 发放补偿:', ticket.id, amounts[res.tapIndex]);
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
                    <View style={{
                      padding: '4rpx 12rpx',
                      backgroundColor: '#f0f5ff',
                      borderRadius: 8,
                    }}>
                      <Text style={{ fontSize: 20, color: '#165dff' }}>含图片</Text>
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
            <Text className={styles.emptyText}>暂无相关工单</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default EscalationTicketPage;
