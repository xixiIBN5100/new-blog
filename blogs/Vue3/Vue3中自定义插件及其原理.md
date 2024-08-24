---
title: Vue3中自定义插件及其原理
date: 2024-05-15 12:01:09
tags: [自定义插件,vue源码]
categories:
  - Vue3
---
## 插件的使用方式
在Vue中的插件,都需要使用`app.use()`方法来启用.  

<!--more-->
### 手撕use函数
这里只是简单手撕一下install函数模式下的use,原生use是支持直接抛出函数的写法
```typescript
interface Use {
    install: (app,...options) => void
}
//缓存已经注册过的插件
const installList = new Set()
export function Myuse<T extends Use>(plugin: T, options: any[]) {
    if(installList.has(plugin)){
        console.error('该插件已注册',plugin)
    }else{
        plugin.install(app,...options)
        installList.add(plugin)
    }
}
```

## 如何编写自定义插件  
我们来自定义一个加载插件
```typescript
//Loading.ts
import Loading from './index.ts'
export default {
    //如果插件不是函数模式,在app.use的时候调用install函数,回传得到app(main.ts中的app),对app进行插件配置
    install(app) {
        //此时导入的组件需要转化成Vnode进行挂载
        const Vnode = createVNode(Loading)
        //用render函数进行挂载,挂载在全局上
        render(Vnode,document.body)
    }
}
```

### 如何调用挂载组件中的方法  
当然是使用defineExpose啦  
```vue
<script>
  defineExpose({
    show,
    hide,
    isShow,
  })
</script>
```  

使用这种方法,我们可以配置全局挂载啦

```typescript
//自定义变量$loading
app.config.globalProperties.$loading = {
    show: Vnode.component?.exposed?.show,//拿到暴露方法
    hide: Vnode.component?.exposed?.hide,
    isShow: Vnode.component?.exposed?.isShow
}
```  

挂载以后,在需要调用插件的时候,获取当前实例调用
```typescript
const instance = getCurrentInstance()

instantce?.proxy?.$loading.show
```
这样就能把组件调出来啦  

乍一看和全局组件没有什么区别,但是实际上组件能够实现更加复杂的功能,以后要是真遇到需要自定义插件的时候在写篇博客罢

~~断了好久没写博客了~~  

>写于综合阅览室