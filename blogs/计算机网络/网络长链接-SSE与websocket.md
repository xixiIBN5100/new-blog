---
title: 网络长链接----SSE与websocket
date: 2024-07-09 22:23:41
tags: [网络]
categories:
  - 计算机网络
---

在一些场景下，我们希望客户端能够实时与服务端通信，而不是通过轮询的方式来获取服务端的消息。这种时候我们就需要网络长链接来实现  

<!--more-->

## SSE
SSE（Server-Sent Events）是一种用于在浏览器中实现服务器推送的技术。它允许服务器向客户端发送事件，客户端可以实时接收并处理这些事件。  

**注意**  
SSE 是基于 HTTP 协议的，因此它不能用于所有类型的网络请求，只能用于 GET 请求。而且，SSE 的事件流是单向的，即服务器向客户端发送事件，客户端无法向服务器发送事件。  

~~据说GPT就用的这种技术将字一个一个打在页面上(?~~

前端代码演示  

```js
const sse = () => {
    const sse = new EventSource('http://localhost:3000/sse')
    //拿到默认type为message返回的数据
    sse.onmessage = function(e) {
        console.log(e.data)  
    }
    
    //如果后段设置了type名字,则  
    sse.addEventListener('typeName', function(e) {
        console.log(e.data)
    })
}


```  

## websocket

WebSocket 是一种用于创建全双工通信的协议，允许客户端和服务器之间的通信。它与 HTTP 协议不同，它使用 TCP 协议进行通信，而不是 HTTP 协议。WebSocket 是一种用于创建持久连接的协议，允许客户端和服务器之间进行双向通信。  

最常见的应用场景是实时聊天、游戏、视频会议等场景。WebSocket 可以在浏览器和服务器之间建立持久连接，从而实现实时通信。  

前端代码演示:  

```js
const sendWebSocket = () => {
    const ws = new WebSocket('ws://localhost:3000/ws')
    //检测连接状态的API
    ws.onopen = function() {
        console.log('连接成功')
    }
    ws.onclose = function() {
        console.log('连接关闭')
    }
    //发送数据给服务器
    ws.send('hello')
}

//获取服务器返回的数据
const getWebSocket = () => {
    ws.addEventListener('typeName',(e) => {
        console.log(e.data)
    })
}
```  

~~轮询大法好~~  


> 写于西13