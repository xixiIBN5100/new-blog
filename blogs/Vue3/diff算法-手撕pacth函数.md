---
title: diff算法--手撕patch函数
date: 2024-04-10 17:30:59
tags: [diff算法,vue源码]
categories:
  - Vue3
---

## 什么是diff算法
diff算法服务与最小量更新,将oldVnode中可以复用的部分用在newVnode上,提高效率  

>diff算法只会精细化比较相同的节点(**即节点的key和sel都相同**),否则会暴力删除旧节点,增加新节点

<!--more-->

## patch函数

![alt ](/assets/img/patch.png)

我们先来手撕一下当oldVnode和newVnode不是同一个节点的时候,patch函数是如何暴力删除旧的,插入新的

>顺序应该是先插入再删除,如果先删除,则会失去插入的位置  

在此之前,我们要先手撕另一个函数 **createElement**  
这个函数用于把Vnode转化成为真实DOM,但是不进行插入,此时的节点是孤儿节点

```javascript
export default function createElement(Vnode){
    let domNode = document.createElement(Vnode.sel)
    if(domNode.text != '' && (domNode.children == undefined || domNode.children.length == 0)){
        //节点只包含文字,则不需要递归调用创建dom
        domNode.innerText = Vnode.text
    }else if(Array.isArray(domNode.children)){
        //说明当前Vnode中有Vnode嵌套,需要递归创建DOM
        for(let i = 0; i<domNode.children.length; i++){
            let ch = domNode.children[i]
            let chdom = createElement(ch)
            domNode.appendChild(chdom)
        }
        Vnode.elm = domNode
    }
    //这个函数返回的是一个纯DOM对象!!!!!
    return Vnode.elm
}
```

接下来我们就来手撕~~半个~~patch函数
```javascript
export default function patch(oldVnode,newVnode){
    //首先判断老节点是虚拟dom还是真实dom
    if(oldVnode.sel == '' || oldVnode.sel == undefined){
        //如果不是虚拟节点,则用vnode函数创建出虚拟节点(vnode函数上篇博客已经详细讲述过)
        oldVnode = vnode(oldVnode.tagName.toLowerCase(),{},[],undefined,oldVnode)
    }
    
    if(oldVnode.sel == newVnode.sel && oldVnode.key == newVnode.key){
        //说明这俩是同一个节点!! 需要进行精细化比较,下篇博客详细分析
    }else{
        //不是同一个节点,暴力插新删旧
        let newVnodeElm = createElement(newVnode)
        if(oldVnode.elm.parentNode && newVnodeElm){
            oldVnode.elm.parentNode.insertBefore(newVnodeElm,oldVnode.elm)
        }
        //删除老节点
        oldVnode.elm.parentNode.removeChild(oldVnode.elm)
    }
}
```

至此,我们已经手撕完patch函数**暴力替换**的部分啦,那么下一章博客就是精细化比较的部分啦  
不得不说,源码真的是太优雅辣

>重新学习vue3第三天  
>写于第四阅览室

