import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro';
import classnames from 'classnames';
import CommentCard from '@/components/CommentCard';
import CategoryTag from '@/components/CategoryTag';
import { shops, products, recallBatches } from '@/data/shops';
import { Comment, CommentCategory } from '@/types';
import useAppStore from '@/store/useAppStore';
import styles from './index.module.scss';

const CommentPatrolPage: React.FC = () => {
  const getFilteredComments = useAppStore(state => state.getFilteredComments);
  const getCategoryStats = useAppStore(state => state.getCategoryStats);
  const getRepeatPhrases = useAppStore(state => state.getRepeatPhrases);
  const addTicketFromComment = useAppStore(state => state.addTicketFromComment);

  const [selectedShopId, setSelectedShopId] = useState<string>('shop1');
  const [selectedProductId, setSelectedProductId] = useState<string>('prod1');
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<CommentCategory | 'all'>('all');

  const currentShop = useMemo(() => {
    return shops.find(s => s.id === selectedShopId);
  }, [selectedShopId]);

  const availableProducts = useMemo(() => {
    return products.filter(p => p.shopId === selectedShopId);
  }, [selectedShopId]);

  const currentProduct = useMemo(() => {
    return availableProducts.find(p => p.id === selectedProductId);
  }, [availableProducts, selectedProductId]);

  const availableBatches = useMemo(() => {
    if (!selectedProductId) return [];
    return recallBatches.filter(b => b.productId === selectedProductId);
  }, [selectedProductId]);

  const currentBatch = useMemo(() => {
    if (!selectedBatchId) return null;
    return availableBatches.find(b => b.id === selectedBatchId);
  }, [availableBatches, selectedBatchId]);

  // 切换店铺时，自动选择第一个商品
  useEffect(() => {
    if (availableProducts.length > 0 && !availableProducts.find(p => p.id === selectedProductId)) {
      setSelectedProductId(availableProducts[0].id);
    }
  }, [availableProducts, selectedProductId]);

  // 切换商品时，自动选择第一个批次或清空
  useEffect(() => {
    if (availableBatches.length > 0) {
      if (!selectedBatchId || !availableBatches.find(b => b.id === selectedBatchId)) {
        setSelectedBatchId(availableBatches[0].id);
      }
    } else {
      setSelectedBatchId(null);
    }
  }, [availableBatches, selectedBatchId]);

  // 初始化批次
  useEffect(() => {
    if (availableBatches.length > 0 && !selectedBatchId) {
      setSelectedBatchId(availableBatches[0].id);
    }
  }, []);

  const hasValidSelection = !!selectedBatchId;

  const categoryStats = useMemo(() => {
    if (!hasValidSelection) {
      return [
        { category: 'safety' as CommentCategory, count: 0, label: '安全担忧' },
        { category: 'refund' as CommentCategory, count: 0, label: '退款换货' },
        { category: 'distrust' as CommentCategory, count: 0, label: '不信任官方说明' },
      ];
    }
    return getCategoryStats(selectedShopId, selectedProductId, selectedBatchId!);
  }, [selectedShopId, selectedProductId, selectedBatchId, hasValidSelection, getCategoryStats]);

  const topRepeatPhrases = useMemo(() => {
    if (!hasValidSelection) return [];
    return getRepeatPhrases(selectedShopId, selectedProductId, selectedBatchId!);
  }, [selectedShopId, selectedProductId, selectedBatchId, hasValidSelection, getRepeatPhrases]);

  const filteredComments = useMemo(() => {
    if (!hasValidSelection) return [];

    let result = getFilteredComments(selectedShopId, selectedProductId, selectedBatchId!);

    if (activeCategory !== 'all') {
      result = result.filter(c => c.category === activeCategory);
    }

    return result.sort((a, b) => {
      const riskOrder = { high: 0, medium: 1, low: 2 };
      return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
    });
  }, [selectedShopId, selectedProductId, selectedBatchId, activeCategory, hasValidSelection, getFilteredComments]);

  const totalCount = useMemo(() => {
    return categoryStats.reduce((sum, s) => sum + s.count, 0);
  }, [categoryStats]);

  const handleShopSelect = () => {
    Taro.showActionSheet({
      itemList: shops.map(s => s.name),
      success: (res) => {
        const shop = shops[res.tapIndex];
        setSelectedShopId(shop.id);
        console.log('[Patrol] 切换店铺:', shop.id);
      },
    });
  };

  const handleProductSelect = () => {
    if (availableProducts.length === 0) {
      Taro.showToast({ title: '该店铺暂无商品', icon: 'none' });
      return;
    }

    Taro.showActionSheet({
      itemList: availableProducts.map(p => p.name),
      success: (res) => {
        const product = availableProducts[res.tapIndex];
        setSelectedProductId(product.id);
        console.log('[Patrol] 切换商品:', product.id);
      },
    });
  };

  const handleBatchSelect = () => {
    if (availableBatches.length === 0) {
      Taro.showToast({ title: '该商品暂无召回批次', icon: 'none' });
      return;
    }

    Taro.showActionSheet({
      itemList: availableBatches.map(b => b.name),
      success: (res) => {
        setSelectedBatchId(availableBatches[res.tapIndex].id);
        console.log('[Patrol] 切换批次:', availableBatches[res.tapIndex].id);
      },
    });
  };

  const handleEscalate = (comment: Comment) => {
    Taro.showModal({
      title: '确认升级',
      content: '确定要将此评论升级为工单吗？升级后工单页可查看并处理。',
      success: (res) => {
        if (res.confirm) {
          addTicketFromComment(comment);
          Taro.showToast({ title: '工单已创建，可在工单页查看', icon: 'success', duration: 2000 });
        }
      },
    });
  };

  const handleQuickReply = (comment: Comment) => {
    Taro.switchTab({ url: '/pages/quick-comfort/index' });
    console.log('[Patrol] 跳转快捷安抚:', comment.id);
  };

  usePullDownRefresh(() => {
    setTimeout(() => {
      Taro.stopPullDownRefresh();
      Taro.showToast({ title: '已刷新', icon: 'success' });
    }, 500);
  });

  const categoryTabList = [
    { key: 'all' as const, label: '全部', count: totalCount },
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
            <Text className={styles.filterValue}>
              {currentProduct?.name || (availableProducts.length === 0 ? '无匹配商品' : '请选择')}
            </Text>
          </View>
        </View>

        <View className={styles.filterRow}>
          <View
            className={classnames(styles.filterItem, availableBatches.length === 0 && styles.filterItemDisabled)}
            onClick={handleBatchSelect}
          >
            <Text className={styles.filterLabel}>召回批次</Text>
            <Text className={styles.filterValue}>
              {currentBatch?.name || (availableBatches.length === 0 ? '无召回批次' : '请选择')}
            </Text>
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

      {!hasValidSelection ? (
        <View style={{ padding: '120rpx 32rpx', textAlign: 'center' }}>
          <Text style={{ fontSize: 80, display: 'block', marginBottom: 24 }}>📦</Text>
          <Text style={{ fontSize: 32, color: '#4E5969', fontWeight: 600, marginBottom: 12, display: 'block' }}>
            当前选择的商品暂无召回批次
          </Text>
          <Text style={{ fontSize: 26, color: '#86909C', lineHeight: 1.6 }}>
            {'\n'}请先选择有召回批次的商品，或切换其他店铺查看{'\n'}
            建议路径：品牌官方旗舰店 → 智能保温杯 Pro → 2024年3月批次
          </Text>
        </View>
      ) : (
        <>
          <View className={styles.repeatSection}>
            <View className={styles.sectionHeader}>
              <Text className={styles.sectionTitle}>🔥 高频重复表述</Text>
              <Text className={styles.moreText}>近24小时</Text>
            </View>
            {topRepeatPhrases.length > 0 ? (
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
            ) : (
              <View style={{ padding: '32rpx', margin: '0 32rpx', backgroundColor: '#fff', borderRadius: 16 }}>
                <Text style={{ fontSize: 26, color: '#86909C', textAlign: 'center', display: 'block' }}>
                  暂无高频重复表述
                </Text>
              </View>
            )}
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
                <Text className={styles.tabCount}>({tab.count})</Text>
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
                <Text style={{ fontSize: 80, display: 'block', marginBottom: 16 }}>✅</Text>
                <Text className={styles.emptyText}>
                  {activeCategory === 'all'
                    ? '当前批次暂无评论，舆情状况良好'
                    : `暂无${categoryTabList.find(t => t.key === activeCategory)?.label}类评论`}
                </Text>
              </View>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
};

export default CommentPatrolPage;
