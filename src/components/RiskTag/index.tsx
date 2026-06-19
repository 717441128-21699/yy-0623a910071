import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import styles from './index.module.scss';

interface RiskTagProps {
  level: 'high' | 'medium' | 'low';
  text?: string;
  size?: 'sm' | 'md';
}

const levelTextMap = {
  high: '高风险',
  medium: '中风险',
  low: '低风险',
};

const RiskTag: React.FC<RiskTagProps> = ({ level, text, size = 'md' }) => {
  const displayText = text || levelTextMap[level];

  return (
    <View className={classnames(styles.riskTag, styles[level], styles[size])}>
      <Text className={styles.tagText}>{displayText}</Text>
    </View>
  );
};

export default RiskTag;
