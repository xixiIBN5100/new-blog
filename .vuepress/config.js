module.exports = {
  "title": "离谱的blog",
  "description": "前端在学的小萌新",
  "dest": "public",
  "head": [
    [
      "link",
      {
        "rel": "icon",
        "href": "/avatar.jpg"
      }
    ],
    [
      "meta",
      {
        "name": "viewport",
        "content": "width=device-width,initial-scale=1,user-scalable=no"
      }
    ]
  ],
  "theme": "reco",
  "themeConfig": {
    "valineConfig": {
      appId: 'RyKSlaSLcAGEpKNMu60PZV6Y-gzGzoHsz',// your appId
      appKey: 'eY7fJ4DSGCVsKX5h21jl3thH', // your appKey
    },
    "nav": [
      {
        "text": "主页",
        "link": "/",
        "icon": "reco-home"
      },
      {
        "text": "时间线",
        "link": "/timeline/",
        "icon": "reco-date"
      },
      {
        "text": "联系",
        "icon": "reco-message",
        "items": [
          {
            "text": "GitHub",
            "link": "https://github.com/xixiIBN5100",
            "icon": "reco-github"
          }
        ]
      }
    ],
    "sidebar": {
      "/docs/theme-reco/": [
        "",
        "theme",
        "plugin",
        "api"
      ]
    },
    "type": "blog",
    "blogConfig": {
      "category": {
        "location": 2,
        "text": "分类"
      },
      "tag": {
        "location": 3,
        "text": "标签"
      }
    },
    "friendLink": [
      {
        "title": "桑葚",
        "desc": "桑葚的后花园",
        "link": " https://blog.mulberror.top",
        "avatar": " https://blog.mulberror.top/img/avatar.png"
      },
      {
        "title": "望舒",
        "desc": "望舒的blog",
        "link": "blog.phlin.top"
      },
      {
        "title": "浅浅",
        "desc": "浅浅のblog",
        "link": "https://qianqianzyk.top"
      }
    ],
    "logo": "/logo.png",
    "search": true,
    "searchMaxSuggestions": 10,
    "lastUpdated": "Last Updated",
    "author": "离谱",
    "authorAvatar": "/avatar.jpg",
    "record": "0000",
    "startYear": "2023"
  },
  "markdown": {
    "lineNumbers": true
  },
  plugins: [
    ['rss-feed',
      {
        username: 'lip',
        hostname: 'https://blog.liip.fun',
        selector: '.content__post', // extract content to content:encoded
        count: 200,
        filter: (page) => /^blogs/.test(page.relativePath),
      },
    ],
    [
      '@vuepress-reco/vuepress-plugin-kan-ban-niang',{
      theme: [
          'whiteCat', 'haru1', 'haru2', 'haruto', 'koharu', 'izumi', 'shizuku', 'wanko', 'blackCat', 'z16'
      ],
      clean: false,
      messages: {
        welcome: '靠谱!', home: '离谱不离谱', theme: '好吧，希望你能喜欢我的其他小伙伴。', close: '你不喜欢我了吗？痴痴地望着你。'
      },
      messageStyle: { right: '68px', bottom: '290px' },
      width: 250,
      height: 320
    }
    ],
    ['@vuepress-reco/vuepress-plugin-bulletin-popover', {
      title: '公告',
      body: [
        {
          type: 'text',
          content: '感谢你来看我的blog 🎉🎉🎉',
          style: 'text-align: center;',
        },
        {
          type: 'title',
          content: '欢迎评论!',
          style: 'text-align: center;'
        }
      ],
    }],
    [
      "vuepress-plugin-cursor-effects",
      {
        size: 2,                    // size of the particle, default: 2
        shape: 'circle',  // shape of the particle, default: 'star'
        zIndex: 999999999           // z-index property of the canvas, default: 999999999
      }
    ],
    ["ribbon-animation", {
      size: 90,   // 默认数据
      opacity: 0.3,  //  透明度
      zIndex: -1,   //  层级
      opt: {
        // 色带HSL饱和度
        colorSaturation: "80%",
        // 色带HSL亮度量
        colorBrightness: "60%",
        // 带状颜色不透明度
        colorAlpha: 0.65,
        // 在HSL颜色空间中循环显示颜色的速度有多快
        colorCycleSpeed: 6,
        // 从哪一侧开始Y轴 (top|min, middle|center, bottom|max, random)
        verticalPosition: "center",
        // 到达屏幕另一侧的速度有多快
        horizontalSpeed: 200,
        // 在任何给定时间，屏幕上会保留多少条带
        ribbonCount: 2,
        // 添加笔划以及色带填充颜色
        strokeSize: 0,
        // 通过页面滚动上的因子垂直移动色带
        parallaxAmount: -0.5,
        // 随着时间的推移，为每个功能区添加动画效果
        animateSections: true
      },
      ribbonShow: false, //  点击彩带  true显示  false为不显示
      ribbonAnimationShow: true  // 滑动彩带
    }]
  ],
  locales: {
    '/': {
      lang: 'zh-CN'
    }
  },
}