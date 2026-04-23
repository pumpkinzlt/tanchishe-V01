# Q萌贪吃蛇最终版

## 打开方式

### 方式一：直接打开
直接双击 `login.html` 即可运行。

### 方式二：VS Code
用 VS Code 打开 `snake_game_project` 文件夹后，直接打开 `login.html` 即可。
如果你安装了 Live Server，也可以右键 `Open with Live Server`。

## 当前功能
- 本地用户名登录
- 每日登录奖励 / 连续登录
- Q萌大头短身蛇形象
- 吃食物张嘴吐舌头
- 撞墙 / 撞自己撞晕效果
- 更大的游戏区域
- 更清晰的边界
- PC 键盘操作 + 移动端虚拟按钮
- 金币系统
- 皮肤购买与选择
- 自定义身体颜色 / 腹部颜色 / 眼圈颜色 / 腮红 / 眼睛款式
- 背景音乐开关与音量调节

## 文件结构
- `login.html` 登录页
- `menu.html` 主菜单 / 商店 / 自定义页
- `game.html` 游戏页
- `css/style.css` 样式
- `js/user.js` 用户与存档逻辑
- `js/store.js` 皮肤与主题数据
- `js/menu.js` 主菜单与商店逻辑
- `js/game.js` 游戏逻辑

## 说明
本项目使用 `localStorage` 本地存档，不联网。
如需重新测试，可清除浏览器本地缓存。


## 新增支付整合演示
- 在菜单页的“道具商店演示版”中点击“卡支付”或“PayPal”
- 会进入 `checkout.html`
- 填写 First Name / Last Name / Email / Country
- 选择支付方式（PayPal / Credit Card / Google Pay / Apple Pay）
- 演示支付成功后会自动返回菜单并发放道具 x1


## 道具效果已优化
- 慢速糖浆：减速更明显，持续更长
- 双倍金币：收益翻倍更明显
- 果果磁铁：吸附范围扩大，吸附效果更强
- 使用道具后蛇头会有对应颜色光圈提示


## 道具系统重构
- 新增 `js/effects.js`：统一管理道具开始 / 持续 / 结束
- 新增 `js/cooldowns.js`：统一管理冷却时间
- `game.js` 不再到处直接修改状态，而是统一通过 Effects / Cooldowns 驱动


## 磁铁最终版
- 持续时间：12 秒
- 只有蛇靠近食物 2 格内才触发吸附
- 不会全屏吸附
- 食物被吸附时会出现吸附轨迹，并由蛇张嘴吃掉
