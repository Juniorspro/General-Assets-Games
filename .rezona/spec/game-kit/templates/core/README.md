# @rezona/core

`@rezona/core` 是 `templates` monorepo 内的公共平台层包，用于承载 2D、3D、AR、VR 模板共享或模式专属的 `src/lib` API。

## 远程发布

`@rezona/core` 通过远程私有 npm registry 发布给离仓 workspace 使用。当前 registry 为 `https://verdaccio.rezona.ai/`。

```bash
npm publish templates/core --registry https://verdaccio.rezona.ai/ --access public
```

各模板声明精确的 `@rezona/core` 版本，并包含 scoped `.npmrc`，离仓 workspace 复制模板后即可从远程 registry 安装。

## 导出入口

- `@rezona/core`：公共入口，只导出不会引入模式专属依赖的 `audio`、`device`、`editable`、`multiplayer` API；`canvas` 仅由 2D / AR 子路径导出。
- `@rezona/core/2d`：2D 模板入口，导出公共 API、`canvas` 与 2D runtime。
- `@rezona/core/3d`：3D 模板入口，导出公共 API 与 3D runtime；不导出已确认冗余的 `scene.ts` / `CameraMode`。
- `@rezona/core/ar`：AR 模板入口，导出公共 API、AR runtime、vision 类型与 worker 调用 API。
- `@rezona/core/vr`：VR 模板入口，导出公共 API、3D runtime、VR 手势与虚拟手组件；不导出已确认冗余的 `scene.ts` / `CameraMode`。

## 源码分层

- `src/common/`：四模板共享或无模式专属依赖的基础平台层。
- `src/runtime/`：按 2D、AR、3D/VR 三类保留 runtime 分叉。
- `src/ar/`：AR vision 与 MediaPipe classic worker 源。
- `src/vr/`：VR 手势、虚拟手组件与 MediaPipe classic worker 源。

## multiplayer (rezonaBridge.cast V1)

`src/common/multiplayer.ts` 封装 `rezonaBridge.cast` V1 的 H5 内容端公共能力：身份注入、完整数据透传、远端用户状态维护和订阅异常隔离。它只读取 `window.RezonaBridge.cast.join`，不实现 native / server 传输，也不会初始化或覆盖 `window.RezonaBridge`。

- `joinCast({ maxUsers, timeoutMs })` 对应 join 三态：调用中显示 pending，成功后使用返回的 `Cast` 渲染本地玩家，失败统一抛 `JoinFailedError` 以展示错误页或重试入口。
- `cast.publish(data)` 是全量替换语义；Bridge 负责节流，同一节流窗口内只保留最后一次 publish，业务侧应避免在数据未变化时重复调用。
- `cast.subscribe(handler)` 每个 cast 实例只有一个全局 handler，多次调用以后者覆盖前者；不会收到本地 echo，也没有 unsubscribe。
- 推荐维护 `remoteUsers: Map<string, RemoteUser>`：订阅消息进入 `updateRemoteUsers`，每帧或定时调用 `pruneStaleRemoteUsers`；`now - lastReceivedAt > staleAfterMs` 标记为 `stale`，`> 2 * staleAfterMs` 删除。
- 应用层可把 `data` 设计成 `{ self, shared }`；共享状态建议通过 `pickSharedOwnerUid` 选择 uid 字典序最小者作为 owner。不要把一次性 `action` / `event` 当作可靠事件流，动作应状态化并由业务字段表达。
- `data` 会广播给所有在场参与者，只能放可公开状态；不要放 token、凭证、密钥、隐藏手牌、未公开答案、私密草稿、全量聊天或历史日志。
- 协议没有 `leave`、reconnect 事件或历史重放；iframe 销毁、网络断开或停止 publish 都由 `staleAfterMs` 推断为离场。


`canvas` 不直接依赖模板本地 `assets.ts`；如模板需要 `drawAsset` 识别 spritesheet 降级元数据，可通过 `configureAssetMeta` 注入 `ASSET_META`。
