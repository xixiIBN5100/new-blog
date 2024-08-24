---
title: Vue的设计与实现----响应系统的设计与实现(p7)
date: 2024-08-05 16:04:39
tags: [Vue源码,响应式原理]
categories:
  - Vue3
---

这一p我们实现Set和Map的响应式实现

<!--more-->

## 代理Map和Set  
先看如下代码  

```js
const s = new Set([1,2,3])
const p = new Proxy(s, {})

console.log(p.size) //报错
```
当运行上述代码的时候,在读取代理对象的`size`的时候,会得到一个错误.错误的大意是**在不兼容的`reciver`上调用了`get Set.prototype.size`方法**  

size属性是一个访问器属性,作为方法被调用了.通过查阅规范一可以证实这一点.  

在代理对象身上访问size的时候,会调用`get Set.prototype.size`方法,但是这个方法被调用的时候,`this`指向的是代理对象,而不是原始对象.  
显然,代理对象没有`[[ SetData ]]`内部槽,所以会抛出错误.  

为了修复这个问题,需要修正`gettter`函数执行的`this`指向为原始对象.  

```js
const s = new Set([1,2,3])
const p = new Proxy(s, {
    get(target, key, receiver) {
        if(key === 'size') {
            return Reflect.get(target, key, target) //指向原始对象
        }
        // 读取其他属性的默认行为
        return Reflect.get(target, key, receiver)
    }
})
```

接着,我们尝试在Set中删除数据  
```js
const s = new Set([1,2,3])
const p = new Proxy(s, {})

p.delete(1)//报错
```
可以看到,调用delete方法的时候会得到一个报错,与前文的p.size十分相似.  

实际上,访问`p.size`与访问`p.delete`是不同的.size是一个属性,而delete是一个方法.当访问p.size的时候,访问器属性的getter函数会立即执行,此时我们可以修改receiver来改变getter函数的this指向  

而当访问delete的时候,delete方法并没有执行.真正让delete方法执行的是p.delete(1)这句函数调用.因此,无论怎么修改receiver,delete方法执行时的this都会指向代理对象,而不会指向原始对象.  

想要修复这个问题只需要将delete方法与原始对象绑定即可  
```js
const s = new Set([1,2,3])
const p = new Proxy(s, {
    get(target, key, receiver) {
        if(key === 'size') {
            return Reflect.get(target, key, target)
        }
        //将方法与原始对象绑定后返回
        return target[key].bind(target)
    }
})
//正确执行
p.delete(1)
```

## 建立响应联系

```js
const p = reactive(new Set([1,2,3]))

effect(() => {
    console.log(p.size)
})

p.add(4)
```
当我们调用add方法的时候,会间接改变size属性值,我们期望副作用函数会重新执行.为了实现这个目标,我们需要在访问size属性值调用track函数进行追踪,然后在add方法执行时调用trigger函数触发响应.  

```js
function createReactive(obj, isShallow = false, isReadonly = false) {
    return new Proxy(obj, {
        get(target, key, receiver) {
            if(key === 'size') {
                track(target, ITERATE_KEY)
                return Reflect.get(target, key, target)
            }
            
            return target[key].bind(target)
        }
    })
}
```
这里需要注意,响应式需要建立在ITERATE_KEY和副作用函数之间.这是因为任何新增,删除的操作都会影响ket属性.接着,我们需要重写一个能触发trigger函数的add方法.  

```js
const mutableInstrumentations = {
    add(key) {
        // this 仍然指向的是代理对象,通过raw属性获取原始对象
        const target = this.raw
        //通过原始对象执行add方法
        const res = target.add(ket)
        //调用trigger触发响应
        trigger(target, key ,'ADD')
        return res
    }
}

function createReactive(obj, isShallow = false, isReadonly = false) {
    return new Proxy(obj, {
        get(target, key, receiver) {
            if(key === 'raw') {
                return target
            }
            if(key === 'size') {
                track(target, ITERATE_KEY)
                return Reflect.get(target, key, target)
            }
            //返回自定义方法
            return mutableInstrumentations[key]
        }
    })
}
```

在trigger函数的实现中,只有ADD和DELETE操作会触发ITERATE_KEY的副作用函数(在这里指的就是size相关副作用函数)  

当然,如果add方法添加的元素已经存在于集合中了,就不用触发响应了,我们可以对代码进行如下性能优化.  

```js
const mutableInstrumentations = {
    add(key) {
        const target = this.raw
        const hadKey = target.has(key)
        if(!hadKey) {
            const res = target.add(key)
            trigger(target, key ,'ADD')
        }
        return res
    }
}
```
这样就可以避免不必要的触发响应.  

类似的,我们也可以实现delete方法,如下  

```js
const mutableInstrumentations = {
    delete(key) {
        const target = this.raw
        const hadKey = target.has(key)
        if(hadKey) {
            const res = target.delete(key)
            trigger(target, key ,'DELETE')
        }
        return res
    }
}
```
与add方法不同的是,delete方法只有在要删除的元素确实在集合中,才需要触发响应.  

## 避免污染原始数据

