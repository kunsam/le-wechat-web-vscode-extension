



> kunsam react code tree( KTree) 是一些 vscode 代码工具集

# KTREE的作用 简单来说
- 方便找到代码节点
	- 更利于维护一段代码比较分散的代码流碎片
	- 更利于维护复杂的代码逻辑
	- 提供快速跳转功能
- 方便找到链接调试
 - 更快的知道当前某个文件功能在哪个路由中被实现

# 功能一览
- 场景业务流
	> 场景业务流就是某个场景的代码执行流程，KTree提供清晰的代码执行流程UI
	- 场景业务流视图 
	- 访问代码节点: 点击节点 -> 非纯文字型节点跳转对应代码
	- 编辑节点: 右键节点 -> 编辑节点
	- 编辑节点: 选中编辑区域代码 -> 右键节点 -> 在节点中/后插入节点
	- 编辑节点: 编辑区域 -> 右键菜单 -> * Get kReactCodeTree Node Code -> 获取业务流节点数据

- 路由节点搜索
	快捷键 [cmd + o cmd + o]

- 辅助命令
	- [快捷键]编辑区域 -> 点击某个位置 -> [alt + a] -> 选中 bracket 间的文字
	- [快捷键]编辑区域 -> 点击相对路径引用 -> [cmd i + cmd i] -> 跳转到引用文件
	- [快捷键]编辑区域 -> [(cmd + 4) + ( cmd + 4)] -> 搜索文件所有依赖上游
	- [快捷键]编辑区域 -> [(cmd + o) + ( cmd + o)] -> 启动Action事件管理器
		- [补全] (需要先启动事件管理器)输入le_at，获得全部事件补全
		- [(cmd + o) + (cmd + 9)] 查询数据字段供应链(注册、入库、出库列表)

<p>
	<img src="https://raw.githubusercontent.com/kunsam/kunsam-react-code-tree/master/resources/example1.png" alt="场景业务流视图" />
	<img src="https://raw.githubusercontent.com/kunsam/kunsam-react-code-tree/master/resources/example2.png" alt="场景业务流视图" />
	<img src="https://raw.githubusercontent.com/kunsam/kunsam-react-code-tree/master/resources/example3.png" alt="场景业务流视图" />
	<img src="https://raw.githubusercontent.com/kunsam/kunsam-react-code-tree/master/resources/example4.png" alt="场景业务流视图" />
</p>


# 如何使用

## 使用场景业务流
- 了解场景的基本逻辑
- 定位某个代码节点在项目中的物理位置
- 在代码位置上获取节点信息用于编辑业务流

### 如果创建场景流
- 场景流数据对应数据结构为 ``KC_Node[]``
- 在项目目录 ``{workspace}/__kReactCodeTree__/index.js`` 中输出 ``KC_Node[]``

<img src="https://raw.githubusercontent.com/kunsam/kunsam-react-code-tree/master/resources/exampe5.png" alt="场景业务流视图" />

```js
export type KC_Node = {

	// ## 查询代码字段 ##
	// 代码标志
	// 如果 symbol 在项目中唯一 如 scrollHandler 那么就不需要指定 filePattern textPattern
	// symbol支持 点访问链式写法如 HomepageContainer.render.customer 可访问 render 中的 customer 字段
	symbol?: string

	// 如果全局存在多个symbol最好指定 文件 filePattern
	filePattern?: string // 文件相对路径[可以右键文件tab获得] 唯一

	// textPattern 可能会存在多个，#指定第几个
	// 如 HomepageContainer.render 下 存在多个 customer, 那么可以使用 customer#2
	textPattern?: string

	// 节点说明文字
	text: string

	// 子节点
	children?: KC_Node[]
	
	requirePath?: string // 如果存在，使用 requirePath 加载children

	// 下列字段正在开发中
	routers?: string[] // 对应的路由列表
	document?: string
	operationKeys?: string // 会做一个操作表  在其他地方如谷歌拓展程序里查找对应的操作流，根据操作流执行，定位到具体的UI页面/组件

}


```


### 是否觉得很麻烦
> KTree提供更方便的节点编辑方法

<img src="https://raw.githubusercontent.com/kunsam/kunsam-react-code-tree/master/resources/example-gif1.gif" alt="场景业务流视图" />
