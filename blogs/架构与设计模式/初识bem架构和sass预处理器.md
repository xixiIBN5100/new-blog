---
title: 初识bem架构和sass预处理器
date: 2024-04-23 16:09:53
tags: [bem]
sidebar: 'auto'
categories: [架构与设计模式]
---
## 认识bem架构
bem架构中:  
b代表block(块级元素,用 ' - ' 链接)  
e代表element(内部元素,用 ' __ ' 链接)  
m代表modify(修饰元素,用 ' -- ' 链接)

<!--more-->

>例如 el-input 代表的就是输入框所在的块  
>el-input__inner就是输入框的内容   

我们熟知的Element UI就是使用这种架构开发的

## 用sass预处理器写一个属于自己的bem

```scss
//定义一下变量
$namespace: 'my' !default //!default表示若该值没有被赋值,则使用my
$block-sel: '-' !default
$element-sel: '__' !default
$modify-sel: '--' !default

@mixin b($block){
  $B: #{$namespace + $block-sel + $block}
  .#($B){
    @content 
  }
}

@at-root //跳出父选择器
@mixin e($element){
  $selector:& //获取父选择器
  $E: #{$selector+ $element-sel + $element}
  .#($E){
    @content
  }
}

@at-root 
@mixin m($modify){
  $selector:&
  $M: #{$selector + $modify-sel + $modify}
  .#($M){
    @content
  }
}
```
要将这个bem.sass全局使用,需要在vite.config.ts中进行配置

![](/configsass.png)

使用示范
```vue
<template>
  <div class="my-test">我是一个块级元素
  <div class="my-test__inner"> 我是内部元素</div>
  </div>
</template>
<style lang="scss" >
  @include b(text){
    color:rebeccapurple;
  }
  @include e(inner){
    color: antiquewhite;
  }
</style>
```

实际编译出来的类名就是 .my-test 和 .my-test__inner ,符合bem架构命名规范  

>写于综合阅览室