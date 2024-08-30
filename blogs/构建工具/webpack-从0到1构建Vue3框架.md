---
title: webpack--从0到1构建Vue3框架
date: 2024-05-24 10:19:44
tags: [webpack]
sidebar: 'auto'
categories:
    - 构建工具
---
## 什么是webpack  

WebPack可以看做是模块打包机：它做的事情是，分析你的项目结构，找到JavaScript模块以及其它的一些浏览器不能直接运行的拓展语言（Scss，TypeScript等），并将其打包为合适的格式以供浏览器使用。  

~~总之就是打包你的码~~  

<!--more-->

## 从0开始构建项目  


- `tsc --init` 生成`tsconfig.json`(ts配置文件)
- `npm -init -y` 生成`package.json`
- 新建`webpack.config.js`和`index.html`文件
- 新建src目录,在目录中新建`main.ts,App.vue,shim.d.ts`  
- 配置`tsconfig.json` 中的`"include" : [ "src/**/*" ]`
- `npm -i webpack webpack-cli -D` 安装webpack依赖
- `npm i webpack-server-dev -D` 开发环境下在本地启服务
- 在`package.json`配置命令
```json
"scripts": [
    "build": "webpack",
    "dev": "webpack-dev-server"
]
```

- 配置`webpack.config.js`
```javascript
const { Configuration } = require('webpack')
const patt = require('node:path')
/**
 * @type { Configuration }
 */
//使用注解的方式获取代码提示
const config = {
    mode:'development',
    entry: './src/main.ts',
    output: {
        path:path.resolve(__dirname,'dist'), //在根目录下生成一个dist目录
        filename: 'bundle.js', //打包之后的文件
    }
}

module.exports = config //使用Cjs规范导出配置
```

- 配置解析ts文件的相关loader
先装依赖`npm i typescript ts-loader -D`
再在`webpack.config.js`中追加配置  
```javascript
const { Configuration } = require('webpack')
const patt = require('node:path')
/**
* @type { Configuration }
  */
  //使用注解的方式获取代码提示
  const config = {
  mode:'development',
  entry: './src/main.ts',
  output: {
  path:path.resolve(__dirname,'dist'), //在根目录下生成一个dist目录
  filename: 'bundle.js', //打包之后的文件
  },
    module: {
      rules:[
          {
              test:/\.ts$/,
              use:'ts-loader',
          }
      ]
    }
  }

module.exports = config //使用Cjs规范导出配置
```

- 配置解析Vue文件的相关loader  
先装vue文件loader  `npm i vue-loader -D`  
再装将Vue创建出来的App与webpack关联起来的插件`npm i html-webpack-plugn -D`  

再在`webpack.config.js`中追加配置  
```javascript
const { Configuration } = require('webpack')
const patt = require('node:path')
const { HtmlWebpackPlugin } = require('html-webpack-plugin')
const { VueLoaderPlugin } = require('vue-loader')
/**
* @type { Configuration }
  */
  //使用注解的方式获取代码提示
  const config = {
  mode:'development',
  entry: './src/main.ts',
  output: {
  path:path.resolve(__dirname,'dist'), //在根目录下生成一个dist目录
  filename: 'bundle.js', //打包之后的文件
  clean: true, //清空上一次打包之后的文件   
  },
    stats:"errors-only", //使控制台只打印错误相关,不打印多余数据
    plugins: [
        new HtmlWebpackPlugin({
            template: './index.html'//指定打包模板,因为App.vue是挂载到index.html上面的
        }),
        new VueLoaderPlugin(),
    ],//webpack的插件都是class,都需要new
    module: {
      rules:[
          {
              test:/\.ts$/,
              use:{
                  loader:'ts-loader',
                   options: {
                      appendTsSuffixTo: [/\.vue$/]
                   } //配置解析vue文件中的ts代码
              },
          },
          {
              test:/\.vue$/,
              use: 'vue-loader'
          }
      ]
    }
  }

module.exports = config //使用Cjs规范导出配置
```
然后在`shim.d.ts`中配置.vue声明文件  
```typescript
declare module "*. vue"{
    import { DefineComponent } from "vue" 
    const component: DefineComponent<{}, {}, any> 
    export default component
}
```