本节我们借助Map类型数据中的set和get方法来理解什么是"避免污染原始数据"及其原因.  

当调用get读取数据的时候.需要调用track追踪依赖建立响应式联系;当调用set方法的时候,需要调用trigger触发响应.  

```js
const p = reactive(new Map([['foo', 1]]))

effect(() => {
    console.log(p.get('foo'))
})

p.set('foo', 2)//触发响应
```

下面是get方法的具体实现.  
```js
const mutableInstrumentations = {
    get(key) {
        const target = this.raw
        const hadKey = target.has(key)
        if(hadKey) {
            track(target, key)
            const res = target.get(key)
            return isObject(res) ? reactive(res) : res
        }
    }
}
```

接下来我们实现set方法.

```js
const mutableInstrumentations = {
    set(key, value) {
        const target = this.raw
        const hadKey = target.has(key)
        const oldValue = target.get(key)
        target.set(key, value)
        if(!hadKey) {
            //不存在意味着新增
            trigger(target, key ,'ADD')
        } else {
            if(value !== oldValue) {
                // 存在并且新旧值不一致则意味着修改
                trigger(target, key ,'SET')
            }
        }
    }
}
```
即使上面的set方法能够正常工作,但它依然存在问题,即set方法会污染原始数据.下面就是个例子.  

```js
const m = new Map()
const p1 = reactive(m)
const p2 = reactive(new Map())

p1.set('p2',p2)

effect(() => {
    //用原始数据访问p2
    console.log(m.get('p2').size)
})
//用原始数据为p2设置一个键值对
m.get('p2').set('foo', 1)//触发了响应式
```

在这段代码中,我们使用原始数据来读取数据值,有通过原始数据设置数据值,居然发现副作用函数重新执行了.但是我们期望原始数据不具有响应式的特征,导致问题的罪魁祸首就是set方法.  

不难发现,`target.set(key, value)`并没有对`value`是否是响应式数据做出判断.所以在上述代码中,我们将原始数据m的值上设置了一个响应数据p2,我们吧这种将响应式数据设置到原始数据上的行为称为**数据污染**.  

解决这个问题只需要在`target.set(key, value)`之前判断value是否是响应式数据即可,如果是,则用`raw`获取原型.  

```js
const mutableInstrumentations = {
    set(key, value) {
        const target = this.raw
        const hadKey = target.has(key)
        const oldValue = target.get(key)
        const rawValue = value.raw || value
        target.set(key, rawValue)
        if(!hadKey) {
            //不存在意味着新增
            trigger(target, key ,'ADD')
        } else if(value !== oldValue)  {
                trigger(target, key ,'SET')
        }
    }
}
```
现在的实现就不会造成数据污染啦.除了get方法,Set类型的add方法、普通对象的写值操作,还有为数组添加元素的方法等,都需要类似的处理.  


## 处理forEach  

```js
const m = new Map([
    [{ key: 1}, { value: 1}]
])

effect(() =>{
    m.forEach((value, key, m) => {
        console.log(value) // { value: 1 }
        console.log(key) // { key: 1 }
    })
})
```

以map为例,回调函数接收三个参数,分别是值,键以及原始Map对象.

遍历操作只与键值对的数量有关.因此任何会修改map对象键值对数量的操作都会触发回调函数.例如delete和add方法.所以当forEach函数被调用的时候,我们应该让副作用函数和`ITRERATE_KEY`建立响应式联系.  

```js
const mutableInstrumentations = {
    forEach(callback) {
        //获取原始对象
        const target = this.raw
        track(target, ITERATE_KEY)
        //调用原始对象上的forEach方法
        target.forEach(callback)
    }
}
```

这样虽然能够让我们代码按照预期运行.然而上面的forEach函数仍然存在缺陷,我们自定义的forEach方法中,通过原始数据调用了原生的forEach方法,这意味着传递给callback回调函数的参数将是非响应式数据,会导致一下代码不能正常工作.  

```js
const key = { key: 1 }
const value = new Set([1,2,3])
const p = reactive(new Map([[key, value]]))

effect(() => {
    p.forEach(function (value,key) {
        console.log(value.size) //3
    })
})

p.get(key).delete(1)
```

我们尝试删除Set中的1,但是副作用函数并没有重新执行.这里的问题在于当通过value.size访问size属性的时候,value是原始对象,即`new Set([1,2,3])`,因此我们无法在原始数据上建立响应式联系.  

但是这很不符合直觉,reactive本身是深响应,forEach方法的回调函数所接收的参数也应该是响应式数据才对.我们需要对函数进行一些修改.  

```js
const mutableInstrumentations = {
    forEach(callback) {
        //warp函数用来把可代理的值转换为响应式数据
        const warp = (value) => typeof value === 'object' ? reactive(value) : value
        const target = this.raw
        track(target, ITERATE_KEY)
        target.forEach((value, key) => {
            //手动调用callback,用warp函数包装value和key再传给callback,这样就实现了深响应
            callback(warp(value), warp(key), target)
        })
    }
}
```

