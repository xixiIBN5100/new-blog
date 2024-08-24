---
title: Vue的设计与实现----响应系统的作用与实现(p2)
date: 2024-07-21 21:58:42
tags: [Vue源码,响应式原理]
categories:
  - Vue3
---

## 嵌套的effect与effect栈  

~~唉又是一个响应系统的拦路虎~~    


<!--more-->

effect是可以发生嵌套的,比如  

```js
let temp1,temp2
const obj = {bar: 1, foo: 2}

effect(() => {
    console.log('first')
    effect(() => {
        console.log('second')
        temp1 = obj.bar
    })
    temp2 = obj.foo
})
```

当我们修改obj.foo的值的时候,会发现触发的是内层副作用函数的执行,而我们期望是外层副作用函数的执行  

这是因为在调用内层effect函数的时候,activeEffect被覆盖,而且不会恢复原来的值,这就会导致即使是外层函数收集依赖,收集到的也是内层函数的依赖  

于是我们需要维护一个effect栈,当调用effect函数的时候,将当前effect压入栈中,当effect函数执行完毕的时候,将栈顶的effect弹出,这样当修改obj.foo的时候,就会触发外层函数的副作用函数执行  

```js
let acctiveEffect = null
let effectStack = []

function effect(fn) {
    const effectFn = () => {
        cleanup(effectFn)
        acctiveEffect = effectFn
        effectStack.push(effectFn)
        fn()
        effectStack.pop()//弹出
        acctiveEffect = effectStack[effectStack.length - 1]//还原
    }
    effectFn.deps = []
    effectFn()
}

```

## 调度执行  

可调度性是响应系统非常重要的特性,关在在于trigger函数触发触发副作用函数重新执行的时候,我们有能力控制副作用函数执行的时机,次数以及方式  

那么我们就要在effect函数上加点工  

```js
function effect(fn, options = {}) {
    const effectFn = () => {
        cleanup(effectFn)
        acctiveEffect = effectFn
        effectStack.push(effectFn)
        fn()
        effectStack.pop()
        acctiveEffect = effectStack[effectStack.length - 1]
    }
    effectFn.options = options
    effectFn.deps = []
    effectFn()
}
```

在这里,我们给effect加上了option参数,在trigger函数中触发时,可以直接调用用户提供的调度函数  

```js
effectsToRun.forEach(effectFn => {
    if (effectFn.options.scheduler) {
        effectFn.options.scheduler(effectFn)
    } else {
        effectFn()
    }
})
```
 
## 计算属性computed与lazy  

有了调度器,我们也许可以来尝试实现一下计算属性computed  

在这之前,我们先了解一下lazy  

### 懒执行的effect  
lazy是effect.option的一个参数,当lazy为true的时候,effect函数不会立即执行,而是返回一个getter函数,当getter函数被调用的时候,才会执行effect函数  

那么我们又又又要修改一下effect函数,在调用fn的时候,先判断lazy,如果是true,则返回一个getter函数,否则直接执行fn  

```js
//非lazy执行
if(!options.lazy){
    effectFn()
}
//否则返回getter函数
return effectFn
```

假如我们让effect函数计算两个数的值  

```js
const add = effect(() => {
    () => obj.foo + obj.barsSize
    {
        lazy: true        
    }
})

add()
```

这样我们希望在手动调用的时候能够得到和,那我们再对effect函数进行就修改  

```js
function effect(fn, options = {}) {
    const effectFn = () => {
        cleanup(effectFn)
        acctiveEffect = effectFn
        effectStack.push(effectFn)
        const res = fn()
        effectStack.pop()
        acctiveEffect = effectStack[effectStack.length - 1]
        return res //储存运算结果,调用时返回值
    }
}
```

### computed计算属性  

基于上面,我们可以来写一个computed函数,他接收一个getter函数  

```js

function computed(getter) {
    const effectFn = effect(getter, {
        lazy: true
    })
    const obj = {
        get value() {
            return effectFn()
        }
    }
    return obj
}
```

computed函数返回一个对象,对象有一个value属性,当访问value属性的时候,会调用effectFn函数,并返回effectFn函数的返回值  

然而这里有一个问题,我们每次访问value属性的时候,都会执行effectFn函数,这显然是不合理的,我们希望的是,当value属性被访问的时候,如果依赖的响应式数据没有发生改变,则不重新执行effectFn函数,而是直接返回上次计算的值  

这需要我们对值进行缓存功能  

```js
function computed(getter) {
    let value 
    let dirty = true
    const effectFn = effect(getter, {
        lazy: true,
    })
    
    const obj = {
        get value() {
            if(dirty){
                value = effectFn()
                dirty = false
            }
            return value
        }
    }
    return obj
}
```

这样写依然不完整,因为dirty的值被改变后一直是false,即不会再触发重新计算,这时候就需要我们的调度器出场啦  

```js
function computed(getter) {
    let value
    let dirty = true
    const effectFn = effect(getter, {
        lazy: true,
        scheduler() {
            dirty = true
        }
    })
    
    const obj = {
        get value() {
            if(dirty){
                value = effectFn()
                dirty = false
            }
        }
    }
    return obj
}
```

这样,在每次getter函数中所依赖的响应式数据发生变化大时候,dirty的值会被设置为true,当访问value属性的时候,会重新执行effectFn函数,并返回effectFn函数的返回值,当依赖的响应式数据没有发生改变的时候,直接返回上次计算的值  

但是我们这套系统还不完善 ~~还有高手~~  

```js
const sum = computed(() => obj.foo + obj.bar)

effect(() => {
    console.log(sum.value)
})

obj.foo++
```


我们希望在自增操作以后触发副作用函数,但是实际上我们现在的代码是做不到值一点的.因为computed函数内的effect只有真正读取计算属性的值的时候才会执行.外层的effect不会被内层effect中的响应式数据收集.  

所以当读取计算属性的值的时候,手动调用track函数,当计算属性依赖的响应式数据发生改变的时候,手动调用trigger函数.  

```js
function computed(getter) {
    let value
    let dirty = true
    
    const effectFn = effect(getter, {
        lazy: true,
        scheduler() {
            dirty = true
            // 当计算属性依赖的响应式数据发生变化的时候,手动调用trigger触发响应
            trigger(obj, 'value')
        }
    })
    
    const obj = {
        get value() {
            if(dirty) {
                value = effectFn() 
                dirty = false
            }
            // 当读取value的时候,手动调用track函数进行追踪
            track(obj,'value')
            return value
        }
    }
    return obj
}
```

这样就能够解决这个问题啦


> 写于西13