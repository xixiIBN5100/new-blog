---
title: 重识Ref
date: 2024-04-15 23:34:45
tags: [vue源码]
categories:
  - Vue3
---
## Ref函数

常见的有关Ref的函数有ref() , shallowRef() , triggerRef() , customRef()

<!--more-->

### Ref
ref返回的是一个**class对象**,访问值需要.value操作

### shallowRef
shallowRef()包裹的对象只能在value层进行响应式处理(值会更新但视图不会更新),但是如果和Ref对象一起操作则会一起响应式更新(和源码有关以后有机会讲)

### triggerRef
强制收集ref类型变量的依赖进行更新,能将shallowRef进行强制的视图更新

### customRef
customRef是用来自定义一个Ref对象,手动收集和更新依赖,类似于响应式源码
```javascript
function MyRef<T> (value: T){
    return customRef((track, trigger)=> {
        return {
            get() {
                track()
                return value
            },
            set(newVal) {
                value = newVal
                trigger()
            }
        }
    })
}
```  

~~时间紧水一篇~~、

>重新学习Vue3第六天  
> 写于寝室