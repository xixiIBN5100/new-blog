---
title: 深入Vue3的KeepAlive组件
date: 2024/10/23
tags: [Vue源码,组件]
sidebar: 'auto'
categories:
  - Vue3
---

## 组件的激活与失活

`keep-alive`组件的实现需要渲染器层面的支持.被KeepAlive包裹的组件在卸载的时候,我们不能把它真正卸载,而是从原容器搬运到一个隐藏的容器中..   
同样,当组件被挂载的时候,执行的也不是真正的挂载逻辑,而是从隐藏的容器搬运到原容器中.这个两个过程对应到组件的生命周期,就是`activated`和`deactivated`.

一个基本的KeepAlive组件的实现并不困难: 
```js
const KeepAlive = {
    // KeepAlive组件独有的属性
    __isKeepAlive: true,
    setup(props, { slots }) {
        // 常见一个缓存对象
        // key: vnode.type
        // value: vnode
        const cache = new Map()
        // 当前KeepAlive组件的实例
        const instance = currentInstance
        // KeepAlive组件的实例上存在特殊的keepAliveCtx对象,这个对象是渲染器注入的
        // 该对象会暴露渲染器的一些内部方法, move函数是用来将一段dom移动到另一个容器中的
        const { move, creatElement } = instance.keepAliveCtx
        
        // 创建隐藏容器
        const storageContainer = creatElement('div')
        
        // KeepAlive实例上会被添加两个内部函数,着两个函数会在渲染器中调用
        instance._deActivate = (vnode) => {
            move(vnode, storageContainer)
        }
        instance._activate = (vnode, container, anchor) => {
            move(vnode, container, anchor)
        }
        return () => {
            // 获取插槽内容
            const rawVNode = slots.default()
            // 如果不是组件,直接渲染
            if (!isVNode(rawVNode)) return rawVNode
            
            // 在挂载之前先获取缓存的vnode
            const cachedVNode = cache.get(rawVNode.type)
            
            if(cachedVNode) {
                //  命中缓存,继承实例
                rawVNode.component = cachedVNode.component
                // 添加标记避免渲染器重新挂载
                rawVNode.keptAlive = true
            } else {
                // 没有命中则设置缓存
                cache.set(rawVNode.type, rawVNode)
            }
            // 添加标记避免渲染器卸载
            rawVNode.shouldKeepAlive = true
            // 将KeepAlive组件实例添加到vnode上,便于渲染器访问
            rawVNode.keepAliveInstance = instance
        }
    }
}
```

- shouldKeepAlive 该属性会被添加在内部组件的vnode上,当渲染器卸载这个组件的时候,可以通过这个检查来判断是否需要卸载组件.

```js
function unmount(vnode) {
    if(vnode.shouldKeepAlive) {
        vnode.keepAliveInstance._deActivate(vnode)
    } else {
        unmountComponent(vnode)
    }
}
```

- keptAlive 该属性会被添加在内部组件的vnode上,当渲染器挂载这个组件的时候,可以通过这个检查来判断是否需要挂载组件.
```js
if(vnode.keptAlive) {
    vnode.keepAliveInstance._activate(vnode, container, anchor)
} else {
    mountComponent(vnode, container, anchor)
}
```

- 渲染器注入keepAliveCtx对象
```js
function mountedComponent(vnode, container, anchor) {
    const instance = {
        state,
        props:shallowReactive(props),
        isMounted: false,
        subTree: null,
        slots,
        mounted: [],
        keepAliveCtx: null
    }
    
    const isKeepAlive = vnode.type.__isKeepAlive
    if(isKeepAlive) {
        // 命中
        instance.keepAliveCtx = {
            move(vnode, container, anchor) {
                // 将组件渲染的内容移动到指定容器中
                insert(vnode.component.subTree.el, container, anchor)
            },
            creatElement
        }
    }
}
```

## KeepAlive的include和exclude属性

在默认情况下,KeepAlive组件会缓存所有的子组件,但是可以通过include和exclude属性来控制哪些组件会被缓存.  

include用来显示制定哪些组件会被缓存,exclude用来指定哪些组件不会被缓存.  

为了简化问题,我们只允许为include和exclude设置正则表达式.在KeepAlive挂载的时候,会根据内部组件的name进行匹配.  

```js
const cache = new Map()
const KeepAlive = {
    __isKeepAlive: true,
    props: {
        include: RegExp,
        exclude: RegExp
    },
    setup(props, { slots }) {
        // ...
        return () => {
            const rawVNode = slots.default()
            if (!isVNode(rawVNode)) return rawVNode
            // 获取name
            const name = rawVNode.type.name
            if (name && (
                (props.include && !props.include.test(name)) ||
                (props.exclude && props.exclude.test(name))
            )) {
                // 无法被匹配
                return rawVNode
            }
        }
    }
}
```

## 缓存处理

前文给出的实现中,我们使用一个Map对象来实现对组件的缓存.  

如果缓存不存在的时候,我们总是设置新的缓存.这会导致缓存不断增加,极端情况下会占用大量内存.我们必须设置一个缓存阀值.当缓存超过阀值时,我们要对缓存进行修剪.  

Vue3所采取的修剪策略是 "最新一次访问". 首先我们为缓存设置一个最大容量,通过max属性设置.   
```html
<keep-alive :max="2">
    <component :is="component"></component>
</keep-alive>
```

我们设置了最大缓存量为2,假设我们有三个组件,并且他们都会被缓存,我们模拟一下组件切换过程中的缓存变化

- 初始渲染Comp1并缓存,此时缓存队列为[Comp1], 并且最新一次访问的组件是Comp1
- 切换到Comp2,此时缓存队列为[Comp1, Comp2], 最新一次访问的组件是Comp2
- 切换到Comp3,此时缓存队列已满,需要修剪缓存.因为当前最新一次访问的组件是Comp2.所以它是安全的,即Comp1组件的缓存会被修剪,修剪完毕后的空间会用来存储Comp3的缓存.所以现在的缓存队列是[Comp2, Comp3], 并且最新一次访问的组件是Comp3  

Vue3缓存策略的核心在把当前访问的组件作为最新一次访问的组件, 并且该组件在缓存修剪过程中始终是安全的.