- 配置支持css,less,scss   
安装相关loader `npm i css-loader style-loader -D`  
追加配置  
```ts
{
    test:/\.css$/, 
    use: ['style-loader','css-loader']//从右往左执行loader
}
```
**style-loader的作用是拿到解析的css动态的插入一个style标签到html代码里面**

配置less的如下
```ts
{
    test:/\.less$/,
    use: ['style-loader','css-loader','less-loader']//从右往左执行loader
}
```

## 代码分包配置  


```javascript
const { Configuration } = require('webpack')
const patt = require('node:path')
const { HtmlWebpackPlugin } = require('html-webpack-plugin')
const { VueLoaderPlugin } = require('vue-loader')
/**
* @type { Configuration }
  */
  //使用注解的方式获取代码提示
  const config = {
  mode:'development',
  entry: './src/main.ts',
  output: {
  path:path.resolve(__dirname,'dist'), //在根目录下生成一个dist目录
  filename: 'bundle.js', //打包之后的文件
  clean: true, //清空上一次打包之后的文件   
  },
    stats:"errors-only", //使控制台只打印错误相关,不打印多余数据
    plugins: [
        new HtmlWebpackPlugin({
            template: './index.html'//指定打包模板,因为App.vue是挂载到index.html上面的
        }),
        new VueLoaderPlugin(),
    ],//webpack的插件都是class,都需要new
    module: {
      rules:[
          {
              test:/\.ts$/,
              use:{
                  loader:'ts-loader',
                   options: {
                      appendTsSuffixTo: [/\.vue$/]
                   } //配置解析vue文件中的ts代码
              },
          },
          {
              test:/\.vue$/,
              use: 'vue-loader'
          },
      ]
    },
    optimization: {
      splitChunks: {
          cacheGroups: {
              common: {
                  name: 'common',
                  chunks: 'all',
                  minChunks: 2 //依赖的引用次数最少为2才会被拆出来 
              }
          }
      }
    }
  }

module.exports = config //使用Cjs规范导出配置
```  

## 进一步优化性能  
实际上,webpack会把我们的css文件动态的用style标签插入,这样的性能是不好的,我们可以借助插件将css文件分包,用link引入css文件
`npm i mini-css-extract-plugin -D`  
更改配置  

```javascript
const { Configuration } = require('webpack')
const patt = require('node:path')
const { HtmlWebpackPlugin } = require('html-webpack-plugin')
const { VueLoaderPlugin } = require('vue-loader')
const CssExtractPlugin = require('css-extract-plugin')

/**
* @type { Configuration }
  */

  const config = {
  mode:'development',
  entry: './src/main.ts',
  output: {
  path:path.resolve(__dirname,'dist'), 
  filename: 'bundle.js', 
  clean: true,  
  },
    stats:"errors-only", 
    plugins: [
        new HtmlWebpackPlugin({
            template: './index.html'
        }),
        new VueLoaderPlugin(),
    ],
    module: {
      rules:[
          {
              test:/\.ts$/,
              use:{
                  loader:'ts-loader',
                   options: {
                      appendTsSuffixTo: [/\.vue$/]
                   } 
              },
          },
          {
              test:/\.vue$/,
              use: 'vue-loader'
          },
          {
              test:/\.css$/,
              use: [CssExtractPlugin.loader,'css-loader']//修改loader
          },
          {
              test:/\.less$/,
              use: [CssExtractPlugin.loader,'css-loader','less-loader']//修改loader
          }
      ]
    },
    optimization: {
      splitChunks: {
          cacheGroups: {
              common: {
                  name: 'common',
                  chunks: 'all',
                  minChunks: 2 
              }
          }
      }
    }
  }

module.exports = config 
```    


呼呼终于是写完了,还是vue-cli的vite方便些(x

>写于第四阅览室



