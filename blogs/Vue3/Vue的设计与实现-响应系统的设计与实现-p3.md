---
title: Vue的设计与实现----响应系统的设计与实现(p3)
date: 2024-07-25 14:02:46
tags: [Vue源码,响应式原理]
sidebar: 'auto'
categories:
  - Vue3
---

## watch的实现原理  

<!--more-->

watch本质观测一个响应式数据的变化，当数据变化时，会执行对应的回调函数。举个例子
```js
watch(obj,() => {
    console.log('obj变化了')
})

obj.foo++
```
watch本质上是利用了effect和scheduler选项  
```js
function watch(source, cb) {
    effect(
        () => source.foo, //触发读取操作,建立联系
        {
            scheduler: () => {
                //数据变化的时候调回调函数
                cb()
            }
        }
    )
}
```

为了让watch函数具有通用性,我们需要封装一个通用的读取函数,用来建立响应式联系   
```js
function traverse(value, seen = new Set()) {
    if (!isObject(value) || seen.has(value) || value === null) return; //读取的是原始值,或者已经被读取过就什么也不做  
    seen.add(value);
    for (const key in value) {
        //递归读取
        traverse(value[key], seen);
    }
    return value;
}
```

于是我们就可以把`source.foo`改成`traverse(source.foo)`  

**watch还可以接收一个get函数** 

让我们增强一下watch函数  

```js
function watch(source, cb) {
    let getter;
    if (isFunction(source)) {
        getter = source;
    } else {
        getter = () => traverse(source);
    }
    effect(
        () => getter(), //执行getter
        {
            scheduler: () => {
                cb();
            }
        }
    )
}
```

到此,watch函数还差一个很重要的能力,即在回调函数中读取新值和旧值,进行这个改造需要利用effect的lazy选项  

```js
function watch(source, cb) {
    let getter;
            if (isFunction(source)) {
        getter = source;
    } else {
        getter = () => traverse(source);
    }
    let oldValue, newValue;
    const effectFn = effect(
        () => getter(), //执行getter
        {
            lazy: true, //设置为true,不执行getter
            scheduler: () => {
                //重新执行副作用函数,读取新值
                newValue = effectFn();
                //回调
                cb(newValue, oldValue);
                //设置当前新值为旧值
                oldValue = newValue;
            }
        }
    )
    //手动调用,拿到第一次执行的值
    oldValue = effectFn();
}
```

## 立即执行的watch
当watch的immediate选项为true时,回调函数会在watch被创建时立即执行一次  

```js
function watch(source, cb, options = {}) {
    let getter;
    if (isFunction(source)) {
        getter = source;
    } else {
        getter = () => traverse(source);
    }
    let oldValue, newValue
    const job = () => {
        newValue = effectFn();
        cb(newValue, oldValue);
        oldValue = newValue;
    }
    const effectFn = effect(
        () => getter(),
        {
            lazy: true,
            scheduler() {
                if (options.immediate) {
                    job();
                } else {
                    oldValue = effectFn();
                }
            }
        }
    )
}
```

这样就实现了回调函数的立即执行功能.由于函数是立即执行的,oldValue的值是undefined,这是符合预期的.    

## 过期的副作用  

竞态问题也是watch函数需要解决掉一个问题.
```js
let finalData

watch(obj, async () => {
    const res = await fetch('/path/request')
    finalData = res
})
```

如果连续触发两次回调函数,先发送请求A再发送请求B,但是由于网络问题,请求B先返回了,那么请求A的响应就会覆盖请求B.但是B是后发送的,B才是我们想要拿到的响应.这个时候,我们就说触发请求A的这个副作用函数过期了  

再Vue.js中,watch函数还能接收第三个参数`onInvalidate`,这是一个函数,类似于事件监听器,我们可以用onInvalidate函数注册一个回调,这个回调函数会在当前副作用函数过期时执行  

```js
watch(obj, async (newValue, oldValue, onInvalidate) => {
    let expired = false;
    //调用函数注册一个过期回调
    onInvalidate(() => {
        expired = true;
    })
    const res = await fetch('/path/request')
    //当前副作用没有过期是才会赋值
    if (!expired) {
        finalData = res
    }
})
```

那么`onInvalidate`函数应该如何实现呢?再watch内部每次监测到变更的时候,在副作用函数重新执行之前,首先会调用`onInvalidate`函数注册的过期回调.  

```js
function watch(source, cb, options = {}) {
    let getter;
    if (isFunction(source)) {
        getter = source;
    } else {
        getter = () => traverse(source);
    }
    let oldValue, newValue
    //存储过期回调
    let cleanup;
    const onInvalidate = (fn) => {
        cleanup = fn;
    }
    const job = () => {
        newValue = effectFn();
        cb(newValue, oldValue, onInvalidate);
        oldValue = newValue;
    }
    const effectFn = effect(
        () => getter(),
        {
            lazy: true,
            scheduler() {
                if (options.immediate) {
                    job();
                } else {
                    oldValue = effectFn();
                }
            }
        }
    )
}
```

之前有篇文章介绍过Vue3中watch函数的使用 [Vue3中的watch函数](https://xixiibn5100.github.io/2024/04/20/Vue3%E4%B8%AD%E7%9A%84watch%E4%BE%A6%E5%90%AC%E5%99%A8/)

这样一来,当副作用函数第二次被触发之前,会调用`onInvalidate`函数注册的过期回调,使得第一次执行的副作用函数内闭包的变量`expired`变为true,从而阻止了赋值操作.  

到此为止,**响应系统的作用与实现——原始值的响应式方案**这一大部分完美落幕! ~~完结散花~~  

> 写于西13