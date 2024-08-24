---
title: 深入v-model--自定义组件中v-model
date: 2024-04-29 14:03:21
tags: [v-model,组件]
categories:
  - Vue3
---
## 理解v-model
v-model实现了双向数据流的绑定,事实上,v-model是一种语法糖,实际上就是props和emit的结合体  

<!--more-->

## 在自定义组件中使用v-model  
在自定义组件中,当需要数据双向传递的时候,可以使用v-model,增加代码的可读性  
```vue
<!--父组件-->
<template>
  <div>
    <div>{{ isShow }}</div>
    <button @click="isShow != isShow">开关</button>
    <vMoudelVue v-model="isShow"></vMoudelVue>
  </div>
</template>
<script>
  const isShow = ref<Boolean>(true)
</script>

<!--自定义组件-->
<template>
   {{ modelValue }}
</template> 
<script>
  defineProps<{
      modelValue:boolean //v-model的默认值是modelValue
  }>();
 const emit =  defineEmits(['update:modelValue'])
  const close = () => {
     emit('update:modelValue',false) //将false传入modelValue中,也就是isShow
  }
</script>
```

**需要注意的是，当modelValue作为props传入，update:modelValue事件将被自动注册到emit事件中**  
~~语法糖(?~~  

当然,自定义组件支持多个v-model绑定,可以使用`v-model:textValue = text`,那么相应的Props和emit就要改成textValue和update:textValue  

### v-model的自定义修饰符   

v-model中有一些内置的修饰符(trim,lazy,number),我们也可以自定义指令,使用`v-model:textValue.lilipupu = lipu`,在自定义组件的Props中用`textValueModifiers?:{ lilipupu:any }`接收  

~~昨天团建断更一天~~  

>写于G1482高铁