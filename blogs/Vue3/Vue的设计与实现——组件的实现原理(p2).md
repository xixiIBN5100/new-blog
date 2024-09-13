---
title: Vue的设计与实现——组件的实现原理(p2)
date: 2024/9/13
tags: [Vue源码,组件]
sidebar: 'auto'
categories:
  - Vue3
---

## props 与组件的被动更新  

在虚拟DOM层面,组件的props与普通的HTML标签的属性相差不大.假设我们有以下模板:  
```html
<MyComponent title="a Big Title" :other="val"></MyComponent>
```

这段模板对应的虚拟DOM是:
```js
const vnode = {
    type: MyComponent,
    props: {
        title: 'a Big Title',
        other: this.val
    }
}
```

在编写组件的时候,我们需要显式指定组件会接受到哪些props数据.  
```js
const MyComponent = {
    name: 'MyComponent',
    props: {
        title: String,
    },
    render() {
        return {
            type: 'div',
            children: this.title //访问props数据
        }
    }
}
```

对于一个组件来说,有两部分props内容需要我们担心  
1. 为组件传递的props数据,即组件的vnode.props对象
2. 组件选项对象中定义的props选项,即MyComponent.props对象

我们需要结合这两个选项解析出组件在渲染时要用到的props数据.  
```js
function mountComponent(vnode, container,anchor) {
    const componentOptions = vnode.type
    const { render,props:propsOptions,data } = componentOptions

    const state = reactive(data())
    //调用resloveProps解析props与attrs数据
    const [props,attrs] = resloveProps(propsOptions,vnode.props)
    
    const instance = {
        state,
        props: shallowReactive(props),
        isMounted: false,
        subTree: null,
    }
    vnode.component = instance
    //省略部分..
}

function resloveProps(options,propsData) {
    const props = {}
    const attrs = {}
    for(const key in propsData) {
        if(key in options) {
            //如果传递的props数据在组件自身的props选项中有定义,则视为合法的props
            props[key] = propsData[key]
        } else {
            //否则视为attrs
            attrs[key] = propsData[key]
        }
    }
    return [props,attrs]
}
```

这里我们需要注意2点
1. 在Vue3.js中,没有定义在MyComponent.props选项中的props数据,会被收集到attrs对象中
2. 上述实现没有包含默认值和类型校验等内容的处理,但实际上也是围绕MyComponent.props和vnode.props产展开的,实现并不复杂.

处理完props后,我们来讨论props数据变化的问题.props本质上是父组件的数据,当props数据发生变化的时候,会触发父组件重新渲染,也就是父组件的自更新.  
在更新过程中,渲染器发现父组件的subTree包含组件类型的虚拟节点,所以会调用patchComponent函数完成子组件的更新.  
```js
funtion patch(n1,n2,container,anchor) {
    if(n1 && n1.type !== n2.type) {
        unmount(n1)
        n1 = null
    }
    const { type } = n2
    
    if(typeof type === 'string') {
        //
    } else if (type === Text) {
        //
    } else if (type === Fragment) {
        //
    } else if (typeof type === 'object') {
        if(!n1) {
         mountComponent(n2,container,anchor)   
        } else {
            //更新组件
            patchComponent(n1,n2,container,anchor)
        }
    }
}
```

我们吧父组件自更新引起的子组件更新叫做子组件的被动更新.当子组件发生被动更新时,我们需要做
1. 检测子组件是否真的需要更新,因为子组件的props可能是不变的
2. 如果需要更新,则更新子组件的props,slots等内容

patchComponent函数的具体实现如下  
```js
function patchComponent(n1,n2,anchor) {
    // 获取组件实例n1.component  同时让新的虚拟节点n2.component也指向组件实例
    const instance = (n2.component = n1.component)
    const { props } = instance// 获取当前组件的props数据
    if(hasPropsChanged(n1.props,n2.props)) {
        //重新获取props数据
        const [nextProps] = resloveProps(n2.type.props,n2.props)
        //更新props
        for (const key in nextProps) {
            props[key] = nextProps[key]
        }
        //删除不存在的props数据
        for (const key in props) {
            if(!(key in nextProps)) {
                delete props[key]
            }
        }
    }
}
```

以上就是组件被动更新的最小实现,有两点需要注意.
1. 需要将组件实例添加到新的组件vnode对象上,否则下次更新的时将从无法获取组件实例
2.  instance.props 对象本身是浅响应的,因此在更新组件props数据的时,只需要设置instance.props对象下的属性值即可触发组件重新渲染.


由于props数据与组件自身的状态数据都需要暴露在渲染函数中,并使得渲染函数能通过this访问,我们需要封装一个上下文对象.  
```js
function mountComponent(vnode, container,anchor) {
    //省略部分..
    const instance = {
        state,
        props: shallowReactive(props),
        isMounted: false,
        subTree: null,
    }
    
    vnode.component = instance
    
    //创建上下文对象,本质上是对组件实例的代理
    const renderContext = new Proxy(instance,{
        get(t,k,r) {
            //获取组件自身状态与props数据
            const { props,state } = t
            //先尝试读取自身数据
            if(state && k in state) {
                return state[k]
            } else if(k in props) { //尝试从props中读取
                return props[k]
            } else {
                console.log('Not Found')
            }
        },
        set(t,k,v,r) {
            const { props,state } = t
            if(state && k in state) {
                state[k] = v
            } else if(k in props) {
                props[k] = v
            } else [
                console.log('Not Found')
            ]
        }
    })
        //生命周期调用的时候要绑定渲染上下文对象
    created && created.call(renderContext)
    
    //省略
}
```

在上述代码中,我们创建了一个渲染上下文对象,每当渲染函数或者生命周期钩子通过this来读取数据的时候,会逐级读取.  

除此之外,完整的组件还包含methods,computed等选项中定义的数据和方法,这些内容都应该在渲染上下文对象中暴露出来.  



