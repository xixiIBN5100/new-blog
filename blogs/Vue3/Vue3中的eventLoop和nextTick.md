---
title: Vue3中的eventLoop和nextTick
date: 2024-05-15 19:14:47
tags: [eventLoop,Vue源码]
categories:
  - Vue3
---

## eventLoop

js 是单线程的,如果是多线程的话会引发一个问题,在同一时间同时操作DOM,一个增加一个删除JS就不知道到底要干嘛了，所以这个语言是单线程的.  

但是随着HTML5到来js也支持了多线程webWorker,但是也是不允许操作DOM

单线程就意味着所有的任务都需要排队，后面的任务需要等前面的任务执行完才能执行，如果前面的任务耗时过长，后面的任务就需要一直等，一些从用户角度上不需要等待的任务就会一直等待，这个从体验角度上来讲是不可接受的，所以JS中就出现了异步的概念。  


<!--more-->


### 同步任务 

从上到下一次进行

### 异步任务  

#### 宏任务  

script(整体代码)、setTimeout、setInterval、UI交互事件、postMessage、Ajax  

#### 微任务   

Promise.then catch finally、MutaionObserver、process.nextTick(Node.js 环境)  

### 运行机制

所有的同步任务都是在主进程执行的形成一个执行栈，主线程之外，还存在一个"任务队列"，异步任务执行队列中先执行宏任务，然后清空当次宏任务中的所有微任务，然后进行下一个tick如此形成循环。

nextTick 就是创建一个异步任务，那么它自然要等到同步任务执行完成后才执行。  

```vue
<template>
   <div ref="lipu">
      {{ text }}
   </div>
   <button @click="change">change div</button>
</template>
   
<script setup lang='ts'>
import { ref,nextTick } from 'vue';
 
const text = ref('离谱')
const lipu = ref<HTMLElement>()
 
const change = async () => {
   text.value = '不离谱'
   console.log(lipu.value?.innerText) //离谱
   await nextTick();
   console.log(lipu.value?.innerText) //不离谱
}
</script>

```
Vue更新组件是异步的,更新数据是同步的,当要对更新后的dom进行操作的时候,需要将操作内容放在`await nextTick();`下方,变成一个Promise包裹的微任务  

常见应用比如scroll的滑动追踪,在scroll中push元素的时候,要等待dom加载完毕以后再操作scroll,不然操作的还是未更新的dom  

## nextTick源码

~~哈哈那当然是nextBlog再讲~~    

```typescript
const resolvedPromise: Promise<any> = Promise.resolve()
let currentFlushPromise: Promise<void> | null = null
 
export function nextTick<T = void>(
  this: T,
  fn?: (this: T) => void
): Promise<void> {
  const p = currentFlushPromise || resolvedPromise
  return fn ? p.then(this ? fn.bind(this) : fn) : p
}
```  

nextTick 接受一个参数fn（函数）定义了一个变量P 这个P最终返回都是Promise，最后是return 如果传了fn 就使用变量P.then执行一个微任务去执行fn函数，then里面this 如果有值就调用bind改变this指向返回新的函数，否则直接调用fn，如果没传fn，就返回一个promise，最终结果都会返回一个promise


>写于综合阅览室


