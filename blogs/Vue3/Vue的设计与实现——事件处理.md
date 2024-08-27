---
title: Vue的设计与实现----事件处理
date: 2024-08-27 17:00:00
tags: [Vue源码,渲染器,事件冒泡]
categories:
  - Vue3
---

## 事件处理

这一小节我们讨论如何处理事件,包括在vnode中描述事件,把事件添加到dom元素上,以及更新事件.  

### 描述事件
我们约定,在vnode.props中描述事件,事件名以on开头,事件名后面跟事件名,如onClick,onMouseMove等.
```js
const vnode = {
    type: 'div',
    props: {
        onClick: () => {
            console.log('click')
        }
    },
    children: 'click me'
}
```

### 绑定事件到dom

这非常简单,是需要在patchProps中调用addEventListener方法即可
```js
patchProps(el, key, value, prevValue) {
    if(/^on/.test(key)) {
        //根据属性名获取对应的事件名
        const eventName = key.slice(2).toLowerCase()
        el.addEventListener(name, value)
    } //省略...
}
```

如何更新事件呢,这里我们伪造一个事件处理函数invoker,把真正的事件处理函数设置为invoker.value.当我们更新事件的时候,不需要调用removeEventListener方法,只需要更新invoker.value的值.  
```js
patchProps(el, key, value, prevValue) {
    if(/^on/.test(key)) {
        let invoker = el._vei
        const name = key.slice(2).toLowerCase()
        if(value) {
            if(!invoker) {
                //如果没有invoker,则将伪造的invoker缓存到el._vei中
                invoker = el._vei = (e) => {
                    // 当伪造的事件处理函数被调用时,会调用真正的事件处理函数
                    invoker.value && invoker.value(e)
                }
                // 将真正的事件处理函数赋值给invoker.value
                invoker.value = value
                el.addEventListener(name, invoker)
            } else{
                // 如果invoker存在,意味着更新事件,直接更新invoker.value即可
                invoker.value = value
            }
        } else if (invoker) {
            // 新的事件绑定函数不存在但是invoker存在,则移除绑定
            el.removeEventListener(name,invoker)
        }
    }
}
```
伪造事件处理函数的作用不止于此,它还能解决事件冒泡与事件更新之间相互影响的问题,下文会详细描述.  

我们目前的事件仍然存在一些问题.我们现在在同一时刻只能缓存一个事件处理函数.这意味着如果一个元素同时绑定了很多事件,后绑定的事件会将前一个事件覆盖 ~~梦回嵌套effect~~  

这意味着我们要重新设计el._vei的结构.我们可以使用一个对象来存储事件处理函数,对象中的key为事件名,value为事件处理函数.这样我们就可以存储多个事件处理函数了.  
```js
patchProps(el, key, value, prevValue) {
    if(/^on/.test(key)) {
        // 定义el._vei为一个对象,存在事件名称到事件处理函数的映射
        let invokers = el._vei || (el._vei = {})
        //根据事件名获取invoker
        let invoker = invokers[key]
        const name = key.slice(2).toLowerCase()
        if(value) {
            if(!invoker) {
                // 避免覆盖
                invoker = el._vei[key] = (e) => {
                    invoker.value && invoker.value(e)
                }
                invoker.value = value
                el.addEventListener(name, invoker)
            } else{
                invoker.value = value
            }
        } else if (invoker) {
            el.removeEventListener(name,invoker)
        }
    }
}
```

同时,一个元素不仅可以绑定对中类型的事件,对同一类型的事件而言,还可以绑定多个事件处理函数.在原生的DOM编程中,当多次调用addEventListener函数为元素绑定统一类型的事件的时候,多个事件处理函数可以共存.
```js
el.addEventListener('click',fn1)
el.addEventListener('click',fn2)
```
当我们点击元素的时候,fn1和fn1都会执行.这时候,我们就需要调整vnode.props对象中事件的数据结构.
```js
const vnode = {
    type: 'div',
    props: {
        onClick: [
            () => {
                console.log('click1')
            },
            () => {
                console.log('click2')
            }
        ]
    },
    children: 'click me'
}
```
这样,我们使用一个数组来描述事件,为了实现,我们还需要修改patchProps函数.
```js
patchProps(el, key, value, prevValue) {
    if(/^on/.test(key)) {
        let invokers = el._vei || (el._vei = {})
        let invoker = invokers[key]
        const name = key.slice(2).toLowerCase()
        if(value) {
            if(!invoker) {
                invoker = el._vei[key] = (e) => {
                    // 如果invoker.value是一个数组,则遍历数组,依次调用事件处理函数
                    if(Array.isArray(invoker.value)) {
                        invoker.value.forEach(fn => fn(e))
                    } else {
                        invoker.value(e)
                    }
                }
                invoker.value = value
                el.addEventListener(name, invoker)
            } else {
                invoker.value = value
            }
        } else if(invoker) {
            el.removeEventListener(name,invoker)
        }
    }
}
```

这样我们就能实现事件的绑定与更新啦!

## 事件冒泡与更新时机
我们来看一个有趣的例子.
```js
const bol = ref(false)

effect(() => {
    const vnode = {
        type: 'div',
        props: bol.value ? {
            onClick: () => {
                console.log('父元素click')
            }
        } : {},
        children: [
            {
                type: 'div',
                props: {
                    onClick: () => {
                        bol.value = true
                    }
                },
                children: 'click me'
            }
        ]
    }
    //渲染vnode
    renderer.render(vnode, document.querySelector('#app'))
})
```
可以看到,在首次渲染的时候,由于bol.value为false,所以父元素的props为空对象.点击子元素,会将bol的值设为true.  

当首次渲染完成的时候,点击子元素,会触发父级的click事件的事件处理函数执行吗?

显然,在首次渲染的时候,父元素并没有绑定点击事件.即使click冒泡到父级元素,也什么都不会发生.但事实是会触发父级的click事件.  

这与更新机制有关.点击p元素的时候,会触发子元素的click事件,由于bol.value改变为true,会触发副作用函数重新执行,由于bol已经为true,所以在更新阶段会再次渲染vnode,此时,父元素的props中会绑定click事件.当更新完成之后,点击事件才冒泡到父级元素.,因此发生了上述奇怪的现象.  

我们可以通过**屏蔽所有绑定时间晚于事件触发时间的事件处理函数的执行**
```js
patchProps(el, key, value, prevValue) {
    if(/^on/.test(key)) {
        let invokers = el._vei || (el._vei = {})
        let invoker = invokers[key]
        const name = key.slice(2).toLowerCase()
        if(value) {
            if(!invoker) {
                invoker = el._vei[key] = (e) => {
                    // e.timeStamp为事件触发时的时间戳
                    if (e.timeStamp < invoker.attached) return
                    if(Array.isArray(invoker.value)) {
                        invoker.value.forEach(fn => fn(e))
                    } else {
                        invoker.value(e)
                    }
                }
                invoker.value = value
                //  添加时间戳
                invoker.attached = performance.now()
                el.addEventListener(name, invoker)
            } else {
                invoker.value = value
            }
        } else if(invoker){
            el.removeEventListener(name,invoker)
        }
    }
}
```

这样,我们就能屏蔽所有绑定时间晚于事件触发时间的事件处理函数的执行.

> 写于西13