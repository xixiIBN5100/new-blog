---
title: Vue的设计与实现----响应系统的设计与实现(p4)
date: 2024-07-27 14:33:44
tags: [Vue源码,响应式原理]
categories:
  - Vue3
---

从这一p开始,我们将学习 **非原始值的响应式方案**  

<!--more-->

## 认识Reflect  

Reflect是一个全局对象, 它提供了拦截 JavaScript 操作的方法.  

```js
const obj = {foo:1}

//直接读取
console.log(obj.foo)

//用Reflect读取
console.log(Reflect.get(obj,'foo'))
```

这两个操作是等价的,事实上,Reflect.get还有第三个参数receiver,可以把它理解为函数中的this  


```js
const onj = {foo:1}

console.log(Reflect.get(obj,'foo',{ foo:2 }))
//2
```

这对我们改良响应式原理是有帮助的.我们先让问题暴露出来   

```js
const obj = {
    foo:1,
    get bar(){
        return this.foo
    }
}

effect(()=>{
    console.log(obj.bar) //1
})

obj.foo++
```

我们希望能在obj.foo++的时候,能触发响应式系统,但是使用`return target[key]`的时候,this指向的是原始对象,而不是代理对象,所以无法触发响应式系统.  

等价于

```js
effect(()=>{
    console.log(obj.bar)//obj不是响应式对象
})
```

所以我们会在这里使用Reflect函数
[Vue3的响应式原理](https://xixiibn5100.github.io/2024/04/17/Vue3%E7%9A%84%E5%93%8D%E5%BA%94%E5%BC%8F%E5%8E%9F%E7%90%86/)


## 如何代理Object  

### 拦截in操作符  

使用拦截函数 `has`  

```js
const obj = { foo:1 }
const proxy = new Proxy(obj,{
    has(target,key){
        track(target,key)
        return Reflect.has(target,key)
    }
})

effect(()=>{
    'foo' in proxy
}) //建立依赖关系
```

### 拦截for...in循环  

使用拦截函数 `ownKeys`  

```js
const obj = { foo:1 }
const ITERATE_KEY = Symbol()

const p = new Proxy(obj,{
    ownKeys(target){
        track(target,ITERATE_KEY)
        return Reflect.ownKeys(target)
    }
})
```

为什么需要ITERATE_KEY呢?  

拦截ownKeys操作即可间接拦截for...in循环.这个拦截函数与grt/set不同,在set/get中,我们可以得到具体操作的key,但是在ownKeys中,我们只能拿到目标对象target.  

这也很符合直觉,在读写属性的时候,我们清楚的知道读写的是哪一个属性.而ownKeys用来获取一个对象所有的键值,这个操作明显不与任何具体的键值进行绑定,所以我们要构造唯一的key作为标识.  

既然追踪的是ITERATE_KEY,那么相应的在触发响应的是时候也要触发他`track(target,ITERATE_KEY)`  

那么在什么情况下触发与ITERATE_KEY相关联的响应呢?  

```js
const obj = { foo:1 }
const p = new Proxy(obj,{/* ... */})

effect(()=>{
    for(const key in p){
        console.log(key) //foo
    }
})

p.bar = 2
```

当我们给p添加新属性bar的时候,我们期望会触发副作用函数(因为key的个数变成了两个),触发ITERATE_KEY的响应.而在目前set拦截函数接收到的key只有bar,所以触发trigger的时候也是会执行与bar相关的副作用函数  

我们又又又要完善一下trigger函数  

```js
function trigger(target,key){
    const depsMap = targetMap.get(target)
    if(!depsMap) return
    //取得与key相关的副作用函数
    const effects = depsMap.get(key)
    //获取与ITERATE_KEY相关的副作用函数
    const iterateEffects = depsMap.get(ITERATE_KEY)  
    
    const effectsToRun = new Set()
    effects && effects.forEach(effect => {
        if(effect !== activeEffect){
            effectsToRun.add(effect)
        }
    })
    
    iterateEffects && iterateEffects.forEach(effect => {
        if(effect !== activeEffect){
            effectsToRun.add(effect)
        }
    })
    
    effectsToRun.forEach(effect => {
        if(effect.options.scheduler){
            effect.options.scheduler(effect)
        } else {
            effect()
        }
    })
}
```

但是,如果是仅仅修改原属性的值的操作,而不是添加新属性,这也会导致触发ITERATE_KEY的副作用函数,显然这是不必要的.  

解决这个问题的核心是要能在set函数内能区分添加新属性还是设置原有属性的操作  

```js
const p = new Proxy(obj,{
    set(target,key,value,receiver){
        //判断属性在不在obj内
        const type = Object.prototype.hasOwnProperty.call(target,key) ? 'SET' : 'ADD'
        //设置属性值
        const res = Reflect.set(target,key,value,receiver)
        trigger(target,key,type)
        return res
    }
})

```

我们也要对应的修改一下trigger函数  

```js
function trigger(target,key,type){
    const depsMap = targetMap.get(target)
    if(!depsMap) return
    const deps = depsMap.get(key)
    
    const effectsToRun = new Set()
    deps && deps.forEach(effect => {
        if(effect !== activeEffect){
            effectsToRun.add(effect)
        }
    })
    if(type === 'ADD' ){
        //操作类型为ADD的时,才触发与ITERATE_KEY相关的副作用函数
        const iterateEffects = depsMap.get(ITERATE_KEY)
        iterateEffects && iterateEffects.forEach(effect => {
            if(effect !== activeEffect){
                effectsToRun.add(effect)
            }
        })
    }
    
    effectsToRun.forEach(effect => {
        if(effect.options.scheduler){
            effect.options.scheduler(effect)
        } else {
            effect()
        }
    })
}
```

通常我们会将操作类型封装成一个枚举类型.  
```js
const TriggerType = {
    SET: 'SET',
    ADD: 'ADD'
}
```

### 删除属性操作的代理  

可以使用拦截函数 `deleteProperty`  

```js
const p = new Proxy(obj,{
    deleteProperty(target,key){
        //检查被操作的属性是否是对象自己的属性
        const hadKey= Object.prototype.hasOwnProperty.call(target,key)
        //使用Reflect.deleteProperty完成属性的删除
        const res = Reflect.deleteProperty(target,key)
        
        if(hadKey && res){
            //删除属性,且属性存在于对象自己,则触发ITERATE_KEY相关副作用函数
            trigger(target,key,'DELETE')
        }
        
        return res
    }
})
```

delete操作也会触发ITERATE_KEY的副作用函数.在trigger函数中加上`type === 'DELETE'`的判断即可,不再赘述.  

> 写于西13







