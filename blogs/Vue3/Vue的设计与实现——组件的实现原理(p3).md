---
title: Vue的设计与实现——组件的实现原理(p3)
date: 2024/9/16
tags: [Vue源码,组件]
sidebar: 'auto'
categories:
  - Vue3
---

## setup函数的作用与实现

setup函数主要用于配合组合式API,为用户提供一个地方,用于建立组合逻辑、创建响应式数据、创建通用函数,注册生命周期钩子等能力.  

在整个组件的生命周期中,setup函数只会在被挂载的时候执行一次,它的返回值有两种情况  

- 返回一个函数,将该函数作为组件的render函数

```js
const Comp = {
    setup(){
        return () => {
            return {type:'div',text:'hello'}
        }
    }
}
```

这种方式常用与组件不是以模板来表达其渲染内容的情况,否则会与模板编译生成的渲染函数产生冲突.  

- 返回一个对象,该对象中的数据将暴露给模板使用.

```js
const Comp = {
    setup(){
        const count = ref(0)
        return {count}
    },
    render(){
        return {type:'div',text:this.count}
    }
    
}
```
setup函数暴露的数据可以在渲染函数中通过this来访问.  

另外 setup函数接收两个参数: props数据对象和setupContext.  

```js
const Comp = {
    props:{
        foo: String
    },
    setup(props,setupContext){
      props.foo
      const {slots,attrs,emit,expose} = setupContext
      //....  
    }
}
```

setup可以获取外部为组件传递的props数据对象,也能获取与组件接口相关的数据和方法.接下来我们来尝试实现setup组件选项.  
```js
function mountComponent(vnode, container,anchor) {
    const componentOptions = vnode.type
    let {data,render,setup} = componentOptions
    
    beforeCreate && beforeCreate()
    
    const state = data ? reactive(data()) : null
    const [props,attrs ] = resolveProps(vnode.props)
    const instance = {
        state,
        props: shallowReactive(props),
        isMounted: false,
        subTree: null,
    }
    
    const setupContext = { attrs }
    //调用setup函数,将只读版本的props作为第一个参数传入
    const setupResult = setup(shallowReadonly(props),setupContext)
    let setupState = null
    //如果setup的返回值是函数,则将其作为渲染函数
    if(typeof setupResult === 'function') {
        if(render) {
            console.warn('setup返回了一个函数,将作为render函数使用')
            render = setupResult
        } else {
            //setup返回一个非函数,则作为数据状态赋值
            setupState = setupResult
        }
    }
    vnode.component = instance
    
    const renderContext = new Proxy(instance,{
        get(t,k,r) {
            const {props,state} = t
            if(state && k in state) {
                return state[k]
            } else if(k in props) {
                return props[k]
            } else if(setupState && k in setupState) {
                //渲染上下文增加对setupState的支持,将返回的数据暴露
                return setupState[k]
            }
        },
        set(t,k,v,r) {
            const {state,props} = t
            if(state && k in state) {
                state[k] = v
            } else if(k in props) {
                console.warn(`Attempting to mutate prop "${k}". Props are readonly.`)
            } else if(setupState && k in setupState) {
                setupState[k] = v
            } else {
                console.error('不存在')
            }
        }
    })
}
```

以上是setup的最小实现,后续我们会继续完善.

## 组件实现与emit的实现  

emit用来发射组件的自定义事件.  
```js
const MyComp = {
    name: 'MyComp',
    setup(props, { emit }) {
        //发射change事件并传递参数
        emit('change', 1, 2)
        
        return () => {
            return //.....
        }
    }
}
```

使用该组件的时候,我们可以监听由emit函数发射的自定义事件.
```html
<MyComp @change="handler" />
```

上面这段模板对应的虚拟DOM是  
```js
const CompVnode = {
    type: MyComp,
    props: {
        onChange: handler
    }
}
```

在具体的实现上,发射自定义事件的本质就是根据事件名称去props数据对象中寻找对应的事件处理函数并执行.  

```js
function mountComponent(vnode, container,anchor) {
    //省略..
    const instance = {
        state,
        props: shallowReactive(props),
        isMounted: false,
        subTree: null,
    }
    //定义emit函数
    function emit (event, ...payload) {
        //处理事件名称 比如 onClick -> onclick
        const eventName = `on${event[0].toUpperCase() + event.slice(1)}`
        //根据处理后的事件名称去props数据对象中寻找对应的事件处理函数并执行
        const handler = instance.props[eventName]
        handler && handler(...payload)
    }
    //将emit函数暴露给setup函数
    const setupContext = { attrs, emit }
    
    //省略..
}
```
有一点就需要额外注意.在讲解props章节的时候提到,没有显式声明的props会被存在attrs中.也就是说任何事件类型的props(onClick...)都不会出现在props中.为了解决这个问题,我们要在resolveProps函数中做特殊处理.  

```js
function resolveProps(options, propsData) {
    const props = {}
    const attrs = {}
    for(let key in options ) {
        if(key in propsData || ker.startsWith('on')) {
            props[key] = propsData[key]
        } else {
            attrs[key] = propsData[key]
        }
    }
}
```
对所有以'on'开头的字符串做特殊处理,保证事件被收集到props数据对象中.  

## 插槽的工作原理与实现  
当使用带有插槽的子组件时,可以根据插槽的名字来插入自定义的内容.  
```html
<MyComp>
    <template #header>
        <h1>我是标题</h1>
    </template>
    <template #body>
        <p>我是内容</p>
    </template>
    <template #footer>
        <p>我是尾部</p>
    </template>
</MyComp>
```

上面这端附组件模板会被编译成如下渲染函数
```js
function render() {
    return {
        type: MyComp,
        children: {
            header() {
                return h('h1', '我是标题')
            },
            body() {
                return h('p', '我是内容')
            },
            footer() {
                return h('p', '我是尾部')
            }
        }
    }
}
```

组件MyComp的模板则会变异为如下渲染函数  
```js
function render() {
    return [
        {
            type: 'header',
            children: [this.$slots.header()]
        },
        {
            type: 'body',
            children: [this.$slots.body()]
        },
        {
            type: 'footer',
            children: [this.$slots.footer()]
        }
    ]
}
```

渲染插槽内容的过程就是调用插槽函数并返回其结果.  

在运行时的实现上,插槽依赖于setupContext中的slots对象.  
```js
function mountComponent(vnode, container,anchor) {
    //省略
    const slots = vnode.children || {} 
    
    const setupContext = { attrs, emit, slots }
}
```

最基本的slots实现非常简单.只要将编译好的vnode.children作为slots对象暴露在setupContext中即可.为了render函数内和生命周期钩子函数内能通过this.$slots来访问插槽内容,我们还要在setupContext中特殊对待一下它.  
```js
function mountComponent(vnode, container,anchor) {
    const slots = vnode.children || {}
    
    const instance = {
        state,
        props: shallowReactive(props),
        isMounted: false,
        subTree: null,
        slots
    }
    
    
    const setupContext = new Proxy(instance,{
        get(t,k,r) {    
            const {props,state,slots} = t
            // 当key为$slots时,返回slots对象
            if(k === '$slots') {
                return slots
            }
        }
    })
}
```

> 写于西13
