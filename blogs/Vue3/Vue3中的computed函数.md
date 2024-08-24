---
title: Vue3中的computed函数
date: 2024-04-20 16:28:27
tags: [computed,vue源码]
categories:
  - Vue3
---
## computed的使用和源码

### computed的使用
computed有两种使用方式,一种接收一个对象,包含get(),set()函数,还有一种只接收一个getter()函数,但是用此方法返回的响应式属性是只读的(无set方法)

以下进行一个简单的小demo演示computed的基础用法

<!--more-->

```typescript
const front = ref('哈哈哈')
const end = ref('嘻嘻嘻')

const all = computed(( ) => {
    return front + end;
})

//下面这种写法会报错,因为all具有只读属性
const changeValue = () => {
    all.value = '啊吧吧吧吧'
}
```

### computed背后的原理

computed函数使用的脏值检测的机制,判断该属性的依赖是否发生变化,若发生变化,则重新计算属性,若没发生变化,则使用缓存中的值  

一下对源码进行简单实现  

```typescript
export const computed = ( getter:Function ) => {
    let _value = effect(getter,{
        scheduler: () => { _dirty = true }//当依赖发生变化的时候,effect函数会使用scheduler来更新——dirty的值
        //关于如何实现
        //给effcet函数加上有scheduler函数的Options属性,当依赖发生变化的时候,如果含有此Options,则进行一次scheduler函数的调用
    })
    let _dirty = true
    let changeValue;
    class ComputedRefImpl {
        get value(){//劫持value
            if(_dirty) {
                changeValue = _value()
                _dirty = false
            }
            return changeValue
        }
    }
}
```

以上就是computed的简单使用和大致原理

>重新学习Vue3 第八天  
> 写于书咖
