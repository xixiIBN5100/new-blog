---
title: Vue的设计与实现----响应系统的设计与实现(p6)
date: 2024-07-31 14:59:43
tags: [Vue源码,响应式原理]
sidebar: 'auto'
categories:
  - Vue3
---

## 代理数组  
这一p我们开始实现代理数组.数组相对于普通对象有更多的读取和设置方法.我们先从通过索引读取或这只数组的元素值开始.  

<!--more-->

### 数组的索引与length  

规范中明确说明,如果设置的索引大于数组当前的长度,那么要更新数组的length属性.所以通过索引设置元素值的时候,可能会隐式的修改`length`属性值.  

所以在触发响应的时候也应该触发与`length`属性相关的依赖.为了实现这一点,我们需要修改拦截函数`set`  

```js
function createReactiveArray(obj, isShallow = false) {
    return new Proxy(obj, {
        set(target, key, value, receiver) {
            const oldVal = target[key]
            const type = Array.isArray(target)
            //如果代理目标式数组,则检测被设置的索引值是否小于数组长度
            //如果是则视为SET,否则是ADD操作  
            ? Number(key) < target.length ? 'SET' : 'ADD'
            : Object.prototype.hasOwnProperty.call(target, key) ? 'SET' : 'ADD'
            
            const res = Reflect.set(target, key, value, receiver)
            if(target === reciver.raw){
                if(oldVal !== value && (oldVal === oldVal || value === value)){
                    trigger(target, key, type)
                }
            }
            return res
        }
        // 省略其他拦截函数
    })
}
```

这样我们在代理数组的时候就会将设置的索引值和当前长度做比较,判断是否是SET还是ADD操作,从而触发`length`相关响应.  
当然我们也要完善一下trigger函数  

```js
function trigger(target, key, type) {
    const depsMap = targetMap.get(target)
    if(!depsMap) return
    //省略
    if(type === 'ADD' && Array.isArray(target)){
        //取出length相关联的副作用函数
        const lengthEffects = depsMap.get('length')
        lengthEffects && lengthEffects.forEach(effect => {
            if(effect !== activeEffect){
                effectToRun.push(effect)
            }
        })
    }
    //触发effect
}
```

反过来思考,我们会发现设置数组的length的时候,也有可能改变数组元素.  

```js
const arr = reactive([1,2,3])
effect(() => {
    console.log(arr[0])
})
arr.length = 0
```

如上述代码所示,将数组的长度设为0,那么数组中所有元素都会被删除.而假如我们设置长度为100,则不会影响数组中的.容易看出,当修改length属性的时候,只有索引值大于等于新length属性值才需要触发响应.在调用`trigger`函数的时候,应该把新的length属性值传递过去.  

```js
function trigger(target, key, type, newVal) {
    const depsMap = targetMap.get(target)
    if(!depsMap) return
    //省略
    if(Array.isArray(target) && key === 'length'){
        //对于索引大于或等于新length属性值的副作用函数,需要重新触发
        depsMap.forEach((effects, key) => {
            if(key >= newVal){
                effects.forEach(effect => {
                    if(effect !== activeEffect){
                        effectToRun.push(effect)
                    }
                })
            }
        })
    }
}
```

### 遍历数组  
数组对象可以使用`for...in`循环遍历.但是有必要指出,我们应该尽量避免使用`for...in`循环遍历数组.但既然在语法上是可行的,我们也需要考虑到.  

添加新元素和修改数组长度都会影响到遍历.实质上,一旦数组的length发生变化,那么遍历的结果就会改变.自然的,我们可以在`ownKeys`拦截函数内判断当前操作对象是否为数组,如果是,则使用length作为key建立响应式联系.  

```js
function createReactive(obj, isShallow = false) {
    return new Proxy(obj, {
        //省略其他拦截函数
        ownKeys(target) {
            // 如果操作对象是数组,则使用length作为key并建立响应联系
            track(target,Array.isArray(target) ? 'length' : ITERATE_KEY)
            return Reflect.ownKeys(target)
        }
    })
}
```

这样就能正确触发响应啦  

接下来我们来看看用`for...of`循环遍历数组. 很遗憾就我们现在的代码而言,已经实现了这种遍历的响应.因为`for...of`循环会调用`Symbol.iterator`方法,而`Symbol.iterator`方法会返回一个迭代器,迭代器的`next`方法会返回一个包含value和done两个属性的对象.  

这就表明只要在副作用函数与数组的长度和索引之间建立响应联系,那么`for...of`循环遍历数组的响应就会生效.我们已经实现了(> = <).  

### 数组的查找方法  

数组的方法内部其实都依赖了对象的基本语义.大多数情况下,我们不需要做处理就可以让这些方法按照预期工作.  

```js
const arr = reactive([1,2,3])
effect(() => {
    console.log(arr.includes(1))
})
arr[0] = 3 // 触发响应,打印false
```
然而`includes`方法并不总是按照预期工作  

```js
const obj = {}
const arr = reactive([obj])
console.log(arr.includes(arr[0])) //false
```

很明显,按照正常情况来说,应该打印true.实际上却打印false,这是因为`includes`方法内部会通过arr访问数组元素,读取obj的时候,因为他是一个对象,所以会返回一个代理对象(深响应).  

