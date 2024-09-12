---
title: Vue的设计与实现——组件的实现原理(p1)
date: 2024/9/12
tags: [Vue源码,组件]
sidebar: 'auto'
categories:
  - Vue3
---

在编写比较复杂的页面的时候,用来描述页面结构的虚拟DOM的代码量会变得越来越多.这时候我们就需要用组件来封装一些公共的结构,这样在页面中就可以复用这些公共的结构了.  

## 渲染组件
渲染器会使用虚拟节点的type属性来区分其属性,对与不同节点类型的节点,需要不同的方法进行挂载和更新.  

对于组件来说也是一样的,比如:  
```js
const vnode = {
    type: MyComponent
    //....
}
```
同样的,我们需要在patch函数中新开一个分支处理.  

```js
function patch(n1, n2, container, anchor) {
    if(n1 && n1.type !== n2.type) {
        unmount(n1)
        n1 =null
    }
    const { type } = n2
    if(typeof type === 'string') {
        //
    } else if(type === Text) {
        //...
    } else if(type == Fragment) {
        //...
    } else if(typeof type === 'object') {
        //作为组件处理
        if(!n1) {
            mountComponent(n2, container, anchor)
        } else {
            //更新组件
            updateComponent(n1, n2,anchor)
        }
    }
}
```

渲染器有能力处理组件后,我们要设计组件在用户层面的接口.一个组件必须包含一个渲染函数(render函数),并且渲染的返回应该是虚拟DOM.  
```js
const MyComponent = {
    name: 'MyComponent',
    render() {
        return {
            type: 'div',
            children: `我是文本内容`
        }
    }
}
```
渲染器中真正完成组件渲染任务的是mountComponent函数,具体实现如下所示  
```js
function mountComponent(vnode, container, anchor) {
    //通过vnode获取组件的选项对象
    const componentOptions = vnode.type
    //获取组件的render函数
    const { render } = componentOptions
    //执行渲染函数,获取组件要渲染的内容(render函数返回的虚拟DOM)
    const subTree = render()
    // 调用patch函数挂载
    patch(null, subTree, container, anchor)
}
```

这样我们就实现了最基本的组件化方案.  

## 组件状态与自更新

上一节我们完成了组件的初始渲染,接下来我们尝试为组件设计自身的状态  
```js
const MyComponent = {
    name: 'MyComponent',
    //用data函数来定义组件自身的状态
    data() {
        return {
            foo: 'hello world'
        }
    },
    render() {
        return {
            type: 'div',
            children: this.foo //在渲染函数内使用组件状态
        }
    }
}
```

我们约定必须使用data函数来定义组件自身的状态,同时可以在渲染函数中通过this访问由data函数返回的状态数据.  
下面代码实现了组件自身状态的初始化  
```js
function mountComponent(vnode, container, anchor) {
    const componentOptions = vnode.type
    const { data, render } = componentOptions
    //得到原始数据并且用reactive包裹为响应式数据
    const state = reactive(data())
    // 调用render函数的时候,将this设为state,并且将state作为第一个参数传入
    // 从而render函数内部可以通过this访问组件自身状态数据
    const subTree = render.call(state,state)
    patch(null, subTree, container, anchor)
}
```

当组件自身发生变化的时候,我们需要有能力触发组件的更新.即组件的自更新,为此我们需要将整个渲染任务包装到一个effect中.  
```js
function mountComponent(vnode, container, anchor) {
    const componentOptions = vnode.type
    const { data, render } = componentOptions
    const state = reactive(data())
    // 将组件的render函数包装在effect内
    effect(() => {
        const subTree = render.call(state,state)
        patch(null, subTree, container, anchor)
    })
}
```

这样,一旦组件自身的响应式数据发生变化,组件就会自动重新执行渲染函数.但是,如果多次修改响应式数据的值,组件的更新就会频繁发生,这显然是不合理的.我们需要设计一个机制,无论对响应式数据进行多少次修改,副作用函数只会执行一次,为此我们需要实现一个调度器.  

```js
//任务缓存队列,可以自动对任务去重
const queue = new Set()
let isFlushing = false
const p = Promise.resolve()

// 调度器主要函数,将任务添加到缓冲队列中,并且开始刷新队列
function queueJob(job) {
    queue.add(job)
    if(!isFlushing) {
        isFlushing = true
        //在微任务中刷新虚拟缓冲队列
        p.then(() => {
            try {
                queue.forEach(job => job())
            } finally {
                isFlushing = false
                queue.length = 0
            }
        })
    }
}
```
上述是调度器的最小实现,本质上利用了微任务的异步执行机制,实现对副作用的缓冲.  
```js
function mountComponent(vnode, container, anchor) {
    const componentOptions = vnode.type
    const { data, render } = componentOptions
    const state = reactive(data())
    effect(() => {
        const subTree = render.call(state,state)
        patch(null, subTree, container, anchor)
    }, {
        //指定调度器
        scheduler: queueJob
    })
}
```

上述实现仍然存在缺陷.我们在effect函数内调用patch的时候第一个参数总是null,这意味着每次更新都会发生一次全新的挂载.更加合理的做法应该是每次更新的时候进行比较打补丁.  

## 组件实例与生命周期  

组件实例本质上就是一个状态集合,维护着组件运行的所有信息.为了解决上一节中关于组件更新的问题,我们需要引入组件实例的概念.  
```js
function mountComponent(vnode, container, anchor) {
    const componentOptions = vnode.type
    const { data, render } = componentOptions
    
    const state = reactive(data())
    // 创建组件实例
    const instance = {
        //组件自身的状态数据
        state,
        // 一个布尔值,表示组件是否已被挂载
        isMounted: false,
        // 组件所渲染的东西
        subTree: null
    }
    
    vnode.component = instance
    effect(() => {
        const subTree = render.call(state,state)
        if(!instance.isMounted) {
            // 初次挂载
            patch(null, subTree, container, anchor)
            instance.isMounted = true
        } else {
            //完成自更新
            patch(instance.subTree, subTree, container, anchor)
        }
        //更新实例子树
        instance.subTree = subTree
    }, {
        scheduler: queueJob
    })
}
```

在上面的实现中,instance.isMounted可以用来区分组件的挂载与更新,我们可以在合适的时机调用组件对应的生命周期钩子.  
```js
function mountComponent(vnode, container, anchor) {
    const componentOptions = vnode.type
    const { data, render, beforeCreate, created, beforeMount, mounted, beforeUpdate, updated } = componentOptions
    beforeCreate && beforeCreate()
    const state = reactive(data())
    const instance = {
        state,
        isMounted: false,
        subTree: null,
    }
    vnode.component = instance
    created && created()
    effect(() => {
        const subTree = render.call(state,state)
        if(!instance.isMounted) {
            beforeMount && beforeMount()
            patch(null, subTree, container, anchor)
            instance.isMounted = true
            mounted && mounted()
        } else {
            beforeUpdate && beforeUpdate()
            patch(instance.subTree, subTree, container, anchor)
            updated && updated()
        }
        instance.subTree = subTree
    }, {
        scheduler: queueJob
    })
    
}
```

上述代码就是组件生命周期的实现原理,实际上可能存在多个同样的组件生命周期钩子,例如来自mixin中的生命周期钩子,因此我们通常需要将组件生命周期序列化为一个数组,但核心原理不变.  

> 写于西13