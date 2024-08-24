---
title: 学习小记——js面试题——API篇
date: 2024-05-28 09:07:41
tags: [面试题]
categories: [js]
---

以后大部分的博客可能就是这样的更新形式吧,~~最近在看vue设计与实现这本书每读一部分我应该就会写一份总结~~加上为了巩固js的基础功在看一些面试题  

以后开篇新的将Vue设计与实现

<!--more-->

## js面试题  

### 如何将类数组转化为数组  

- 什么是类数组  
简单的定义,只要有length这个属性,那就是类数组.  
类数组在DOM极为常见,各种元素检索API返回的都是类数组(document.getElementByTagName,document.getQuerySelectAll)  
- 怎么转化  
  ES6 中有现成的 API：Array.from，极为简单
```js
// [undefined, undefined, undefined]
Array.from({ length: 3 });
```
当然可以使用`...`展开运算符 即`[...arrayLike]` ,不过它只能作用于 iterable 对象，即拥有 Symbol(Symbol.iterator) 属性值  

### Promise.allSettled() 和Promise.all()的区别  
两个都是有关Promise的API,比较一下他们的异同  

- Promise.allSettled() 
这个API接收一个Promise数组对象,待数组中所有Promise都解决的时候,返回一个解决完毕的数组(无论数组中的promise是否被成功解决)  
- Promise.all()  
这个API接收一个Promise数组对象,待数组中所有Promise都解决的时候,返回一个解决完毕的数组,但是但凡数组中有一个promise被reject了,就只会返回错误的原因(即被reject的promise中reject里面的参数)  

手写Promise.allSettled() 能更加明显的感受到他们两个的异同 
```js
const myPromiseallSettled = (items) => {
    const onResoloved = (value) => {state: "fulfilled", value}
    const onRejected = (reason) => {state: "rejected", reason}
    return Promise.All(
        items.map((item) => Promise.resolve(item).then(onResoloved,onRejected))
    )
}
``` 
这样,即使items中出现错误也会被then及时捕捉,不会像Promise.all()一旦有promise被reject就拿不到之前处理成功的数据  

### 什么是 Iterable 对象，与 Array 有什么区别  

- 实现了 [Symbol.iterator] 属性的对象就是 Iterable 对象，然后可以使用操作符 for...of 进行迭代  
- Array 可以直接通过索引访问和修改元素，而 Iterable 对象需要使用迭代器方法才能访问和修改元素。
- Array 可以使用一系列的数组方法，比如 push、pop、slice 等，来操作和处理数组，而 Iterable 对象没有直接提供相应的方法，需要通过迭代器方法和其他操作来实现相应的功能。  
- Array 的长度是可变的，可以通过改变数组的长度来增加或减少元素的个数，而 Iterable 对象的长度是固定的，不能直接改变。
- Array 可以通过字面量方式创建，比如 [1, 2, 3]，而 Iterable 对象需要通过实现迭代器方法来创建，比如通过 Generator 函数来生成一个 Iterable 对象。  

### Map与WeakMap的区别

- Map可使用任何数据类型作为 key，但因其在内部实现原理中需要维护两个数组，存储 key/value，因此垃圾回收机制无法回收  
- WeakMap: 只能使用引用数据类型作为 key。弱引用，不在内部维护两个数组，可被垃圾回收，但因此无法被遍历！即没有与枚举相关的 API，如 keys、values、entries 等
### 如何创建一个数组大小为100，每个值都为0的数组  
- 方法一  
`Array(100).fill(0)`  
- 方法二  
`Array.from(Array(100), (x) => 0 )`

**为什么不能使用`Array(100).map(() => 0)`**  

当你使用 `Array` 构造函数创建一个数组并传入一个整数时，例如 `Array(100)`，你得到一个长度为 100 的数组，但这些元素都是未初始化的。这是一个稀疏数组。稀疏数组在概念上具有指定的长度，但没有实际的元素存在。  
```js
const arr = Array(100);
console.log(arr.length); // 100
console.log(arr); // [ <100 empty items> ]
```
如果你直接对这个稀疏数组使用 `map` 方法，由于数组中的元素没有被初始化，因此 `map` 函数不会对这些位置调用回调函数。这是因为 `map` 只会对那些有值的索引调用回调函数，而稀疏数组中的索引位置是“空的”。  
```js
const arr = Array(100).map(() => 0);
console.log(arr); // [ <100 empty items> ]
```
~~完美解释~~  

嗯通过一些面试题确实能够巩固一些基础知识,~~虽然可能开发中很少遇到~~,收获还是挺大的  

> 写于第四阅览室