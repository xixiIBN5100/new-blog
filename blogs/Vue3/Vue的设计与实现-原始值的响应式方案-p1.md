---
title: Vue的设计与实现----原始值的响应式方案
date: 2024-08-23 13:56:15
tags: [Vue源码,响应式原理]
sidebar: 'auto'
categories:
  - Vue3
---
在之前的文章中,我们讨论了非原始值的响应式方案,接下来将讨论原始值的响应式方案.  
原始值指的是Boolean,Number,String,Symbol,BigInt,Undefined,Null等类型的值在js中,原始值是按值传递的.

<!--more-->

## ref的概念
由于Proxy的代理目标必须是非原始值,所以我们没有手段拦截对原始值的操作.  
对于这个问题,我们可以使用一个非原始值去包裹原始值,例如
```js
function ref(val) {
    const wrapper = {
        value: val
    }
    //将包裹对象变为响应式数据
    return reactive(wrapper)
}
```
这段代码虽然按照期望工作,但并不是完美的.我们要面临的第一个问题是,如何区分refVal到底是原始值的包裹对象(ref),还是一个非原始值的响应式数据(reactive).
```js
const refVal1 = ref(1)
const refVal2 = reactive({ value: 1 })
```
从实现上来看,他们没有任何区别.但是我们有必要区分一个数据到底是不是ref,这个下文的**自动脱ref能力**有关  
```js
function ref(val) {
    const wrapper = {
        value: val
    }
    //打上标记
    Object.defineProperty(wrapper, '__v_isRef', {
        value: true
    })
    return reactive(wrapper)
}
```
我们使用`Object.defineProperty`为包裹对象wrapper定义了一个不可枚举且不可写的属性`__v_isRef`,这样我们就可以检查这个属性区分refVal1和refVal2了.

## 自动脱ref
我们知道,toRefs会把数据的第一层属性值转化成ref,所以必须通过value访问属性值.  
这样其实增加了宗祜的心智负担,我们不想在模板中访问数据的时候还要进行.value操作.  

因此,我们需要一个自动脱ref的能力.如果读取的属性是一个ref,则直接将该ref所对应的value属性值返回.
```js
function proxyRefs(target) {
    return new Proxy(target, {
        get(target, key, receiver) {
            const value = Reflect.get(target, key, receiver)
            //自动脱ref
            return value.__v_isRef ? value.value : value
        }
    })
}
```
实际上,在Vue中,我们在模板中访问ref数据之前,会将变量传输给proxyRefs进行处理.
在Vue.js中reactive函数也有自动脱ref的能力
```js
const count = ref(0)
const obj = reactive({ count })

obj.count //0
```
自动脱ref旨在减轻用户的心智负担,用户在模板中使用响应式数据的时候,不需要关心哪些是ref,哪些是reactive.  

至此为止,我们已经对Vue.js的响应式机制有了一个比较全面的了解.有了一个完整的响应式机制.下一阶段应该学习渲染器相关内容.

> 写于西13