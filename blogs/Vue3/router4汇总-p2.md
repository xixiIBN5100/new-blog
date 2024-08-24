---
title: router4汇总(p2)
date: 2024-07-07 10:56:07
tags: [router4]
categories:
  - Vue3
---

## 路由过渡动画

```ts

const routes = [
    {
        path: '/user1',
        component: () => import("../componts/Login.vue"),
        meta: {
            title: '登录',
            transition: "animate_fadeIn"
        }
    },
    {
        path: '/user2',
        component: () => import("../componts/Home.vue"),
        meta: {
            title: '首页',
            transition: "animate_fadeOut"
        }
    }
 
]
```

<!--more-->

`App.vue`
```html
<router-view #default="{ route,Component }" >
    <transition :enter-active-class="route.meta.transition" >
        <component :is="Component" />
    </transition>
</router-view>

```

这样就能实现用过meta属性来控制路由的过度动画了,当然如果想使用同一种过度动画,可以在App.vue中配置过度动画  

## 滚动行为

```ts

const routes = [
    {
        path: '/user1',
        component: () => import("../componts/Login.vue"),
        scrollBehavior(to, from, savedPosition) {
            if (savedPosition) {
                return savedPosition
            } else {
                return { top: 0 }
            }
        }
       
    }
]
```

实现了保存上次滚动位置的功能  

## 动态路由

我们一般使用动态路由都是后台会返回一个路由表前端通过调接口拿到后处理(后端处理路由）   

主要使用的方法就是`router.addRoute`

```ts
const initRouter = async () => {
    const res = await getRouter()
    res.data.route.forEach((item: any) => {
        router.addRoute({
            path: item.path,
            name: item.name,
            component: () => import(`../componts/${item.component}.vue`),//使用字符串拼接匹配组件
        })
    })
}
```

这种操作可以用来鉴权,需要后端在JSON中返回路由表,然后前端根据后端返回的路由表来动态添加路由  

p2完结散花

[router4汇总(p1)](https://xixiibn5100.github.io/2024/07/06/router4-%E6%B1%87%E6%80%BB/)

> 写于西13
