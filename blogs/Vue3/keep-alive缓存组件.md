---
title: keep-alive缓存组件
date: 2024-04-25 20:07:08
tags: [组件]
sidebar: 'auto'
categories:
  - Vue3
---

## keep-alive缓存组件

### 使用场景
当用户切换Tab页的时候,我们需要缓存住用户已经输入的信息,当切换回来的时候不让已经填写的数据清空,就使用keep-alive缓存组件  

<!--more-->

### 代码样例

```vue
<template>
  <keep-alive>
    <A v-if="flag"></A>
    <B v-else></B>
  </keep-alive>
</template>

<script>
  const flag = ref('false')//当flag发生改变的时候,组件切换
</script>
```

keep-alive缓存组件默认缓存中间的所有组件,但是在任何时候keep-alive内部只能有一个组件**加载**(意思就是不用v-if中间就只能写一个组件)  

同时keep-alive支持两种动态绑定 :include="['A']" 和 :exclude="['B']" ,中间填写组件,作用即名字  


### 生命周期

被keep-alive缓存组件包裹的组件会增加两个生命周期 onActivated 和 onDeactivated   

当页面首次加载的时候,会触发一次onMounted钩子和onActivated钩子,切换组件的时候,会触发onDeactivated钩子  

当再次切换回来到缓存组件的时候,只触发onActivated钩子,所以,在使用keep-alive缓存组件的组件中,只需要页面初始化进行一次的操作应该放在onMounted钩子中,而每一次切换到该页面都需要进行的操作应该放在onDeactivated钩子中

### 一点点源码
缓存组件的机制就是“卸载”的时候调用move函数把当前组件存储在一个临时容器中,当再次回来就从容器中拿回来  

**为什么keep-alive缓存组件不会被销毁和再次创建呢?**  

在keep-alive缓存组件中,他的子节点的vnode.shapeFlag会被打上512静态标记,就不会走挂载和卸载操作啦

>写于综合阅览室