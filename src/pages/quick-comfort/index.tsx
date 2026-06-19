import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Button, Input, Textarea } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import classnames from 'classnames';
import CategoryTag from '@/components/CategoryTag';
import { comfortScenes } from '@/data/templates';
import { CommentCategory, ComfortTemplate, TemplateVersion } from '@/types';
import useAppStore from '@/store/useAppStore';
import styles from './index.module.scss';
import editStyles from './edit.module.scss';
import versionStyles from './version.module.scss';

interface VariableValues {
  orderStatus: string;
  returnMethod: string;
  hotline: string;
}

const orderStatusOptions = [
  { value: '待发货', label: '待发货' },
  { value: '已发货', label: '已发货' },
  { value: '已签收', label: '已签收' },
  { value: '已寄回', label: '已寄回' },
  { value: '已退款', label: '已退款' },
];

const returnMethodOptions = [
  { value: '顺丰到付', label: '顺丰到付' },
  { value: '上门取件', label: '上门取件' },
  { value: '门店退换', label: '门店退换' },
];

const changeTypeTextMap: Record<TemplateVersion['changeType'], string> = {
  create: '创建版本',
  edit: '修改内容',
  revert: '恢复版本',
};

const QuickComfortPage: React.FC = () => {
  const templates = useAppStore(state => state.templates);
  const updateTemplateContent = useAppStore(state => state.updateTemplateContent);
  const getTemplateVersions = useAppStore(state => state.getTemplateVersions);
  const revertTemplateToVersion = useAppStore(state => state.revertTemplateToVersion);

  const [selectedSceneId, setSelectedSceneId] = useState('s1');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(templates[0]?.id || null);
  const [variables, setVariables] = useState<VariableValues>({
    orderStatus: '已签收',
    returnMethod: '顺丰到付',
    hotline: '400-888-8888',
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingContent, setEditingContent] = useState('');

  const [showVersionModal, setShowVersionModal] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  useDidShow(() => {
    if (!selectedTemplateId && templates.length > 0) {
      const sceneTemplates = templates.filter(t => t.sceneId === selectedSceneId);
      if (sceneTemplates.length > 0) {
        setSelectedTemplateId(sceneTemplates[0].id);
      }
    }
  });

  const selectedTemplate = useMemo(() => {
    return templates.find(t => t.id === selectedTemplateId) || null;
  }, [templates, selectedTemplateId]);

  const sceneTemplates = useMemo(() => {
    return templates.filter(t => t.sceneId === selectedSceneId);
  }, [templates, selectedSceneId]);

  const templateVersions = useMemo(() => {
    if (!selectedTemplateId) return [];
    return getTemplateVersions(selectedTemplateId);
  }, [selectedTemplateId, getTemplateVersions]);

  const generatedContent = useMemo(() => {
    if (!selectedTemplate) return '';
    let content = selectedTemplate.content;
    content = content.replace(/\{\{订单状态\}\}/g, variables.orderStatus);
    content = content.replace(/\{\{寄回方式\}\}/g, variables.returnMethod);
    content = content.replace(/\{\{热线电话\}\}/g, variables.hotline);
    return content;
  }, [selectedTemplate, variables]);

  const handleSceneSelect = (sceneId: string) => {
    setSelectedSceneId(sceneId);
    const sceneTpls = templates.filter(t => t.sceneId === sceneId);
    if (sceneTpls.length > 0) {
      setSelectedTemplateId(sceneTpls[0].id);
    } else {
      setSelectedTemplateId(null);
    }
  };

  const handleTemplateSelect = (template: ComfortTemplate) => {
    setSelectedTemplateId(template.id);
    setSelectedVersionId(null);
  };

  const handleOrderStatusChange = () => {
    Taro.showActionSheet({
      itemList: orderStatusOptions.map(o => o.label),
      success: (res) => {
        setVariables(prev => ({
          ...prev,
          orderStatus: orderStatusOptions[res.tapIndex].value,
        }));
      },
    });
  };

  const handleReturnMethodChange = () => {
    Taro.showActionSheet({
      itemList: returnMethodOptions.map(o => o.label),
      success: (res) => {
        setVariables(prev => ({
          ...prev,
          returnMethod: returnMethodOptions[res.tapIndex].value,
        }));
      },
    });
  };

  const handleHotlineEdit = () => {
    Taro.showModal({
      title: '编辑热线电话',
      editable: true,
      placeholderText: '请输入客服热线',
      content: variables.hotline,
      success: (res) => {
        if (res.confirm && res.content) {
          setVariables(prev => ({ ...prev, hotline: res.content }));
        }
      },
    });
  };

  const handleCopy = () => {
    if (!generatedContent) {
      Taro.showToast({ title: '请先选择话术模板', icon: 'none' });
      return;
    }
    Taro.setClipboardData({
      data: generatedContent,
      success: () => {
        Taro.showToast({ title: '已复制到剪贴板', icon: 'success' });
      },
      fail: (err) => {
        console.error('[QuickComfort] 复制失败:', err);
        Taro.showToast({ title: '复制失败', icon: 'none' });
      },
    });
  };

  const handleEditTemplate = () => {
    if (!selectedTemplate) {
      Taro.showToast({ title: '请先选择话术模板', icon: 'none' });
      return;
    }
    setEditingTitle(selectedTemplate.title);
    setEditingContent(selectedTemplate.content);
    setShowEditModal(true);
  };

  const handleViewVersions = () => {
    if (!selectedTemplate) {
      Taro.showToast({ title: '请先选择话术模板', icon: 'none' });
      return;
    }
    setShowVersionModal(true);
    setSelectedVersionId(null);
  };

  const handleSaveTemplate = () => {
    if (!selectedTemplate) return;
    if (!editingTitle.trim()) {
      Taro.showToast({ title: '请输入模板标题', icon: 'none' });
      return;
    }
    if (!editingContent.trim()) {
      Taro.showToast({ title: '请输入模板内容', icon: 'none' });
      return;
    }
    updateTemplateContent(selectedTemplate.id, editingContent.trim(), editingTitle.trim());
    setShowEditModal(false);
    Taro.showToast({ title: '模板已保存', icon: 'success' });
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
  };

  const handleCloseVersionModal = () => {
    setShowVersionModal(false);
    setSelectedVersionId(null);
  };

  const handleVersionSelect = (versionId: string) => {
    setSelectedVersionId(prev => prev === versionId ? null : versionId);
  };

  const handleRevertVersion = (version: TemplateVersion) => {
    if (!selectedTemplate) return;
    Taro.showModal({
      title: '确认恢复',
      content: `确定要将模板恢复到"${version.title}"版本吗？\n\n恢复后当前内容会被覆盖，但会保存为新版本记录。`,
      success: (res) => {
        if (res.confirm) {
          revertTemplateToVersion(selectedTemplate.id, version.id);
          setSelectedVersionId(null);
          Taro.showToast({ title: '版本已恢复', icon: 'success' });
        }
      },
    });
  };

  const insertVariable = (varName: string) => {
    setEditingContent(prev => prev + `{{${varName}}}`);
  };

  const categoryScenes = useMemo(() => {
    const categories: CommentCategory[] = ['safety', 'refund', 'distrust'];
    return categories.map(cat => ({
      category: cat,
      scenes: comfortScenes.filter(s => s.category === cat),
    }));
  }, []);

  return (
    <ScrollView scrollY className={styles.pageContainer}>
      <View className={styles.headerSection}>
        <Text className={styles.pageTitle}>快捷安抚</Text>
        <Text className={styles.pageSubtitle}>选择场景与话术，快速生成专业回复</Text>
      </View>

      <View className={styles.contentSection}>
        <Text className={styles.sectionTitle}>选择场景</Text>

        {categoryScenes.map(group => (
          <View key={group.category} style={{ marginBottom: 16 }}>
            <View style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
              <CategoryTag category={group.category} size="sm" />
            </View>
            <View className={styles.sceneTabs}>
              {group.scenes.map(scene => (
                <View
                  key={scene.id}
                  className={classnames(
                    styles.sceneTab,
                    styles[scene.category],
                    selectedSceneId === scene.id && styles.active
                  )}
                  onClick={() => handleSceneSelect(scene.id)}
                >
                  <Text className={styles.sceneText}>{scene.name}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        <View className={versionStyles.sectionHeader}>
          <Text className={styles.sectionTitle}>选择话术模板</Text>
          {selectedTemplate && (
            <Button className={versionStyles.versionBtn} onClick={handleViewVersions}>
              <Text className={versionStyles.versionBtnText}>📜 版本记录 ({templateVersions.length})</Text>
            </Button>
          )}
        </View>
        <View className={styles.templateList}>
          {sceneTemplates.length > 0 ? sceneTemplates.map(template => (
            <View
              key={template.id}
              className={classnames(
                styles.templateCard,
                selectedTemplateId === template.id && styles.selected
              )}
              onClick={() => handleTemplateSelect(template)}
            >
              <View className={styles.templateHeader}>
                <Text className={styles.templateTitle}>{template.title}</Text>
              </View>
              <View className={styles.templateVars}>
                {template.variables.map((v, idx) => (
                  <View key={idx} className={styles.varTag}>
                    <Text className={styles.varText}>{v}</Text>
                  </View>
                ))}
              </View>
              <Text className={styles.templatePreview}>{template.content}</Text>
            </View>
          )) : (
            <View style={{ padding: 48, textAlign: 'center' }}>
              <Text style={{ fontSize: 28, color: '#86909C' }}>该场景暂无话术模板</Text>
            </View>
          )}
        </View>

        <Text className={styles.sectionTitle}>补充信息</Text>
        <View className={styles.variablesSection}>
          <View className={styles.variableItem}>
            <Text className={styles.varLabel}>订单状态</Text>
            <Text className={styles.varValue}>{variables.orderStatus}</Text>
            <Button className={styles.editBtn} onClick={handleOrderStatusChange}>
              <Text className={styles.editText}>修改</Text>
            </Button>
          </View>
          <View className={styles.variableItem}>
            <Text className={styles.varLabel}>寄回方式</Text>
            <Text className={styles.varValue}>{variables.returnMethod}</Text>
            <Button className={styles.editBtn} onClick={handleReturnMethodChange}>
              <Text className={styles.editText}>修改</Text>
            </Button>
          </View>
          <View className={styles.variableItem}>
            <Text className={styles.varLabel}>客服热线</Text>
            <Text className={styles.varValue}>{variables.hotline}</Text>
            <Button className={styles.editBtn} onClick={handleHotlineEdit}>
              <Text className={styles.editText}>修改</Text>
            </Button>
          </View>
        </View>

        <Text className={styles.sectionTitle}>预览效果</Text>
        <View className={styles.previewSection}>
          <Text className={styles.previewTitle}>
            {selectedTemplate?.title || '请选择话术模板'}
          </Text>
          <Text className={styles.previewContent}>
            {generatedContent || '请选择话术模板并补充信息'}
          </Text>
        </View>
      </View>

      <View style={{ height: 200 }} />

      <View className={styles.actionBar}>
        <Button className={classnames(styles.actionBtn, styles.secondaryBtn)} onClick={handleEditTemplate}>
          <Text className={styles.btnText}>编辑模板</Text>
        </Button>
        <Button className={classnames(styles.actionBtn, styles.primaryBtn)} onClick={handleCopy}>
          <Text className={styles.btnText}>复制话术</Text>
        </Button>
      </View>

      {showEditModal && (
        <View className={editStyles.modalOverlay}>
          <View className={editStyles.modalContent}>
            <View className={editStyles.modalHeader}>
              <Text className={editStyles.modalTitle}>编辑话术模板</Text>
              <View className={editStyles.closeBtn} onClick={handleCloseEditModal}>
                <Text className={editStyles.closeText}>✕</Text>
              </View>
            </View>

            <ScrollView scrollY className={editStyles.modalBody}>
              <View className={editStyles.formItem}>
                <Text className={editStyles.formLabel}>模板标题</Text>
                <Input
                  className={editStyles.formInput}
                  value={editingTitle}
                  onInput={(e) => setEditingTitle(e.detail.value)}
                  placeholder="请输入模板标题"
                  placeholderClass={editStyles.inputPlaceholder}
                />
              </View>

              <View className={editStyles.formItem}>
                <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text className={editStyles.formLabel}>模板内容</Text>
                </View>
                <View className={editStyles.varInsertRow}>
                  <Text className={editStyles.varHint}>点击插入变量：</Text>
                  <View className={editStyles.varBtns}>
                    {['订单状态', '寄回方式', '热线电话'].map(v => (
                      <View
                        key={v}
                        className={editStyles.varInsertBtn}
                        onClick={() => insertVariable(v)}
                      >
                        <Text className={editStyles.varInsertText}>{v}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <Textarea
                  className={editStyles.formTextarea}
                  value={editingContent}
                  onInput={(e) => setEditingContent(e.detail.value)}
                  placeholder="请输入模板内容，可使用{{订单状态}}、{{寄回方式}}、{{热线电话}}等变量"
                  placeholderClass={editStyles.inputPlaceholder}
                  maxlength={2000}
                  autoHeight
                />
              </View>
            </ScrollView>

            <View className={editStyles.modalFooter}>
              <Button
                className={classnames(editStyles.modalBtn, editStyles.modalBtnCancel)}
                onClick={handleCloseEditModal}
              >
                <Text className={editStyles.modalBtnCancelText}>取消</Text>
              </Button>
              <Button
                className={classnames(editStyles.modalBtn, editStyles.modalBtnConfirm)}
                onClick={handleSaveTemplate}
              >
                <Text className={editStyles.modalBtnConfirmText}>保存</Text>
              </Button>
            </View>
          </View>
        </View>
      )}

      {showVersionModal && (
        <View className={versionStyles.modalOverlay}>
          <View className={versionStyles.modalContent}>
            <View className={versionStyles.modalHeader}>
              <Text className={versionStyles.modalTitle}>版本历史记录</Text>
              <View className={versionStyles.closeBtn} onClick={handleCloseVersionModal}>
                <Text className={versionStyles.closeText}>✕</Text>
              </View>
            </View>

            <View className={versionStyles.modalSubtitle}>
              <Text className={versionStyles.subtitleText}>
                {selectedTemplate?.title || ''} · 共 {templateVersions.length} 个版本
              </Text>
            </View>

            <ScrollView scrollY className={versionStyles.modalBody}>
              {templateVersions.length > 0 ? (
                <View className={versionStyles.versionList}>
                  {templateVersions.map((version, index) => (
                    <View key={version.id}>
                      <View
                        className={classnames(
                          versionStyles.versionItem,
                          index === 0 && versionStyles.versionItemCurrent,
                          selectedVersionId === version.id && versionStyles.versionItemSelected
                        )}
                        onClick={() => handleVersionSelect(version.id)}
                      >
                        <View className={versionStyles.versionHeader}>
                          <View className={versionStyles.versionInfo}>
                            <View className={versionStyles.versionBadge}>
                              <Text className={versionStyles.versionBadgeText}>
                                {index === 0 ? '当前' : `V${templateVersions.length - index}`}
                              </Text>
                            </View>
                            <Text className={versionStyles.versionType}>
                              {changeTypeTextMap[version.changeType]}
                            </Text>
                            <Text className={versionStyles.versionTime}>{version.createTime}</Text>
                          </View>
                          <View className={versionStyles.versionOperator}>
                            <Text className={versionStyles.operatorText}>{version.operator}</Text>
                          </View>
                        </View>

                        {selectedVersionId === version.id && (
                          <View className={versionStyles.versionDetail}>
                            <View className={versionStyles.detailSection}>
                              <Text className={versionStyles.detailLabel}>模板标题</Text>
                              <Text className={versionStyles.detailContent}>{version.title}</Text>
                            </View>
                            <View className={versionStyles.detailSection}>
                              <Text className={versionStyles.detailLabel}>模板内容</Text>
                              <View className={versionStyles.detailContentBox}>
                                <Text className={versionStyles.detailContent}>{version.content}</Text>
                              </View>
                            </View>
                            {index !== 0 && (
                              <View className={versionStyles.versionActions}>
                                <Button
                                  className={versionStyles.revertBtn}
                                  onClick={() => handleRevertVersion(version)}
                                >
                                  <Text className={versionStyles.revertBtnText}>恢复到此版本</Text>
                                </Button>
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                      {index < templateVersions.length - 1 && (
                        <View className={versionStyles.versionDivider} />
                      )}
                    </View>
                  ))}
                </View>
              ) : (
                <View className={versionStyles.emptyState}>
                  <Text className={versionStyles.emptyIcon}>📝</Text>
                  <Text className={versionStyles.emptyText}>暂无版本记录</Text>
                  <Text className={versionStyles.emptyHint}>编辑保存模板后，会自动记录版本历史</Text>
                </View>
              )}
            </ScrollView>

            <View className={versionStyles.modalFooter}>
              <Button
                className={classnames(versionStyles.footerBtn, versionStyles.footerBtnPrimary)}
                onClick={handleCloseVersionModal}
              >
                <Text className={versionStyles.footerBtnText}>关闭</Text>
              </Button>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

export default QuickComfortPage;
