import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import CategoryTag from '@/components/CategoryTag';
import { comfortScenes, comfortTemplates } from '@/data/templates';
import { CommentCategory, ComfortTemplate } from '@/types';
import styles from './index.module.scss';

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

const QuickComfortPage: React.FC = () => {
  const [selectedSceneId, setSelectedSceneId] = useState('s1');
  const [selectedTemplate, setSelectedTemplate] = useState<ComfortTemplate | null>(comfortTemplates[0]);
  const [variables, setVariables] = useState<VariableValues>({
    orderStatus: '已签收',
    returnMethod: '顺丰到付',
    hotline: '400-888-8888',
  });

  const currentScene = useMemo(() => {
    return comfortScenes.find(s => s.id === selectedSceneId);
  }, [selectedSceneId]);

  const sceneTemplates = useMemo(() => {
    return comfortTemplates.filter(t => t.sceneId === selectedSceneId);
  }, [selectedSceneId]);

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
    const templates = comfortTemplates.filter(t => t.sceneId === sceneId);
    if (templates.length > 0) {
      setSelectedTemplate(templates[0]);
    } else {
      setSelectedTemplate(null);
    }
  };

  const handleTemplateSelect = (template: ComfortTemplate) => {
    setSelectedTemplate(template);
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
        console.log('[QuickComfort] 复制话术成功');
      },
      fail: (err) => {
        console.error('[QuickComfort] 复制失败:', err);
        Taro.showToast({ title: '复制失败', icon: 'none' });
      },
    });
  };

  const handleEditTemplate = () => {
    Taro.showToast({ title: '模板编辑功能开发中', icon: 'none' });
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

        <Text className={styles.sectionTitle}>选择话术模板</Text>
        <View className={styles.templateList}>
          {sceneTemplates.map(template => (
            <View
              key={template.id}
              className={classnames(
                styles.templateCard,
                selectedTemplate?.id === template.id && styles.selected
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
          ))}
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
    </ScrollView>
  );
};

export default QuickComfortPage;
