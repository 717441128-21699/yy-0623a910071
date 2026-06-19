export default defineAppConfig({
  pages: [
    'pages/comment-patrol/index',
    'pages/quick-comfort/index',
    'pages/escalation-ticket/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTitleText: '舆情管理',
    navigationBarTextStyle: 'black'
  },
  tabBar: {
    color: '#86909c',
    selectedColor: '#165dff',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/comment-patrol/index',
        text: '评论巡检'
      },
      {
        pagePath: 'pages/quick-comfort/index',
        text: '快捷安抚'
      },
      {
        pagePath: 'pages/escalation-ticket/index',
        text: '升级工单'
      }
    ]
  }
})
