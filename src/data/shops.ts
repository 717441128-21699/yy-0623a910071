import { Shop, Product, RecallBatch } from '@/types';

export const shops: Shop[] = [
  { id: 'shop1', name: '品牌官方旗舰店', platform: 'taobao' },
  { id: 'shop2', name: '京东自营店', platform: 'jd' },
  { id: 'shop3', name: '抖音官方旗舰店', platform: 'douyin' },
  { id: 'shop4', name: '拼多多官方旗舰店', platform: 'pdd' },
];

export const products: Product[] = [
  { id: 'prod1', name: '智能保温杯 Pro', image: 'https://picsum.photos/id/1/200/200', shopId: 'shop1' },
  { id: 'prod2', name: '便携电热水壶', image: 'https://picsum.photos/id/2/200/200', shopId: 'shop1' },
  { id: 'prod3', name: '智能保温杯 Pro', image: 'https://picsum.photos/id/1/200/200', shopId: 'shop2' },
  { id: 'prod4', name: '养生壶多功能款', image: 'https://picsum.photos/id/3/200/200', shopId: 'shop2' },
  { id: 'prod5', name: '智能保温杯 Pro', image: 'https://picsum.photos/id/1/200/200', shopId: 'shop3' },
  { id: 'prod6', name: '智能保温杯 Pro', image: 'https://picsum.photos/id/1/200/200', shopId: 'shop4' },
];

export const recallBatches: RecallBatch[] = [
  {
    id: 'batch1',
    name: '2024年3月批次',
    productId: 'prod1',
    startTime: '2024-03-01',
    endTime: '2024-03-31',
    description: '因密封圈材质问题启动召回',
  },
  {
    id: 'batch2',
    name: '2024年4月批次',
    productId: 'prod1',
    startTime: '2024-04-01',
    endTime: '2024-04-30',
    description: '因电池容量问题启动召回',
  },
  {
    id: 'batch3',
    name: '2024年3月批次',
    productId: 'prod2',
    startTime: '2024-03-15',
    endTime: '2024-04-15',
    description: '因温控器问题启动召回',
  },
];
