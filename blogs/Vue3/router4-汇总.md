---
title: router4 汇总 (p1)
date: 2024-07-06 23:26:19
tags: [router4]
categories:
  - Vue3
---

## 命名视图

命名视图视图可以在同一级（同一个组件） 中展示更多的路由视图，而不是嵌套显示。命名视图可以让一个组件中具有多个路由渲染出口，这对于一些特定的布局组件非常有用。命名视图的概念非常类似于“具名插槽”，并且视图的默认名称也是 default。
一个视图使用一个组件渲染，因此对于同个路由，多个视图就需要多个组件。确保正确使用components 配置（带上s)

<!--more-->

```ts
const routes = [
    {
        path: '/user1',
        components: {
            default: () => import("../componts/A.vue")
        }
    },
    {
        path: '/user2',
        components: {
            bbb: () => import("../componts/B.vue"),
            ccc: () => import("../componts/C.vue")
        }
    }

]
```

```html
<router-view></router-view>
<router-view name="bbb"></router-view>
<router-view name="ccc"></router-view>
```
以上路由配置会在 /user1 路径下渲染 A 组件，而 /user2 路径下渲染 B 和 C 组件。

## 重定向

### 字符串形式  

```ts
const routes = [
    {
        path: '/user',
        redirect: '/user/login'
    }
]
```

### 对象形式  

```ts
const routes = [
    {
        path: '/user',
        redirect: {
            path: '/user/login',
            query: {
                id: '123'
            }
        }
    }
]
```

这种形式可以用路由传参，比如：/user?id=123  
### 函数形式
```ts
const routes = [
    {
        path: '/user',
        redirect:to => {
            return {
                path: '/user/login',
                query: {
                    id: '123'
                }
            }
        }
    }
]
```
to函数包含路由信息，可以获取到路由参数，比如：to.query.i=123

## 路由元信息  
通过路由记录的 meta 屬性可以定义路由的元信息。使用路由元信息可以在路由中附加自定义的数据，例如：
- 权限校验标识。
- 路由组件的过渡名称。
- 路由组件持久化缓存(keep-alive）的相关配置。
- 标题名称  

我们可以在导航守卫或者是路由对象中访问路由的元信息数据。  

```ts
// 声明类型否则读meta类型是unknow
declare module 'vue-router' {
    interface RouteMeta {
        title: string;
    }
}

const routes = [
    {
        path: '/user1',
        component: () => import("../componts/Login.vue"),
        meta: {
            title: '登录'
        }
    },
    {
        path: '/user2',
        component: () => import("../componts/Home.vue"),
        meta: {
            title: '首页'
        }
    }

]
```

在路由前守卫设置标题
```ts
router.beforeEach((to, from, next) => {
    document.title = to.meta.title;
    next();
})
```

p2明天写QAQ ~~还要抽一天摸一篇路由守卫~~

>写于西13