---
title: Vue3的响应式原理
date: 2024-04-17 19:18:15
tags: [vue源码,响应式原理]
sidebar: 'auto'
categories:
  - Vue3
---
## Vue3的响应式原理

<!--more-->

### Proxy代理对象

什么是Proxy代理的对象?  

>在 JavaScript 中，Proxy 是一种用于创建代理对象的内置对象。代理对象允许你在访问对象之前添加自定义行为，比如拦截并修改对象的默认行为。  
>具体来说，Proxy 可以用来包装另一个对象，并拦截该对象的操作，例如属性访问、赋值、函数调用等。通过定义代理对象的处理程序（handler），你可以自定义对原始对象的操作。

人话就是不直接操作对象,而是用方法来操作对象

### 手撕reactive
```typescript
export const reactive = <T extends Object>(target:T) => {
    return new Proxy(target,{
        get(target,key,reciver){
            let res = Reflect.get(target,key,reciver)
            track(target,key)//收集依赖
            return res
        }, 
        set(target,key,value,reciver){
            let res = Reflect.set(target,key,value,reciver)//该函数会返回boolen值
            trigger(target,key)//更新依赖
            return res
        }
    })
}
```

### effect,track和trigger实现
track()用于依赖收集,trigger()用于依赖的更新  
```typescript
let activeEffect;
export const effect = (fn: Function) => {
    const _effect = function () {
        activeEffect = _effect
        fn()
    }
    _effect()
}
//简单版
const targetMap = new WeakMap() //创建一个Map,WaekMap的key只能是一个对象  
export const track = (target,key) => {
    let depsMap = targetMap.get(target)
    if(!depsMap){
        let depsMap = new Map()
        targetMap.set(target,depsMap)
    }
    let deps = depsMap.get(key)
    if(!deps){
        deps = new Set()
    }
    deps.add(activeEffect)
    //需要说明的是, activeEffect 记录了当前活跃的响应式函数。这样可以确保在数据变化时能够及时通知相关的响应式函数进行更新。
}

export const trigger = (target,key) => {
    let depsMap = targetMap.get(target)
    if(!depsMap){
        let depsMap = new Map()
        targetMap.set(target,depsMap)
    }
    let deps = depsMap.get(key)
    if(!deps){
        deps = new Set()
    }
    deps.forEach(effect => effect())//遍历响应式函数并执行,引起视图更新等等
}

//Set集合中储存了和key有关的响应式函数,一旦属性发生改变,就会触发trigger()

```

![](/assets/img/active.png)
~~源码好难~~

>重新学习vue第七天  
> 写于电子阅览室