至此,我们的工作还没有完成.可以发现,Map类型的forEach方法不仅仅遍历了key,也遍历的value,也就是说不仅仅是DELETE和ADD操作会影响遍历结果,SET操作也会影响遍历结果.  

于是我们应该修改trigger方法弥补这一缺陷.  

```js
function trigger(target, key, type, newVal) {
    const depsMap = targetMap.get(target)
    if(!depsMap) return
    const effects = depsMap.get(key)
    
    const effectsToRun = new Set()
    effects && effects.forEach(effect => {
        if(effect !== activeEffect) {
            effectsToRun.add(effect)
        }
    })
    
    if(
        type === 'ADD' ||
        type === 'DELETE' ||
        (
            type === 'SET' &&
            Object.prototype.toString.call(target) === '[object Map]'
        )) {
        const iterateEffects = depsMap.get(ITERATE_KEY)
        iterateEffects && iterateEffects.forEach(effect => {
            if(effect !== activeEffect) {
                effectsToRun.add(effect)
            }
        })
    }
    
    //省略部分内容
    effectsToRun.forEach(effect => {
        if(effect.options.scheduler) {
            effect.options.scheduler(effect)
        } else {
            effect()
        }
    })
}
```
这样就可以保证Map的forEach方法正常运作.  

## 迭代器方法  

集合类型有三个迭代方法
- entries
- keys
- value  

调用这些方法会得到响应的迭代器,并且可以使用for...of进行迭代.  

另外,由于Map和Set类型本身部署了`Symbol.iterator`方法,因此它们也可以直接使用for...of进行迭代.  
```js
for(const[key,value] of m) {
    console.log(key,value)
}
```
当然我们也可以得到迭代器对象以后手动调用next方法,事实上`m[Symblo.iterator]`与`m.entries()`等价.  

现在我们尝试代理迭代器方法.  

```js
const p = reactive(new Map([
    ['key1','value1'],
    ['key2','value2']
]))

effect(() => {
    //TypeError: p is not iterable
    for(const[key,value] of p) {
        console.log(key,value)
    }
})

p.set('key3','value3')
```

我们尝试调用代理对象p的 for...of方法,得到了p不可以迭代的错误.代理对象上当然没有迭代器方法,这就需要自定义返回原始对象上的迭代器属性.  

```js
const mutableInstrumentations = {
    [Symbol.iterator]() {
        const target = this.raw
        return target[Symbol.iterator]()
    }
}
```

然而事情不可能这么简单,前文提到过,传给callback函数的参数应该但是包装后的响应式数据,同理,使用for...of循环迭代时,如果产生的值是可以被代理的,那么也应该包装成响应式数据.  
```js
const mutableInstrumentations = {
    [Symbol.iterator]() {
        const target = this.raw
        const itr = target[Symbol.iterator]()
        const warp = (value) => typeof value === 'object' ? reactive(value) : value
        
        track(target, ITERATE_KEY)
        //返回自定义的迭代器
        return {
            next() {
                //调用原始迭代器的next方法获取value和done
                const {value,done} = itr.next()
                return {
                    value: value ? [warp(value[0]),warp(value[1])] : value,
                    done
                }
            },
            //实现可迭代协议,适配.entries()方法
            [Symbol.iterator]() {
                return this
            }
        }
        
    }
}
```

## values 与 keys 方法

values方法的实现与entries方法类似,不同的是,当使用dor...of迭代的时候,得到的仅仅是Map数据的值,而非键值对.  
```js
const mutableInstrumentations = {
    [Symbol.iterator]: iterationaMethod,
    entries: iterationaMethod,
    values: valuesIterationaMethod,
}

function valuesIterationaMethod() {
    const target = this.raw
    const itr = target.values()
    const warp = (value) => typeof value === 'object' ? reactive(value) : value
    track(target, ITERATE_KEY)
    return {
        next() {
            const {value,done} = itr.next()
            return {
                value: warp(value),
                done
            }
        },
        [Symbol.iterator]() {
            return this
        }
    }
}
```
keys方法的实现与values方法类似,只要更改一行代码即可.
```js
const itr = target.keys()
```

但是这样keys方法又一个缺陷,就是当操作类型为SET的时候,也会触发它的副作用函数,显然这是没必要的,遍历键并不关心其所对应的值的变化,所以keys方法可以和另一个KEY建立依赖联系.
```js
track(target, MAP_KEY_ITERATE_KEY)
```
这样我们旧实现了依赖收集的分离.SET操作不会触发keys方法的副作用函数.因此我们再修改一下trigger方法.
```js
function trigger(target, key, type, newVal) {
    //省略
    if(
        (type === 'ADD' || type === 'DELETE') &&
        Object.prototype.toString.call(target) === '[object Map]'
    ) {
        const iterateEffects = depsMap.get(MAP_KEY_ITERATE_KEY)
        iterateEffects && iterateEffects.forEach(effect => {
            if(effect !== activeEffect) {
                effectsToRun.add(effect)
            }
        })
    }
}
```

这样就能避免不必要的更新啦啦啦啦啦啦.  

终于终于写完非原始值的响应式了我勒个豆啊累死了.  

下一篇启动原始值的响应式  
> 写于西13