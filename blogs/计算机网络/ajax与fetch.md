---
title: ajax与fetch全套
date: 2024-07-08 23:32:52
tags: [网络]
sidebar: 'auto'
categories: 
  - 计算机网络
---


有一次面试官让我手写原生请求没写出来.....   

还是太过于依赖axios中前人传下来的已经封装好的请求,这次也算是补全基础啦  

<!--more-->

## AJAX  

AJAX(Asynchronous JavaScript And XML)，即异步的 JavaScript 和 XML，是一种用于创建快速动态网页的技术。它使用 XMLHttpRequest 对象来获取数据，并且使用 JavaScript 和 DOM 来处理这些数据。  

### 封装一个ajax
```js
const sendAjax = () => {
    const xhr = new XMLHttpRequest()
    
    //GET请求
    xhr.open('GET', 'http://localhost:3000/api/getData',true)//第三个参数是是否异步,默认为true  
    
    //POST请求
    xhr.open('POST', 'http://localhost:3000/api/getData',true)
    xhr.setRequestHeader('Content-Type', 'application/json')//设置POST请求头
    
    xhr.addEventListener('progress', (e) => {
        progress.innerText = `${(e.loaded / e.total * 100).toFixed(2)}%`
    }) //进度条
    xhr.onreadystatechange = () => {
        if (xhr.readyState === 4 && xhr.status === 200) {
            console.log(xhr.responseText)
        }
        xhr.send(null);//get请求不需要传递参数
        xhr.send(JSON.stringify({
            name: '张三',
            age: 18
        })) // post请求需要传递参数,使用JSON.stringify()方法将参数转换为json格式
    }
    xhr.addEventListener('error' , () => {
        console.log('请求失败')
    })//请求被暂停会触发该监听器
}  

const stop = () => {
    xhr.abort()
}//停止请求的方法


```  


## FETCH

fetch默认只支持GET和POST请求方法

### 封装一个fetch  

```js
// GET请求
const sendFetch = () => {
    fetch('http://localhost:3000/api/getData').then(async res => {
        const response = res.clone();//原来的res已经被进度条占用了,新建一个response获取响应数据
        //实现进度条
        const reader = res.body.getReader()
        const total = res.headers.get('Content-Length')
        let loader = 0
        while(true){
            const {done, value} = await reader.read()
            if(done){
                break
            }
            loader += value.length
        }
        return res.json() //这里的res并不是响应对象,而是一个promise对象,所以需要使用then方法获取响应对象

        //如果加入进度条那么就要
        return response.json()
    }).then(data => {
        progress.innerText = `${(loader / total * 100).toFixed(2)}%` //设置进度条
        console.log(data)//拿到响应数据

    })
} 

// POST请求
const sendFetch = () => {
    fetch('http://localhost:3000/api/getData', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: '张三',
            age: 18
        })//请求数据
    }).then(res =>{
        return res.json()
    }).then(data => {
        console.log(data)
    })
}
```  

> 写于西13
