---
title: Vue的设计与实现----响应系统的设计与实现(p5)
date: 2024-07-29 17:02:34
tags: [Vue源码,响应式原理]
categories:
  - Vue3
---

## 合理的触发响应  

<!--more-->

### 新旧值的比较
首先第一个问题,当值没有发生变化大时候,我们不希望触发响应.为了满足这一点,怎么需要修改set拦截函数的代码,在调用trigger之前,检查值石佛是否真的发生了变化  
```js
set(target, key, value, receiver) {
    const oldValue = target[key];
    const type = Object.prototype.hasOwnProperty.call(target, key) ? 'SET' : 'ADD';
    const result = Reflect.set(target, key, value, receiver);
    // 不全等的时候触发响应
    if (oldValue !== value) {
        trigger(target, key, type);
    }
}
```

然而这样会有一个小漏洞.我们知道`NaN === NaN`是false,所以触发响应的条件应该再完善一下.   

```js
if(oldValue !== value && (oldValue === oldValue || value === value)){
    trigger(target, key, type);
}
```

这样我们就解决了NaN的问题  

### 从原型上继承属性  

为了讲解方便,需要封装一个`reactive`函数,用来创建响应式对象  

```js
function reactive(obj) {
    return new Proxy(obj, {
        /*...*/
    })
}
```
栗子登场  

```js
const obj = {}
const proto = { bar:1 }
const child = reactive(obj)
const parent = reactive(proto)
// 使用parent作为child的原型  
Object.setPrototypeOf(child, parent)

effect(() => {
    console.log(child.bar)
})  

child.bar = 2
```

从代码中可以看出,child本身没有bar属性,值是从原型上继承下来的.但是无论如何,既然child是响应式数据,就会与副作用函数建立联系.当我们给他赋值的时候,会发现副作用函数被触发了两次,造成了不必要更新.  

通过了解规范可以知道,如果对象自身不存在属性,那么会获取对象的原型,并且调用原型上的get方法.我们能得出一个结论:child.bar和parent.bar都与副作用函数建立了响应联系.  

如果设置的属性不存在与对象上,那么会获取其原型,并且调用原型上的get方法.这就是为什么副作用函数会重新执行两次的原因.  

既然知道了原因,解决方法很简单,可以吧parent.bar触发的那次副作用函数的执行屏蔽.关键在于在set拦截函数里面区分这两次更新.  

当触发child的set拦截函数时  
```js
set(target, key, value, receiver){
    //target是原始对象 obj
    //reciver是代理对象 child
}
```

当触发parent的set拦截函数时  

```js
set(target, key, value, receiver){
    // target是原型对象 proto
    // receiver是代理对象 parent
}
```

容易发现,我们只需要判断代理对象receiver的原型是不是原始对象target,如果不是,则屏蔽这次副作用函数的执行  

我们先完善一下reactive函数的代码  

```js
function reactive(obj) {
    const proxy = new Proxy(obj, {
        get(target, key, receiver) {
            if(key === 'raw'){
                return target
            }
            track(target, key)
            return Reflect.get(target, key, receiver)
        }
    })
}
```

这段代码的加入让代理对象可以通过raw属性读取原始数据.  

```js
child.raw === obj //true
parent.raw === proto //true
```

接下来在完善set拦截函数中触发trigger函数的条件  

```js
// reciver 就是 target 的代理对象
if(target === reciver.raw){
    if(oldValue !== value && (oldValue === oldValue || value === value)){
        trigger(target,key,type)
    }
}
```

这样我们就能屏蔽由原型引起的更新  

## 浅响应与深响应  

本节我们介绍reactive和shallowReactive的区别.事实上,我们目前所实现的reactive都是浅响应的  

```js
const obj = {
    foo:{
        bar:1
    }
}

effect(() => {
    console.log(obj.foo.bar)
})
obj.foo.bar = 2 //不会触发响应  
```

这是为什么呢,让我们来审视一下代码的实现  

```js
function reactive(obj) {
    const proxy = new Proxy(obj, {
        get(target, key, receiver) {
            if(key === 'raw'){
                return target
            }
            
            track(target, key)
            return Reflect.get(target, key, receiver)
        }
        //  省略其他拦截函数
    })
}
```

当我们读取obj.foo.bar时,首先要读取obj.foo的值.我们直接使用`Reflect.get(obj, 'foo', receiver)`返回obj.foo的结果是一个普通对象,即`{ bar:1 }`,这不是一个响应式对象,所以在副作用函数中访问obj.foo.bar时,并不会触发响应.  

要解决这个问题,我们需要对`Reflect.get`返回的结果进行代理.  

```js
function reactive(obj) {
    const proxy = new Proxy(obj, {
        get(target, key, receiver) {
            if(key === 'raw'){
                return target
            }

            track(target, key)
            const result = Reflect.get(target, key, receiver)
            if(isObject(result)){
                return reactive(result)
            }
            return result
        }
    })
}
```

这里我们使用`isObject`函数判断`Reflect.get`返回的结果是否是一个对象,如果是,则对结果进行代理.这样,当读取obj.foo.bar时,`Reflect.get`返回的结果是一个代理对象,所以当读取obj.foo.bar时,会触发响应.  

然而,并不是所有情况下我们都希望深响应,这就催生了shallowReactive,即浅响应,就是只有对象的第一层属性是响应的.这需要封装一个新函数

```js
function createReactive(obj, shallow = false) {
    const proxy = new Proxy(obj, {
        get(target, key, receiver) {
            if(key === 'raw'){
                return target
            }
            const result = Reflect.get(target, key, receiver)
            track(target, key)
            
            if(shallow) {
                return result
            }
            
            if(isObject(result)){
                return reactive(res)
            }  
            
            return result
        }
        //其他拦截函数
    })
}
```

有了这个函数,我们就可以轻松实现reactive和shallowReactive了  

```js
function reactive(obj) {
    return createReactive(obj)
}

function shallowReactive(obj) {
    return createReactive(obj, true)
}
```

这一p先到这里罢

> 写于西13