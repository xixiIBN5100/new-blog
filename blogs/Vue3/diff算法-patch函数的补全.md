---
title: diff算法--patch函数补全
date: 2024-04-12 21:37:49
tags: [vue源码,diff算法]
categories:
  - Vue3
---
## patch函数的~~假~~补全
 补全一下前一篇博客中新旧节点是同一个节点的代码

<!--more-->

 ![](/assets/img/patch2.png)  
 即图片中红色部分
```javascript
export default function patch(oldVnode,newVnode){
    //首先判断老节点是虚拟dom还是真实dom
    if(oldVnode.sel == '' || oldVnode.sel == undefined){
        //如果不是虚拟节点,则用vnode函数创建出虚拟节点(vnode函数上篇博客已经详细讲述过)
        oldVnode = vnode(oldVnode.tagName.toLowerCase(),{},[],undefined,oldVnode)
    }
    
    if(oldVnode.sel == newVnode.sel && oldVnode.key == newVnode.key){
        //说明这俩是同一个节点!! 就是这个分支
     if(oldVnode == newVnode){
         return;//说明新旧节点在内存中是同一块位置,直接返回即可
     }else if(newVnode.text != undefined && (oldVnode.children == undefined || oldVnode.children.length ==0)) {
         //这种分支说明新节点有文字老节点有子节点,只需要暴力将新节点的文字插入老节点即可,
         //老节点的子节点会被替换
         if (newVnode.text != oldVnode.text) {
             oldVnode.elm.innerText = newVnode.text
         } 
     }else {
         if (oldVnode.children != undefined && oldVnode.children.length != 0) {
             //新老文字均有子节点,diff算法精髓,请听下回分解
         } else {
             //此时是新节点有子节点而老节点有文字,直接插入子节点并不能消除文字
             oldVnode.elm.innerHTML = ''
             //要使用循环去创建每一个子节点 children[i] 是一个 Vnode
             for (let i = 0; i < oldVnode.children.length; i++) {
                 let dom = createElement(oldVnode.children[i])
                 //将真实dom挂在到elm上
                 oldVnode.elm.appendChild(dom)
             }
         }
     }
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
ccc因为最近的三一志愿者和期中考时间比较紧张啊,但还是希望能保证两三天一篇学习笔记吧

>重新学习vue3第四天  
> 写于寝室
