import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import styles from './index.module.scss';

interface StatusBadgeProps {
  status: 'replied' | 'pending' | 'compensated' | 'closed';
  size?: 'sm' | 'md';
}

const statusTextMap = {
  replied: '已回复',
  pending: '待核实',
  compensated: '已补偿',
  closed: '已关闭',
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  return (
    <View className={classnames(styles.statusBadge, styles[status], styles[size])}>
      <Text className={styles.badgeText}>{statusTextMap[status]}</Text>
    </View>
  );
};

export default StatusBadge;