而`arr[0]`访问obj的时候也会返回一个代理对象,这两个代理对象是不同的,因为每次调用`reactive`都会返回一个新的代理对象.  

解决方案如下   
```js
// 定义一个map实例,存储宣誓对象到代理对象的映射
const reactiveMap = new Map()

function reactive(obj) {
    // 优先通过原始对象obj寻找之前创造的代理对象,如果找到了,返回已有的代理对象
    const existionProxy = reactiveMap.get(obj)
    if(existionProxy) return existionProxy
    
    // 否则创造新的代理对象
    const proxy = creatReactive(obj)
    reactiveMap.set(obj, proxy)
    return proxy
```

这样我们就能避免给一个原始对象多次创建代理对象的问题.原先的例子亦能能够正常输出.  

然而不能高兴的太早.  

```js
const obj ={}
const arr = reactive([obj])

console.log(arr.includes(obj)) //false
```

我们直接把原始对象传给`includes`方法,这是很符合直觉的行为,我们希望他输出true.为什么会输出false呢?  

原因很简单,`includes`内部的`this`是指向代理对象`arr`,获取元素得到的值也肯定是代理对象,所以拿原始对象obj查找肯定找不到,必定会返回false.  

为此,我们需要重写数组的`includes`方法才能解决这个问题.  

```js
const arrayInstrumentations = {
    includes: function () {/*...*/}
}

function createReactive(obj, isShallow = false) {
    return new Proxy(obj, {
        //拦截读取操作
        get(target, key, receiver) {
            if(key === 'raw'){
                return target
            }
            // 如果操作的对象是数组,并且key存在于arrayInstrumentations对象中,则返回arrayInstrumentations[key]
            if(Array.isArray(target) && arrayInstrumentations.hasOwnProperty(key)){
                return Reflect.get(arrayInstrumentations, key, receiver)
            }
            //省略...
        }
    })
}
```

在上段代码中,我们修改了`get`拦截函数,目的是重写数组的`includes`方法.  

`arr.includes`可以理解为读取代理对象`arr`中的`includes`属性,这就会触发get拦截函数.如果target为数组并且读取的键值存在于`arrayInstrumentations`上,则返回`arrayInstrumentations`对象上对应的值.  

也就是说当执行`arr.includes`的时候,实际执行的是`arrayInstrumentations.includes`方法,实现了重写.  

```js
const originalIncludes = Array.prototype.includes
const arrayInstrumentations = {
    includes: function (...args) {
        // this是代理对象,先在代理对象中查找,将结果储存在res中
        let res = originalIncludes.apply(this, args)
        
        if(res === false) {
            //res 为false,说明在代理对象中找不到,通过this.raw拿到原始数组,再去查找并更新res值
            res = originalIncludes.apply(this.raw, args)
        }
        //返回最终结果
        return res
    }
}
```

这个重写实现了先在代理对象上查找,如果找不到,就会通过raw拿到原始数据,再去查找并更新res值.这样我们之前的代码就能符合预期了.  

除了`includes`方法外,还有`indexOf`和`lastIndexOf`方法需要进行这样的处理.  

```js
const arrayInstrumentations ={}
['includes', 'indexOf', 'lastIndexOf'].forEach(method => {
    const originMethod = Array.prototype[method]
    arrayInstrumentations[method] = function (...args) {
        let res = originMethod.apply(this, args)

        if(res === false) {
            res = originMethod.apply(this.raw, args)
        }
        return res
    }
})

```

### 隐式改变数组长度的原型方法

以`push`为例,当调用push方法向数组中添加元素的时候,即会读取读取数组的length属性值,也会设置length的属性值.这会导致两个独立的副作用函数相互影响.  
```js
const arr = reactive([])
effect(() => {
    arr.push(1)
})

effect(() => {
    arr.push(1)
})
```

如果尝试运行上述代码,会得到栈溢出的错误.为什么会这样呢  
![](/assets/img/push.png)

所以我们要重写数组的push方法  
```js
//一个标记变量,代表是否进行追踪
let shouldTrack = true
;['push'].forEach(method => {
    //获取原始的push方法
    const originMethod = Array.prototype[method]
    //重写
    arrayInstrumentations[method] = function (...args) {
        //在调用原始方法之前,禁止追踪
        shouldTrack = false
        //push的默认行为
        let res = originMethod.apply(this, args)
        //在调用原始方法之后,恢复追踪
        shouldTrack = true
        return res
    }
})
```

最后,我们还需要修改一下track函数  
```js
function track(target, key) {
    if(!activeEffect || !shouldTrack) return
}
```
当push方法间接获取length属性的时候,此时是禁止追踪状态,所以length属性与副作用函数之间就不会建立联系.这样一来,之前的代码就可以正常工作了.  

其他一些方法也要做蕾丝处理  

```js
let shouldTrack = true
;['pop', 'shift', 'unshift', 'splice'].forEach(method => {
    const originMethod = Array.prototype[method]
    arrayInstrumentations[method] = function (...args) {
        shouldTrack = false
        let res = originMethod.apply(this, args)
        shouldTrack = true
        return res
    }
})
```

~~沟槽的代理数组终于结束了写死我了~~  

> 写于西13