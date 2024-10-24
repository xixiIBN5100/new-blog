---
title: 深入Vue3的Teleport组件
date: 2024/10/24
tags: [ Vue源码, 组件 ]
sidebar: 'auto'
categories:
  - Vue3
---

## Teleport组件解决的问题

一般情况下,在将虚拟DOM渲染为真实DOM时,最终渲染的真实DOM的层级结构与虚拟DOM的层级结构一致.Vue3新增的Teleport组件可以将指定内容渲染到特定容器中,不受DOM层级的限制.  
```vue
<template>
  <Teleport to="body">
    <!--蒙层组件-->
    <div class="overlay">teleport</div>
  </Teleport>
</template>

<style>
  .overlay {
    z-index: 9999;
  }
</style>
```

这样一来,Overlay组件作为Teleport组件的插槽,通过to属性值,Teleport组件会直接把插槽内容渲染到body下,实现了跨DOM层级的渲染.

## 实现Teleport组件

显然.Teleport组件也需要渲染器的底层支持.首先我们要将Teleport组件的的渲染逻辑从渲染器中分离出来,有两点好处. 

- 避免渲染器代码膨胀
- 当用户没有使用Teleport组件时,由于Teleport组件的渲染逻辑被分离,可以利用TreeShaking机制在最终的bundle中删除Teleport相关代码,减小包体积

完成逻辑分离工作需要修改patch函数.

```js
function patch (n1, n2, container, parentComponent, anchor) {
    const { type } = n2
    
    if (typeof type === 'string') {
        // ...
    } else if (typeof type === 'object' && type.__isTeleport) {
        // 组件选项中存在标识
        // 调用teleport组件选项的process函数移交渲染控制权
        type.process(n1, n2, container, anchor, {
            patch,
            patchChildren,
            unmount,
            move(vnode, container, anchor) {
                insert(vnode.component ? vnode.component.subTree.el : vnode.el, container, anchor)
            }
        })
    }
}
```

Teleport组件的定义如下
```js
const Teleport = {
     __isTeleport: true,
    proces(n1,n2,container,anchor) {
         // 处理渲染逻辑
    }
}
```

通常,一个组件的子节点会被编译为插槽内容,对于Teleport组件,直接将其子节点编译为一个数组即可.
```js
function render() {
    return {
        type: 'Teleport',
        children: [
            h('div', 'teleport'),
            h('div', 'teleport')
        ]
    }
}
```

明确好虚拟DOM的结构,我们可以来实现Teleport组件的渲染逻辑. 
```js
const Teleport = {
    __isTeleport: true,
    process(n1,n2,container,anchor,internal) {
        const { patch } = internal
        
        if(!n1) {
            // 挂载动作
            const target = typeof n2.props.to === 'string' ? document.querySelector(n2.props.to) : n2.props.to
            
            n2.children.forEach(c => patch(null, c, target, anchor))
        } else {
            // 更新动作
            patchChildren(n1, n2, container)
            // to属性如果发生变化
            if (n2.props.to !== n1.props.to) {
                const target = typeof n2.props.to === 'string' ? document.querySelector(n2.props.to) : n2.props.to
                n2.children.forEach(c => move(c, target))
            }
        }
    }
}
```