---
title: Vue3中的watch侦听器
date: 2024-04-20 21:31:33
tags: [watch,vue源码]
sidebar: 'auto'
categories:
  - Vue3
---
## watch侦听器的使用和实现方法

<!--more-->

### watch的特性
watch只能侦听响应式数据的变化,函数的第一个参数是侦听数据源,第二个参数是一个回调函数,回调函数会返回oldValue和newValue两个参数  
```typescript

const a = ref('啦啦啦啦')
const b = ref('呵呵呵')
const c = reactive({
    foo:{
        bar:{
            name: "100",
            age: 10
        }
    }
})
watch(a,(oldValue,newValue) => {
    console.log(oldValue,newValue)
})

//支持同时侦听两个对象
watch([a,b],(oldValue,newValue) => {
    console.log(oldValue,newValue)
})
//此时oldValue和newValue是两个数组
//如果需要深度侦听ref包裹的数据类型,需要在配置项中开启deep:true,而reactive包裹的数据类型deep默认开启
//有趣的是,当传入的是一个对象的时候,返回的newValue和oldValue是一个值,这与源码有关,源码采用直接复制,引用类型对象会导致指向的地址相同,所以值相同
watch([a,b],(oldValue,newValue) => {
    console.log(oldValue,newValue)
},{
    deep:true
})
//如果只想侦听对象中的某个属性,可以在第一个参数中使用回调函数,因为直接访问的不是proxy代理的对象
watch(()=>c.foo.bar.age,(oldValue,newValue) => {
    console.log(oldValue,newValue)
})
```
watch函数的配置项还有`immediate`,配置为true的话会立即执行一次侦听,oldValue返回为undefined  
还有一个是`flush`配置项 pre表示组件更新之前调用,sync表示同步执行,post表示组件更新之后执行

>重新学习Vue3第八天  
>写于寝室