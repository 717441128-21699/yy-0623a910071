import React from 'react';
import { View, Text, Image, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import RiskTag from '@/components/RiskTag';
import CategoryTag from '@/components/CategoryTag';
import { Comment } from '@/types';
import styles from './index.module.scss';

interface CommentCardProps {
  comment: Comment;
  showActions?: boolean;
  onEscalate?: (comment: Comment) => void;
  onQuickReply?: (comment: Comment) => void;
}

const typeTextMap = {
  bad: '差评',
  question: '追问',
  review: '晒单',
};

const CommentCard: React.FC<CommentCardProps> = ({
  comment,
  showActions = true,
  onEscalate,
  onQuickReply,
}) => {
  const handleEscalate = () => {
    if (onEscalate) {
      onEscalate(comment);
    } else {
      Taro.showToast({ title: '已升级工单', icon: 'success' });
    }
  };

  const handleQuickReply = () => {
    if (onQuickReply) {
      onQuickReply(comment);
    } else {
      Taro.switchTab({ url: '/pages/quick-comfort/index' });
    }
  };

  return (
    <View className={styles.commentCard}>
      <View className={styles.cardHeader}>
        <View className={styles.userInfo}>
          <Image
            className={styles.avatar}
            src={comment.userAvatar}
            mode="aspectFill"
          />
          <View className={styles.userMeta}>
            <View className={styles.userNameRow}>
              <Text className={styles.nickname}>{comment.userNickname}</Text>
              {comment.isMediaAccount && (
                <View className={styles.mediaBadge}>
                  <Text className={styles.mediaText}>媒体</Text>
                </View>
              )}
            </View>
            <Text className={styles.timeText}>{comment.createTime}</Text>
          </View>
        </View>
        <View className={styles.tagsRow}>
          <View className={classnames(styles.typeTag, styles[comment.type])}>
            <Text className={styles.typeText}>{typeTextMap[comment.type]}</Text>
          </View>
          <RiskTag level={comment.riskLevel} size="sm" />
        </View>
      </View>

      <View className={styles.cardBody}>
        <CategoryTag category={comment.category} size="sm" />
        <Text className={styles.content}>{comment.content}</Text>
        {comment.hasImage && (
          <View className={styles.imageHint}>
            <Text className={styles.imageText}>📷 含图片</Text>
          </View>
        )}
        {comment.repeatCount > 1 && (
          <View className={styles.repeatHint}>
            <Text className={styles.repeatText}>
              相似表述已出现 {comment.repeatCount} 次
            </Text>
          </View>
        )}
      </View>

      {showActions && (
        <View className={styles.cardFooter}>
          <Button
            className={classnames(styles.actionBtn, styles.secondaryBtn)}
            onClick={handleQuickReply}
          >
            <Text className={styles.btnText}>快捷安抚</Text>
          </Button>
          <Button
            className={classnames(styles.actionBtn, styles.primaryBtn)}
            onClick={handleEscalate}
          >
            <Text className={styles.btnTextPrimary}>升级工单</Text>
          </Button>
        </View>
      )}
    </View>
  );
};

export default CommentCard;
