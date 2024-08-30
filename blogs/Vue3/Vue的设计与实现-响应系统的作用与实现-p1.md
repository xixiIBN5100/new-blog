---
title: Vue的设计与实现----响应系统的作用与实现(p1)
date: 2024-07-20 14:06:05
tags: [Vue的设计与实现]
sidebar: 'auto'
categories:
  - Vue3
---

**写在前面:**  
刚刚休息完一段时间,准备开始暑假的学习,除了做一些项目的开发,我更想去探究一下框架的底层实现,但是阅读源码总是非常困难的,特别是Vue这样优秀的框架.但学习到的底层代码思想,是写普通项目接触不到的东西,还是希望自己能够坚持下去  

<!--more-->

## 响应式数据与副作用函数  

### 副作用函数  

副作用函数指的是会产生副作用的函数 ~~真是一句废话~~  
用人话来说就是`effect`函数的执行会直接或间接影响其他函数的执行.副作用很容易产生,比如修改一个全局变量的函数就是一个副作用函数,因为会导致其他访问了该变量的函数的执行.  

### 响应式数据  

```js
const obj = { text: 'hello word' } 
function effect() {
    document.body.innerText = obj.text
}
obj.text = 'hello vue' //修改obj.text的值
```
上面代码中的effect函数会设置innerText为obj.text的值,当修改obj.text的值时,我们希望effect函数会重新执行.如果能够实现这个目标,那么obj就是响应式数据.显然,现在是不能的  

## 响应式数据的基本实现  

不难发现  
1. 当副作用函数执行时,会触发 **读取** 操作
2. 当修改数据时,会触发 **设置** 操作  

如果我们能拦截一个对象的读取操作和设置操作,事情就变得简单了.在读取操作的时候,我们吧副作用函数存在一个桶里面,当设置操作的时候,我们遍历桶,依次执行副作用函数,就可以实现响应数据  

在ES2015+,我们可以通过Proxy实现拦截操作,在Proxy中,我们可以拦截读取操作和设置操作,这也是Vue3响应式数据的实现原理  

```js
const obj = { text: 'hello word' }
const bucket = new Set()
const proxy = new Proxy(obj, {
    get(target, key) {
    bucket.add(effect)
    return target[key]
    },
    set(target, key, newValue) {
    target[key] = newValue
    bucket.forEach(fn => fn())
    return true
    }
})
```

这只是一个非常简单的实现,它还有很多缺陷,我们会在后面章节中一步步完善,但不变的就是这种收相关依赖,触发更新的思想.  

## 设计一个完善的响应式系统  

之前有一篇文章介绍了匿名副作用函数,track和trigger的封装,如下  

[Vue3的响应式原理](https://xixiibn5100.github.io/2024/04/17/Vue3%E7%9A%84%E5%93%8D%E5%BA%94%E5%BC%8F%E5%8E%9F%E7%90%86/)
 
## 分支切换  

这一章节我们主要是避免一些不必要的更新.  

我们来看这一个栗子  

```js
const data = { ok: true, text: 'hello'}
const obj = new Proxy(data, { /*...*/})

effect(() => {
    document.body.innerText = obj.ok ? obj.text : 'not' //三元表达式  
})
```

可以发现,当一开始为true的时候,obj.text会被读取,触发有关依赖更新.当obj.ok的值为false的时候,obj.text不会被读取,但是会触发更新,这是不必要的更新,我们希望obj.ok为false的时候,obj.text不会被读取,也不会触发更新.  

解决这个问题的方法很简单,每次副作用函数执行前,将它从相关联的依赖集合中删除就可以啦,由此,我们来完善一下之前的副作用函数  

```js
let activeEffect
function effect(fn) {
    const effectFn = () => {
        cleanup(effectFn)//清除依赖
        activeEffect = effectFn
        fn()
    }
    //用来储存与该副作用相关联的依赖集合
    effectFn.deps = []
    effectFn()
}
```

收集相关联的依赖集合操作在track函数中实现.  

```js
function track(target, key) {
    if (!activeEffect) return
    let depsMap = bucket.get(target)
    if (!depsMap) {
        bucket.set(target, (depsMap = new Map()))
    }
    let dep = depsMap.get(key)
    if (!dep) {
        depsMap.set(key, (dep = new Set()))
    }
    dep.add(activeEffect)
    // dep就是一个与当前副作用函数相关的依赖集合
    activeEffect.deps.push(dep)
}
```

有了这个收集的操作,在effect函数中我们先调用cleanup函数,将当前副作用函数从相关联的依赖集合中删除.下面是cleanup函数的简单实现.  

```js
function cleanup(effectFn) {
    //遍历数组集合
    for (let i = 0; i < effectFn.deps.length; i++) {
        const dep = effectFn.deps[i]
        dep.delete(effectFn)
    }
    effectFn.deps.length = 0
}
```

写到这里,我们看似能够完美的解决这个问题.但是实际操作的时候,会出现无限循环的问题,这个问题的源头是trigger函数  

在trigger函数内部有一个Set集合存放着相关副作用函数,当副作用函数执行的时候,会调用cleanup进行清除,但是副作用函数的执行有回让他重新被收集到集合中,但此时遍历集合的操作还在进行中,这个操作就像:  

```js
const set = new Set([1])

set.forEach(() => {
    set.delete(1)
    set.add(1)
    console.log('死循环')
})
```

这个遍历操作会一直进行下去,造成死循环  

怎么解决呢?我们可以构造另一个set来遍历副作用函数  

```js
function trigger(target, key) {
    const depsMap = bucket.get(target)
    if (!depsMap) return
    const effects = depsMap.get(key)
    const effectsToRun = new Set(effects) //创造集合副本
    effectsToRun.forEach(effectFn => effectFn())
}
```


到此,我们算是解决了这个性能优化的问题  winnnnnnn  


> 写于西13