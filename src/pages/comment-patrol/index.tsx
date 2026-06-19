import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, Button, Image } from '@tarojs/components';
import Taro, { usePullDownRefresh } from '@tarojs/taro';
import classnames from 'classnames';

import CategoryTag from '@/components/CategoryTag';
import RiskTag from '@/components/RiskTag';
import { shops, products, recallBatches } from '@/data/shops';
import { Comment, CommentCategory, BatchEscalationResult } from '@/types';
import useAppStore from '@/store/useAppStore';
import styles from './index.module.scss';
import batchStyles from './batch.module.scss';

const CommentPatrolPage: React.FC = () => {
  const getFilteredComments = useAppStore(state => state.getFilteredComments);
  const getCategoryStats = useAppStore(state => state.getCategoryStats);
  const getRepeatPhrases = useAppStore(state => state.getRepeatPhrases);
  const addTicketFromComment = useAppStore(state => state.addTicketFromComment);
  const batchAddTicketsFromComments = useAppStore(state => state.batchAddTicketsFromComments);

  const [selectedShopId, setSelectedShopId] = useState<string>('shop1');
  const [selectedProductId, setSelectedProductId] = useState<string>('prod1');
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<CommentCategory | 'all'>('all');

  const [batchMode, setBatchMode] = useState(false);
  const [selectedComments, setSelectedComments] = useState<Set<string>>(new Set());
  const [showResultModal, setShowResultModal] = useState(false);
  const [batchResult, setBatchResult] = useState<BatchEscalationResult | null>(null);

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

  useEffect(() => {
    if (availableProducts.length > 0 && !availableProducts.find(p => p.id === selectedProductId)) {
      setSelectedProductId(availableProducts[0].id);
    }
  }, [availableProducts, selectedProductId]);

  useEffect(() => {
    if (availableBatches.length > 0) {
      if (!selectedBatchId || !availableBatches.find(b => b.id === selectedBatchId)) {
        setSelectedBatchId(availableBatches[0].id);
      }
    } else {
      setSelectedBatchId(null);
    }
  }, [availableBatches, selectedBatchId]);

  useEffect(() => {
    if (!batchMode) {
      setSelectedComments(new Set());
    }
  }, [batchMode]);

  useEffect(() => {
    if (!batchMode || selectedComments.size === 0) return;

    const currentCommentIds = new Set(filteredComments.map(c => c.id));
    let hasChange = false;
    const newSelected = new Set<string>();

    selectedComments.forEach(id => {
      if (currentCommentIds.has(id)) {
        newSelected.add(id);
      } else {
        hasChange = true;
      }
    });

    if (hasChange) {
      console.log('[CommentPatrol] 筛选条件变化，清理失效的已选评论:', selectedComments.size - newSelected.size, '条');
      setSelectedComments(newSelected);
    }
  }, [filteredComments, batchMode, selectedComments]);

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

  const highRiskComments = useMemo(() => {
    return filteredComments.filter(c => c.riskLevel === 'high');
  }, [filteredComments]);

  const totalCount = useMemo(() => {
    return categoryStats.reduce((sum, s) => sum + s.count, 0);
  }, [categoryStats]);

  const handleShopSelect = () => {
    Taro.showActionSheet({
      itemList: shops.map(s => s.name),
      success: (res) => {
        const shop = shops[res.tapIndex];
        setSelectedShopId(shop.id);
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
      },
    });
  };

  const handleEscalate = (comment: Comment) => {
    Taro.showModal({
      title: '确认升级',
      content: '确定要将此评论升级为工单吗？升级后工单页可查看并处理。',
      success: (res) => {
        if (res.confirm) {
          const result = addTicketFromComment(comment);
          if (result) {
            Taro.showToast({ title: '工单已创建，可在工单页查看', icon: 'success', duration: 2000 });
          } else {
            Taro.showToast({ title: '该评论已存在工单', icon: 'none' });
          }
        }
      },
    });
  };

  const handleQuickReply = (comment: Comment) => {
    Taro.switchTab({ url: '/pages/quick-comfort/index' });
  };

  const toggleCommentSelection = (commentId: string) => {
    setSelectedComments(prev => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  };

  const selectAllHighRisk = () => {
    const ids = new Set(highRiskComments.map(c => c.id));
    setSelectedComments(ids);
  };

  const clearSelection = () => {
    setSelectedComments(new Set());
  };

  const handleBatchEscalate = () => {
    if (selectedComments.size === 0) {
      Taro.showToast({ title: '请先选择要升级的评论', icon: 'none' });
      return;
    }

    const commentsToEscalate = filteredComments.filter(c => selectedComments.has(c.id));

    if (commentsToEscalate.length === 0) {
      Taro.showToast({ title: '当前列表中无有效选中评论', icon: 'none' });
      return;
    }

    Taro.showModal({
      title: '批量升级确认',
      content: `确定要将选中的 ${commentsToEscalate.length} 条评论升级为工单吗？`,
      success: (res) => {
        if (res.confirm) {
          const result = batchAddTicketsFromComments(commentsToEscalate);
          setBatchResult(result);
          setShowResultModal(true);
          setSelectedComments(new Set());
        }
      },
    });
  };

  const closeResultModal = () => {
    setShowResultModal(false);
    setBatchResult(null);
  };

  const goToTickets = () => {
    closeResultModal();
    Taro.switchTab({ url: '/pages/escalation-ticket/index' });
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

  const typeTextMap = {
    bad: '差评',
    question: '追问',
    review: '晒单',
  };

  return (
    <ScrollView scrollY className={styles.pageContainer}>
      <View className={styles.filterSection}>
        <View className={batchStyles.titleRow}>
          <Text className={styles.pageTitle}>评论巡检</Text>
          <Button
            className={classnames(batchStyles.batchToggleBtn, batchMode && batchStyles.batchToggleBtnActive)}
            onClick={() => setBatchMode(!batchMode)}
          >
            <Text className={classnames(batchStyles.batchToggleText, batchMode && batchStyles.batchToggleTextActive)}>
              {batchMode ? '取消批量' : '批量处理'}
            </Text>
          </Button>
        </View>

        {batchMode && highRiskComments.length > 0 && (
          <View className={batchStyles.batchQuickBar}>
            <Button className={batchStyles.quickSelectBtn} onClick={selectAllHighRisk}>
              <Text className={batchStyles.quickSelectText}>一键选高风险 ({highRiskComments.length})</Text>
            </Button>
            {selectedComments.size > 0 && (
              <Button className={batchStyles.quickSelectBtn} onClick={clearSelection}>
                <Text className={batchStyles.quickSelectText}>清空</Text>
              </Button>
            )}
          </View>
        )}

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
                <View key={comment.id} className={batchStyles.commentWrapper}>
                  {batchMode && (
                    <View
                      className={classnames(
                        batchStyles.checkbox,
                        selectedComments.has(comment.id) && batchStyles.checkboxChecked
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCommentSelection(comment.id);
                      }}
                    >
                      {selectedComments.has(comment.id) && (
                        <Text className={batchStyles.checkIcon}>✓</Text>
                      )}
                    </View>
                  )}
                  <View className={batchStyles.commentContent} style={{ width: batchMode ? 'calc(100% - 72rpx)' : '100%' }}>
                    <View className={batchStyles.miniCard}>
                      <View className={batchStyles.miniCardHeader}>
                        <View className={batchStyles.userInfo}>
                          <Image
                            className={batchStyles.miniAvatar}
                            src={comment.userAvatar}
                            mode="aspectFill"
                          />
                          <View className={batchStyles.userMeta}>
                            <View className={batchStyles.userNameRow}>
                              <Text className={batchStyles.nickname}>{comment.userNickname}</Text>
                              {comment.isMediaAccount && (
                                <View className={batchStyles.mediaBadge}>
                                  <Text className={batchStyles.mediaText}>媒体</Text>
                                </View>
                              )}
                            </View>
                            <Text className={batchStyles.timeText}>{comment.createTime}</Text>
                          </View>
                        </View>
                        <View className={batchStyles.tagsRow}>
                          <View className={classnames(batchStyles.typeTag, batchStyles[comment.type])}>
                            <Text className={batchStyles.typeText}>{typeTextMap[comment.type]}</Text>
                          </View>
                          <RiskTag level={comment.riskLevel} size="sm" />
                        </View>
                      </View>

                      <View className={batchStyles.miniCardBody}>
                        <CategoryTag category={comment.category} size="sm" />
                        <Text className={batchStyles.contentText}>{comment.content}</Text>
                        {comment.hasImage && (
                          <View className={batchStyles.imageHint}>
                            <Text className={batchStyles.imageHintText}>📷 含图片</Text>
                          </View>
                        )}
                        {comment.repeatCount > 1 && (
                          <View className={batchStyles.repeatHint}>
                            <Text className={batchStyles.repeatHintText}>
                              相似表述已出现 {comment.repeatCount} 次
                            </Text>
                          </View>
                        )}
                      </View>

                      {!batchMode && (
                        <View className={batchStyles.miniCardFooter}>
                          <Button
                            className={classnames(batchStyles.actionBtn, batchStyles.secondaryBtn)}
                            onClick={() => handleQuickReply(comment)}
                          >
                            <Text className={batchStyles.btnText}>快捷安抚</Text>
                          </Button>
                          <Button
                            className={classnames(batchStyles.actionBtn, batchStyles.primaryBtn)}
                            onClick={() => handleEscalate(comment)}
                          >
                            <Text className={batchStyles.btnTextPrimary}>升级工单</Text>
                          </Button>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
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

          <View style={{ height: batchMode ? 200 : 40 }} />
        </>
      )}

      {batchMode && hasValidSelection && (
        <View className={batchStyles.batchActionBar}>
          <View className={batchStyles.batchInfo}>
            <Text className={batchStyles.selectedCountText}>
              已选择 <Text className={batchStyles.selectedCount}>{selectedComments.size}</Text> 条
            </Text>
          </View>
          <Button
            className={classnames(batchStyles.batchActionBtn, selectedComments.size === 0 && batchStyles.batchActionBtnDisabled)}
            disabled={selectedComments.size === 0}
            onClick={handleBatchEscalate}
          >
            <Text className={batchStyles.batchActionText}>一键升级工单</Text>
          </Button>
        </View>
      )}

      {showResultModal && batchResult && (
        <View className={batchStyles.resultOverlay}>
          <View className={batchStyles.resultContent}>
            <View className={batchStyles.resultHeader}>
              <Text className={batchStyles.resultIcon}>🎉</Text>
              <Text className={batchStyles.resultTitle}>批量升级完成</Text>
            </View>

            <View className={batchStyles.resultStats}>
              <View className={batchStyles.resultStatItem}>
                <Text className={batchStyles.resultStatCountSuccess}>{batchResult.successCount}</Text>
                <Text className={batchStyles.resultStatLabel}>成功创建</Text>
              </View>
              {batchResult.failCount > 0 && (
                <View className={batchStyles.resultStatItem}>
                  <Text className={batchStyles.resultStatCountFail}>{batchResult.failCount}</Text>
                  <Text className={batchStyles.resultStatLabel}>已存在工单</Text>
                </View>
              )}
            </View>

            {batchResult.failReasons.length > 0 && (
              <View className={batchStyles.resultWarnings}>
                {batchResult.failReasons.map((reason, idx) => (
                  <Text key={idx} className={batchStyles.warningText}>⚠️ {reason}</Text>
                ))}
              </View>
            )}

            <View className={batchStyles.resultActions}>
              <Button
                className={classnames(batchStyles.resultBtn, batchStyles.resultBtnSecondary)}
                onClick={closeResultModal}
              >
                <Text className={batchStyles.resultBtnSecondaryText}>继续巡检</Text>
              </Button>
              <Button
                className={classnames(batchStyles.resultBtn, batchStyles.resultBtnPrimary)}
                onClick={goToTickets}
              >
                <Text className={batchStyles.resultBtnPrimaryText}>查看工单</Text>
              </Button>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

export default CommentPatrolPage;
