---
title: 初识'发布订阅模式'和'观察者模式'-- Vue3中实现eventBus
date: 2024-04-27 16:31:13
tags: [模式设计,eventBus]
sidebar: 'auto'
categories: [架构与设计模式]
---
## 发布订阅模式和观察者模式  
### 观察者模式
观察者模式定义了对象间的一种一对多的依赖关系，当一个对象的状态发生改变时，所有依赖于它的对象都将得到通知，并自动更新

观察者模式属于行为型模式，行为型模式关注的是对象之间的通讯，观察者模式就是观察者和被观察者之间的通讯  

<!--more-->

### 发布订阅模式  
发布-订阅是一种消息范式，消息的发送者（称为发布者）不会将消息直接发送给特定的接收者（称为订阅者）。而是将发布的消息分为不同的类别，无需了解哪些订阅者（如果有的话）可能存在  

同样的，订阅者可以表达对一个或多个类别的兴趣，只接收感兴趣的消息，无需了解哪些发布者存在

**差别**  

- 在观察者模式中，观察者是知道Subject的，Subject一直保持对观察者进行记录。然而，在发布订阅模式中，发布者和订阅者不知道对方的存在。它们只有通过消息代理进行通信。


- 在发布订阅模式中，组件是松散耦合的，正好和观察者模式相反。


- 观察者模式大多数时候是同步的，比如当事件触发，Subject就会去调用观察者的方法。而发布-订阅模式大多数时候是异步的（使用消息队列）  


## 用ts手写一个简单的发布订阅模式

```typescript
type BusClass = {
    emit: (name: string) => void
    on: (name: string, callback) => void
}

type ParamskKey = string | number | symbol
type List = {
    [key: ParamsKey]: Array<Function>
}//定义调度中心的类型,即一个消息对应一个带有订阅该消息的订阅者的回调函数

class Bus implements BusClass {
    list: List
    constructor() {
        this.list = {}
    }
    emit (name: string, ...args:Array<any>) {
        let fn:Array<Function> = this.list[name]
        fn.forEach(fn => {
            fn.apply(this,args)
        })//循环发布给订阅者订阅信息
    }
    
    on (name:string, callback:Function) {
        let fn:Array<Function> = this.list[name] || [] //获取当前信息的订阅回调函数,没有则初始化一个空数组
        fn.push(callback) //把当前的订阅回调函数加入数组
        this.list[name] = fn //赋值回去
    }
}
```

使用演示
```typescript
//派发组件
const emit = () => {
    count++
    Bus.emit('on-click',count)
}

//订阅组件
Bus.on('on-click',(flag:number) => {
    console.log(count)//在终端输出的就是发布者的数据
})
```