---
title: 虚拟dom和h函数
date: 2024-04-09 20:51:30
tags: [vue源码]
sidebar: 'auto'
categories:
  - Vue3
---

## 虚拟dom

在更改html源码的时候,浏览器并不直接操作真实dom进行修改,而是在js通过抽象语法树编译生
成的虚拟dom上进行修改,**虚拟dom会有真实dom的所有属性**  

而h函数就是用来在虚拟dom上产生**虚拟节点**的函数
<!--more-->
### 一个虚拟节点有一些什么元素
```javascript
{
    childen: undefined  //该虚拟节点无子节点
    data: {}  //属性,样式.....
    elm: undefined  //undefined表示该虚拟节点还未上树
    key: undefined  //唯一标识
    sel: "div"  // 选择器
    text: "我是一个盒子"  //文字
}
```

## h 函数

h函数支持多种参数使用方式,但是**sel参数**(第一个参数)是必须传入的
>用h函数创建一个虚拟节点
```javascript
var myVnode1 = h('a',{props{herf: 'http://www.wdnmd.com'}},'离谱')
//至此,我们创建了一个Vnode,接着我们使用patch函数使得Vnode上树

const container = document.getElementById('container')
patch(container,myVnode1);
//把虚拟节点上树

//h函数可以嵌套 
var myVnode2 = h('ul',[
    h('li','香蕉'),
    h('li',[
        h('p','栗子')
    ]),
])
```

### 手撕h函数

>在这里使用js语法,并且该h函数必须传入三个参数,需要注意的是,库中的h函数更加强大,支持多种参数的传入

```javascript
//首先手写一个vnode函数
export default function(sel , data, children, text, elm){
    return {
        sel , data, children, text, elm
    };
    //该函数就是接受参数,把参数作为一个对象返回
    //return 语句相当于
    /*return {
        sel: sel,
        data: data,
        children: children,
        text: text,
        elm: elm
    }*/
}
```

```javascript
//接下来手撕低配版h函数
//低配版h函数的使用有三种情况
/*  1. h('div', {} , '')
    2. h('div', {} , [])
    3. h('div', {} , h()) */

export default function(sel, data, c){
    //检查参数个数
    if(arguments.length != 3)
        throw new Error('对不起,我们是低配版h函数,必须要有三个参数')
    if(typeof c == 'string' || typeof c == 'number'){
        //第一冲情况
        return vnode(sel, data,undefined, c,undefined);
    }else if(Array.isArrary(c)){
        //第二种情况
        //这种情况我们就用数组去接受数组中每个h函数产生的vnode
        let children = [];
        for(let i = 0; i<c.length; i++){
            //这里不需要执行c[i]
            //因为h函数已经运行完毕,返回了一个虚拟dom对象,我们只需要收集
            children.push(c[i]);
        }
        return vnode(sel, data,childern,undefined,undefined);
    }else if(typeof c == 'object' && c.hasOwnProperty('sel')){
        //第三种情况
        let children = [c]

    }else{
        throw.new.Error('第三个参数不对')
    }
}

```

以上,就是手撕低配版h函数的所有内容噜,明天按理说就是**diff算法**噜(有点难)

>重新学习vue3第二天  
>写于寝室