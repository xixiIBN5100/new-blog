---
title: Vue3中provide和inject的应用与原理
date: 2024-04-26 12:02:32
tags: [vue源码,组件通信]
categories:
  - Vue3
---
## provide与inject的使用
当我们的子组件需要访问到父组件的父组件甚至更加之前的组件的时候,使用props层层传递会显得过于冗余,我们可以使用provide在根组件注册需要传递的变量,在子组件中用inject接收  

<!--more-->

```typescript
//根组件
const colorVal = ref('red')
provide('color',colorVal)//创建一个键值对


//接收组件
const color = inject('color',ref('yellow'))//通过键访问到传递过来的值,第二个可选配置项是默认值
```
值得注意的是,这种写法不仅仅是根组件能够改变传递的参数(比如在根组件中改变colorVal的值,接收组件的值也会随之改变),而且当接收组件将color值改变的时候,根组件和其他使用该参数的组件的值也会随之改变,出于安全考虑,
在provide加入readonly就可以很好的保证安全性  

## 原理

想要理解原理,首先我们先了解一下**原型**和**原型链**  

### 原型和原型链

 - prototype 与 `__proto__`  
 prototype 一般称为显式原型，__proto__一般称为隐式原型。 每一个函数在创建之后，在默认情况下，会拥有一个名为 prototype 的属性，这个属性表示函数的原型对象。  
 - 原型链  
   当我们访问一个JS对象属性的时候，JS先会在这个对象定义的属性里找，找不到就会沿着这个对象的__proto__这个隐式原型关联起来的链条向上一个对象查找，这个链条就叫原型链。   

```typescript
function Fn() {}
Fn.prototype.name = '离谱'
let fn1 = new Fn()
fn1.age = 18
console.log(fn1.name) // 离谱
console.log(fn1.age) // 18
```

~~有点像虚方法表啊我说~~   

### provide实现
```typescript
export function provide(key, value) {
    // 获取当前组件实例
    const currentInstance: any = getCurrentInstance()
    if(currentInstance) {
        // 获取当前组件实例上provides属性
        let { provides } = currentInstance
        // 获取当前父级组件的provides属性
        const parentProvides = currentInstance.parent.provides
        // 如果当前的provides和父级的provides相同则说明还没赋值
        if(provides === parentProvides) {
            // Object.create() es6创建对象的另一种方式，可以理解为继承一个对象, 添加的属性是在原型下。
            provides = currentInstance.provides = Object.create(parentProvides)
        }
        provides[key] = value
    }
}
```  

### inject实现
```typescript
export function inject(
  key,
  defaultValue,
  treatDefaultAsFactory = false
) {
  // 获取当前组件实例对象
  const instance = currentInstance || currentRenderingInstance
  if (instance) {
    // 如果intance位于根目录下，则返回到appContext的provides，否则就返回父组件的provides
    const provides =
      instance.parent == null
        ? instance.vnode.appContext && instance.vnode.appContext.provides
        : instance.parent.provides

    if (provides && key in provides) {
      return provides[key]
    } else if (arguments.length > 1) {
      // 如果存在1个参数以上
      return treatDefaultAsFactory && isFunction(defaultValue)
        // 如果默认内容是个函数的，就执行并且通过call方法把组件实例的代理对象绑定到该函数的this上
        ? defaultValue.call(instance.proxy) 
        : defaultValue
    }
  }
}
```  

### Object.create原理    
 - Object.create()方法创建一个新的对象，并以方法的第一个参数作为新对象的__proto__属性的值（以第一个参数作为新对象的构造函数的原型对象）  


 - Object.create()方法还有第二个可选参数，是一个对象，对象的每个属性都会作为新对象的自身属性，对象的属性值以descriptor（Object.getOwnPropertyDescriptor(obj, 'key')）的形式出现，且enumerable默认为false  

模拟源码  
```typescript
Object.myCreate = function (proto, propertyObject = undefined) {
    if (propertyObject === null) {
        throw 'TypeError'
    } else {
        function Fn () {}
        // 设置原型对象属性
        Fn.prototype = proto
        const obj = new Fn()
        if (propertyObject !== undefined) {
            Object.defineProperties(obj, propertyObject)
        }
        if (proto === null) {
            // 创建一个没有原型对象的对象，Object.create(null)
            obj.__proto__ = null
        }
        return obj
    }
}
```  

### 两个连续赋值的表达式

**provides = currentInstance.provides = Object.create(parentProvides) 发生了什么?**

Object.create(parentProvides) 创建了一个新的对象引用，如果只是把 currentInstance.provides 更新为新的对象引用，那么provides的引用还是旧的引用，所以需要同时把provides的引用也更新为新的对象引用。  

**当currentInstance.provides是赋值表达式的左操作数时,他是一个被赋值的引用,当他是赋值表达式的右操作数时,他会自动计算出值**  

#### 执行顺序  
- 首先，Object.create(parentProvides) 创建了一个新的对象，继承自 parentProvides。
- 然后，currentInstance.provides = Object.create(parentProvides) 将这个新对象赋值给 currentInstance 对象的 provides 属性。
- 最后，provides = currentInstance.provides 将 currentInstance.provides 的值赋给变量 provides。  
- 
#### 效果
- 最终的效果是 provides 变量和 currentInstance.provides 属性都指向了一个继承自 parentProvides 的新对象。这种方式可以实现对象之间的原型继承关系，并且 provides 变量可以在后续代码中使用，表示继承自 parentProvides 的对象。


有段时间没挖源码了,~~遂挖~~

>写于综合阅览室

