import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import styles from './index.module.scss';

interface CategoryTagProps {
  category: 'safety' | 'refund' | 'distrust';
  size?: 'sm' | 'md';
}

const categoryTextMap = {
  safety: '安全担忧',
  refund: '退款换货',
  distrust: '不信任官方',
};

const CategoryTag: React.FC<CategoryTagProps> = ({ category, size = 'md' }) => {
  return (
    <View className={classnames(styles.categoryTag, styles[category], styles[size])}>
      <Text className={styles.tagText}>{categoryTextMap[category]}</Text>
    </View>
  );
};

export default CategoryTag;
