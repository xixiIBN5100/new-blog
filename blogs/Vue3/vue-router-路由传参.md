---
title: vue--router 路由传参
date: 2024-07-05 22:02:43
tags: [router4]
categories:
  - Vue3
---


## 路由传参
跨页面传参的一种方式

<!--more-->

### 使用path和query传参
这种方式传输的数据会展示到url上面去  

传输方
```ts   
const router = useRouter()

router.push({
    path: '/user',
    query: {
        id: 1,
    }//只能接收一个对象
})
```

接收方
```ts
const route = useRoute()

console.log(route.query.id) //拿到id

```

### 使用name和params传参
这种方式传输的数据不会展示到url上面去,储存在内存之中,刷新页面会导致参数丢失

传输方
```ts
const router = useRouter()

router.push({
    name: 'user',
    params: {
        id: 1,
    }
})

```

接收方
```ts
const route = useRoute()

console.log(route.params.id) //拿到id

```

改进的方法是使用动态路由参数,动态路由之后单独开一篇讲 ~~挖坑~~  

好久没更新了,忙着期末周和搬家,虽然还在军训但也算是稳定下来了,看看能不能多写写吧

>写于西13

