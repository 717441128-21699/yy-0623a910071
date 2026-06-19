import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import CommentCard from '@/components/CommentCard';
import CategoryTag from '@/components/CategoryTag';
import { shops, products, recallBatches } from '@/data/shops';
import { comments, repeatPhrases, categoryStats } from '@/data/comments';
import { Comment, CommentCategory } from '@/types';
import styles from './index.module.scss';

const CommentPatrolPage: React.FC = () => {
  const [selectedShopId, setSelectedShopId] = useState('shop1');
  const [selectedProductId, setSelectedProductId] = useState('prod1');
  const [selectedBatchId, setSelectedBatchId] = useState('batch1');
  const [activeCategory, setActiveCategory] = useState<CommentCategory | 'all'>('all');

  const currentShop = useMemo(() => {
    return shops.find(s => s.id === selectedShopId);
  }, [selectedShopId]);

  const currentProduct = useMemo(() => {
    return products.find(p => p.id === selectedProductId);
  }, [selectedProductId]);

  const currentBatch = useMemo(() => {
    return recallBatches.find(b => b.id === selectedBatchId);
  }, [selectedBatchId]);

  const filteredComments = useMemo(() => {
    let result = comments.filter(c =>
      c.shopId === selectedShopId &&
      c.productId === selectedProductId &&
      c.batchId === selectedBatchId
    );

    if (activeCategory !== 'all') {
      result = result.filter(c => c.category === activeCategory);
    }

    return result.sort((a, b) => {
      const riskOrder = { high: 0, medium: 1, low: 2 };
      return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
    });
  }, [selectedShopId, selectedProductId, selectedBatchId, activeCategory]);

  const topRepeatPhrases = useMemo(() => {
    return repeatPhrases
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, []);

  const handleShopSelect = () => {
    Taro.showActionSheet({
      itemList: shops.map(s => s.name),
      success: (res) => {
        const shop = shops[res.tapIndex];
        setSelectedShopId(shop.id);
        const shopProducts = products.filter(p => p.shopId === shop.id);
        if (shopProducts.length > 0) {
          setSelectedProductId(shopProducts[0].id);
          const batch = recallBatches.find(b => b.productId === shopProducts[0].id);
          if (batch) {
            setSelectedBatchId(batch.id);
          }
        }
      },
    });
  };

  const handleProductSelect = () => {
    const shopProducts = products.filter(p => p.shopId === selectedShopId);
    if (shopProducts.length === 0) return;

    Taro.showActionSheet({
      itemList: shopProducts.map(p => p.name),
      success: (res) => {
        const product = shopProducts[res.tapIndex];
        setSelectedProductId(product.id);
        const batch = recallBatches.find(b => b.productId === product.id);
        if (batch) {
          setSelectedBatchId(batch.id);
        }
      },
    });
  };

  const handleBatchSelect = () => {
    const productBatches = recallBatches.filter(b => b.productId === selectedProductId);
    if (productBatches.length === 0) return;

    Taro.showActionSheet({
      itemList: productBatches.map(b => b.name),
      success: (res) => {
        setSelectedBatchId(productBatches[res.tapIndex].id);
      },
    });
  };

  const handleEscalate = (comment: Comment) => {
    Taro.showModal({
      title: '确认升级',
      content: '确定要将此评论升级为工单吗？',
      success: (res) => {
        if (res.confirm) {
          Taro.showToast({ title: '工单已创建', icon: 'success' });
          console.log('[CommentPatrol] 升级工单:', comment.id);
        }
      },
    });
  };

  const handleQuickReply = (comment: Comment) => {
    Taro.switchTab({ url: '/pages/quick-comfort/index' });
    console.log('[CommentPatrol] 快捷安抚:', comment.id);
  };

  const categoryTabList = [
    { key: 'all' as const, label: '全部', count: categoryStats.reduce((sum, s) => sum + s.count, 0) },
    ...categoryStats.map(s => ({ key: s.category, label: s.label, count: s.count })),
  ];

  return (
    <ScrollView scrollY className={styles.pageContainer}>
      <View className={styles.filterSection}>
        <Text className={styles.pageTitle}>评论巡检</Text>

        <View className={styles.filterRow}>
          <View className={styles.filterItem} onClick={handleShopSelect}>
            <Text className={styles.filterLabel}>店铺</Text>
            <Text className={styles.filterValue}>{currentShop?.name || '请选择'}</Text>
          </View>
          <View className={styles.filterItem} onClick={handleProductSelect}>
            <Text className={styles.filterLabel}>商品</Text>
            <Text className={styles.filterValue}>{currentProduct?.name || '请选择'}</Text>
          </View>
        </View>

        <View className={styles.filterRow}>
          <View className={styles.filterItem} onClick={handleBatchSelect}>
            <Text className={styles.filterLabel}>召回批次</Text>
            <Text className={styles.filterValue}>{currentBatch?.name || '请选择'}</Text>
          </View>
        </View>

        <View className={styles.statsSection}>
          {categoryStats.map(stat => (
            <View key={stat.category} className={classnames(styles.statCard, styles[stat.category])}>
              <Text className={styles.statCount}>{stat.count}</Text>
              <Text className={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className={styles.repeatSection}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>🔥 高频重复表述</Text>
          <Text className={styles.moreText}>近24小时</Text>
        </View>
        <View className={styles.repeatList}>
          {topRepeatPhrases.map((phrase, index) => (
            <View key={index} className={styles.repeatItem}>
              <View className={styles.repeatContent}>
                <Text className={styles.repeatText}>"{phrase.text}"</Text>
                <View style={{ marginTop: 8 }}>
                  <CategoryTag category={phrase.category} size="sm" />
                </View>
              </View>
              <View className={styles.repeatBadge}>
                <Text className={styles.repeatCount}>{phrase.count}次</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View className={styles.categoryTabs}>
        {categoryTabList.map(tab => (
          <View
            key={tab.key}
            className={classnames(
              styles.categoryTab,
              tab.key !== 'all' && styles[tab.key],
              activeCategory === tab.key && styles.active
            )}
            onClick={() => setActiveCategory(tab.key)}
          >
            <Text className={styles.tabText}>{tab.label}</Text>
            <Text className={styles.tabCount}>{tab.count}</Text>
          </View>
        ))}
      </View>

      <View className={styles.commentList}>
        {filteredComments.length > 0 ? (
          filteredComments.map(comment => (
            <CommentCard
              key={comment.id}
              comment={comment}
              onEscalate={handleEscalate}
              onQuickReply={handleQuickReply}
            />
          ))
        ) : (
          <View className={styles.emptyState}>
            <Text className={styles.emptyText}>暂无相关评论</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default CommentPatrolPage;
