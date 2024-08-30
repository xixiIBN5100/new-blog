---
title: Vue的设计与实现----挂载与更新
date: 2024-08-25 17:46:39
tags: [Vue源码,渲染器]
sidebar: 'auto'
categories:
  - Vue3
---

## 挂载子节点和元素的属性
为了描述元素的属性,我们需要为虚拟DOM定义新的vnode.props字段,比如:
```js
const vnode = {
    type: 'div',
    // 使用props描述一个元素的属性
    props: {
        id: 'foo',
    },
    children: [
        {
            type: 'span',
            children: 'hello'
        }
    ]
}
```

vnode.props是一个对象,它的键代表元素的属性名,值代表属性的值.这样我们就可以通过遍历props对象的方式,把属性渲染到对应的元素上.
```js
function mountElement(vnode, container) {
    const el = createElement(vnode.type)
    //省略child的处理
    if(vnode.props) {
        for(const key in vnode.props) {
            el.setAttribute(key, vnode.props[key])
        }
    }
    insert(el, container)
}
```
事实上,为元素设置属性比想象的复杂的多.在这之前我们需要了解 **HTML Attribute** 与 **DOM Properties**  

## HTML Attribute 与 DOM Properties
我们从基本的HTML说起.
```html
<input id="my-input" type="text" value="foo" />
```
HTML Attribute 指的就是定义在HTML标签上的属性,这里指的就是id,type,value等.而DOM Properties则指的就是DOM节点的属性,我们可以通过js代码来读取该DOM对象.  

很多HTML Attribute在DOM对象上有与之同名的DOM Properties,比如id,type,value等.但是有些HTML Attribute没有对应的DOM Properties,比如autofocus,checked等.  

这是一个具有value属性的input标签.如果用户没有修改文本框内容,那么通过el.value读取对应的DOM Property,得到的是foo.而如果用户修改文本框内容为bar,那么通过el.value读取对应的DOM Property,得到的是bar.  

观察下面代码
```js
console.log(el.getAttribute('value'))// 仍然是foo
console.log(el.value)//bar
```
可以发现,这个现象蕴含着HTML Attribute 所代表的意义.实际上,HTML Attribute 的值是DOM Property 的初始值.一旦值改变,DOM Property 的值也会改变,而通过el.getAttribute()读取的HTML Attribute 的值,永远是初始值.  

## 正确的设置元素属性
对于普通的HTML文件来说,当浏览器解析HTML代码后,会自动分析HTML Attribute 与 DOM Properties 的关系,并把DOM Properties 的初始值设置到对应的HTML Attribute 上.但用户编写在Vue.js的但文件组件中的模板不会被浏览器解析,这意味着原本浏览器来完成的工作,现在需要框架来完成.  

我们以一个禁用的按钮为例
```js
<button disabled>Button</button>
```
浏览器在编译这段代码的时候,发现这个按钮存在一个叫做disabled的HTML Attribute,于是浏览器会将该按钮设置为禁用状态,并将它的el.disabled属性设置为true,这一切都是浏览器帮我们处理好的.  
同样的代码如果出现在Vue.js的模板中,则会有所不同.首先这个HTML模板会被编译成vnode,它等价于
```js
const buton = {
    type: 'button',
    props: {
        disabled: ''
    }
}
```
这样子确实没问题,浏览器将会将按钮禁用.但考虑一下模板
```html
<button :disabled="false">Button</button>
```

它对应的vnode是

```js
const botton = {
    type: 'button',
    props: {
        disabled: false
    }
}
```
用户的本意是“不禁用”按钮,但如果渲染器仍然用setAttribute来设置属性值,那么它将会被设置为禁用状态.  
`el.setAttribute('disabled', false)`  
在浏览器中运行上面这句代码,会发现浏览器仍然将按钮次禁用了.这是因为使用setAttribute函数设置的值总是会被字符串化,等价于  
`el.setAttribute('disabled', 'false')`  
对于按钮来说,它不关心具体的HTML Attribute 的值是什么.只要disabled属性存在,按钮就会被禁用.所以我们发现渲染器不应该总是使用setAttribute函数将vnode.props中的属性设置到DOM元素上.我们可以优先设置DOM Properties.但是有带来了新的问题.  
`<button disabled>Button</button>`  
这段模板对应的vnode是:
```js
const button = {
    type: 'button',
    props: {
        disabled: ''
    }
}
```
我们注意到,在模板经过编译得到的vnode中,disabled属性的值是空字符串.如果将它设置元素的DOM Properties,那么相当与  
`el.disabled = ''`  
由于el.disabled是一个布尔值,因此它将自动转换为false,这违背了用户的本意.  

这么看来,要彻底解决这个问题,我们只能做特殊处理,优先设置元素的DOM Properties,当值为空字符串时,手动矫正为true.  
```js
functon mountElement(vnode, container) {
    const el = createElement(vnode.type)
    //忽略children处理
    if(vnode.props) {
        for(const key in vnode.props) {
            //用 in 判断 key是否存在对应的DOM Properties
            if(key in el) {
                //获取对应的DOM Properties类型
                const type = typeof el[key]
                const value = vnode.props[key]
                //如果是布尔类型,并且值为空字符串,手动矫正为true
                if(type === 'boolean' && value === '') {
                    el[key] = true
                } else {
                    el[key] = value
                }
            } else {
                //如果要设置的属性不存在对应的DOM Properties,则使用setAttribute
                el.setAttribute(key, vnode.props[key])
            }
        }
    }
    insert(el, container)
}
```
这个实现仍然有一些问题,因为有一些DOM Properties 是只读的,我们只能通过setAttribute来设置它们.
```js
function shouldSetAsProp(el, key, value) {
    //特殊处理
    if(key === 'form' && el.tagName === 'INPUT') return false
    //兜底
    return key in el
}

function mountElement(vnode, container) {
    const el = createElement(vnode.type)
    // 省略children
    
    if(vnode.props) {
        for(const key in vnode.props) {
            const value = vnode.props[key]
            // 判断是否可以设置成DOM Properties
            if(shouldSetAsProp(el, key, value)) {
                const type = typeof el[key]
                if(type === 'boolean' && value === '') {
                    el[key] = true
                } else {
                    el[key] = value
                }
            } else {
                el.setAttribute(key, value)
            }
        }
    }
    insert(el, container)
}
```

当然,这仅仅只是特殊情况的一种,在后续的迭代中我们会慢慢升级


