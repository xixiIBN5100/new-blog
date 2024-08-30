---
title: diff算法--手撕子节点更新策略
date: 2024-04-14 14:21:41
tags: [vue源码,diff算法]
sidebar: 'auto'
categories:
  - Vue3
---
## 子节点更新策略
当patch的时候新旧节点都含有子节点的时候,需要找到旧节点中可以被复用的子节点.  
封装一个函数,采用双指针法遍历虚拟dom树,找到可以复用的节点,接下来我们来手撕一下updateChildren()函数  
>值得一提的是,因为时间和能力有限,只能最大限度的还原此函数,只展示函数中最有魅力的算法精髓,对于一些繁琐的边界判断,可能会有所疏忽  

<!--more-->

```javascript
export default function updateChildren(parentElm,oldCh,newCh) {
    // 初始化
    let newStartIdx = 0
    let newEndIdx = newCh.length - 1
    let oldStartIdx = 0
    let oldEndIdx = oldCh.length - 1
    let newStartVnode = newCh[0]
    let oldStartVnode = oldCh[0]
    let newEndVnode = newCh[newEndIdx]
    let oldEndVnode = oldCh[oldEndIdx]
    let keyMap = {}
    
    //大循环
    while(newStartIdx <= newEndIdx && oldStartIdx <= oldEndIdx) {
        //先判定改节点是否被处理过
        if (oldStartVnode == null) {
            oldstartVnode = oldCh[++oldStartIdx];
        } else if (oldEndVnode == null) {
            oldEndVnode = oldCh[--oldEndId];
        } else if (oldStartVnode == null) {
            oldStartVnode = oldCh[++oldStartIdx];
        } else if (oldEndVnode == null) {
            oldEndVnode = oldCh[--oldEndIdx];
        }else {
            // 前前命中
            if (checkSameVnode(oldStartVnode, newStartVnode)) {
                patch(oldStartVnode, newStartVnode)
                oldStartVnode = oldCh[++oldStartIdx]
                newStartVnode = newCh[++newStartIdx]
            } else if (checkSameVnode(oldEndVnode, newEndVnode)) {
                //后后命中
                patch(oldEndVnode, newEndVnode)
                oldEndVnode = oldCh[--oldEndIdx]
                newEndVnode = newCh[--newEndIdx]
            } else if (checkSameVnode(oldStartVnode, newEndVnode)) {
                //新后旧前命中,移动节点
                patch(oldStartVnode, newEndVnode)
                parentElm.insertBefore(oldStartVnode.elm, oldEndVnode.elm.nextSibling)
                oldStartVnode = oldCh[++oldStartIdx]
                newEndVnode = newCh[--newEndIdx]
            } else if (checkSameVnode(oldEndVnode, newStartVnode)) {
                //新前与旧后命中,移动节点
                patch(oldEndVnode, newStartVnode)
                parentElm.insertBefore(oldEndVnode.elm, oldStartVnode.elm)
                oldEndVnode = oldCh[--oldEndIdx]
                newStartVnode = newCh[++newStartIdx]
            } else {
                //都没命中怎么办,维护一个key映射map找
                for (let i = oldStartIdx; i <= oldEndIdx; i++) {
                    const key = oldCh[i].key
                    if (key) {
                        keyMap[key] = i
                    }
                }
                const findMoveIdx = keyMap[newStartVnode.key]
                if (findMoveIdx == undefined) {
                    //即在map映射中没有找到,则说明是新加节点
                    parentElm.insertBefore(createElement(newEndVnode), oldStartVnode.elm)
                } else {
                    const elmTomove = oldCh[findMoveIdx]
                    patch(elmTomove, newStartVnode)
                    oldCh[findMoveIdx] = undefined//表示该节点已经被处理完
                    parentElm.insertBefore(elmTomove, oldStartVnode.elm)
                }
                //只移动新头指针
                newStartVnode = [++newStartIdx]
            }
        }
    }
    //循环结束后,处理剩余未处理节点,此时只可能是新增节点或者删除节点
    if(oldStartIdx <= oldEndIdx) {
        //删除节点
        for(let i = oldStartIdx;i <= oldEndIdx; i++) {
            parentElm.removeChild(oldCh[i].elm)
        }
    } else if (newStartIdx <= oldEndIdx) {
        //新增节点
        for(let i = newStartIdx; i <= newEndIdx;i++){
            parentElm.insertBefore(createElement(newCh[i]),oldCh(oldStartIdx))
            //为什么是oldStartIdx? 当循环结束进入这个分支的时候 oldStartIdx已经在oldEndIdx的下方,插入这个节点之前才能保证顺序一致
        }
    }
}

```

到此为止,我们已经将vue2 diff算法中的所有内容手撕完毕,不难发现,patch()和updateChildren()两个函数的相互调用是本算法的核心部分,实实在在做到的优化性能的效果

但是显而易见,该算法即使新旧节点大部分相同的情况下,还是会遍历相同的子节点,还是有优化的空间 

所以在vue3中,新的diff算法使用了性能更高的求最长递增子序列算法,给每个节点打上静态标记,从而得到更好的性能.  

~~如果时间够这几天看看能不能手撕~~  

最后的最后 贴张图

![](/assets/img/diff.png)

>重新学习vue3第五天  
>写于书咖