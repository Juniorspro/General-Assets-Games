// ══════════════════════════════════════════════
// rezonaBridge.cast V1 — 多人广播协议基础类型
// ══════════════════════════════════════════════

/**
 * 加入多人广播会话的参数。
 *
 * `maxUsers` 只作为 Bridge 分流粒度提示；协议不会向 H5 暴露房间已满分支。
 */
export interface CastJoinOptions {
  timeoutMs?: number;
  maxUsers: number;
}

/** Bridge 注入的用户身份字段，业务 data 不应伪造或覆盖这些字段。 */
export interface CastUserIdentity {
  uid: string;
  username: string;
  avatarImage: string;
}

/**
 * 订阅收到的远端广播数据。
 *
 * `data` 对协议透明，会广播给所有在场参与者；不要放入凭证、密钥或私密内容。
 */
export interface CastData extends CastUserIdentity {
  data: unknown;
  timestamp: number;
}

/**
 * Bridge 返回的本地多人广播会话。
 *
 * 协议只提供 `publish` / `subscribe`：无 leave、无 unsubscribe、无重连事件、无历史重放，
 * 且 subscribe 不会收到本地 echo。Bridge 负责 publish 节流，业务侧应避免在数据未变化时调用。
 */
export interface Cast extends CastUserIdentity {
  staleAfterMs: number;
  publish(data: unknown): void;
  subscribe(handler: (msg: CastData) => void): void;
}

/** 远端用户按最近一次广播时间推断出的在线状态。 */
export type RemoteUserStatus = 'active' | 'stale';

/**
 * H5 侧维护的远端用户状态。
 *
 * `data` 保持协议透明，调用方只应把可公开给所有参与者的状态放入其中。
 */
export interface RemoteUser extends CastUserIdentity {
  data: unknown;
  lastReceivedAt: number;
  status: RemoteUserStatus;
}

interface RezonaBridgeCastGlobal {
  join(options: CastJoinOptions): Promise<Cast>;
}

interface RezonaBridgeGlobal {
  cast?: RezonaBridgeCastGlobal;
}

interface RezonaBridgeWindow extends Window {
  RezonaBridge?: RezonaBridgeGlobal;
}

/** H5 视角统一的 join 失败错误，不区分超时、认证失败或 Bridge 内部错误。 */
export class JoinFailedError extends Error {
  override readonly name = 'JoinFailedError';
  readonly cause?: unknown;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.cause = options?.cause;
    Object.setPrototypeOf(this, JoinFailedError.prototype);
  }
}

function getCastApi(): RezonaBridgeCastGlobal | undefined {
  const bridge = (window as RezonaBridgeWindow).RezonaBridge;
  const cast = bridge?.cast;
  return typeof cast?.join === 'function' ? cast : undefined;
}

/**
 * 通过 `window.RezonaBridge.cast.join` 加入多人广播会话。
 *
 * 本函数只读取 Bridge，不初始化、不覆盖 `window.RezonaBridge`，并将所有失败统一包装为
 * `JoinFailedError`，便于调用方按 pending / resolved / failed 三态渲染 UI。
 */
export async function joinCast(options: CastJoinOptions): Promise<Cast> {
  if (typeof window === 'undefined') {
    throw new JoinFailedError('window unavailable');
  }

  const castApi = getCastApi();
  if (!castApi) {
    throw new JoinFailedError('rezonaBridge.cast unavailable');
  }

  try {
    return await castApi.join(options);
  } catch (cause) {
    throw new JoinFailedError('join rejected', { cause });
  }
}

/**
 * 用订阅消息更新远端用户表，并返回本次写入的远端用户状态。
 *
 * subscribe 不会收到本地 echo；本地玩家状态需要业务侧自行维护。
 */
export function updateRemoteUsers(
  remoteUsers: Map<string, RemoteUser>,
  msg: CastData,
  now: number = Date.now(),
): RemoteUser {
  const remoteUser: RemoteUser = {
    uid: msg.uid,
    username: msg.username,
    avatarImage: msg.avatarImage,
    data: msg.data,
    lastReceivedAt: now,
    status: 'active',
  };

  remoteUsers.set(msg.uid, remoteUser);
  return remoteUser;
}

/** `pruneStaleRemoteUsers` 本次标记或删除的 uid 清单。 */
export interface PruneStaleRemoteUsersResult {
  marked: string[];
  removed: string[];
}

/**
 * 按 `staleAfterMs` 推断远端用户离场状态。
 *
 * `age > staleAfterMs` 时标记为 stale；`age > 2 * staleAfterMs` 时删除。
 * 连续调用保持幂等：已经 stale 的用户不会重复进入 `marked`。
 */
export function pruneStaleRemoteUsers(
  remoteUsers: Map<string, RemoteUser>,
  staleAfterMs: number,
  now: number = Date.now(),
): PruneStaleRemoteUsersResult {
  const marked: string[] = [];
  const removed: string[] = [];

  for (const [uid, remoteUser] of remoteUsers) {
    const age = now - remoteUser.lastReceivedAt;

    if (age > 2 * staleAfterMs) {
      remoteUsers.delete(uid);
      removed.push(uid);
      continue;
    }

    if (age > staleAfterMs && remoteUser.status === 'active') {
      remoteUser.status = 'stale';
      marked.push(uid);
    }
  }

  return { marked, removed };
}

/**
 * 从本地 uid 与远端 uid 集合中选择字典序最小者作为 shared 状态来源。
 *
 * 本 helper 只比较 uid，不读取或解析 `data.self` / `data.shared` 的业务结构。
 */
export function pickSharedOwnerUid(
  localUid: string,
  remoteUserUids: Iterable<string>,
): string {
  let ownerUid = localUid;

  for (const uid of remoteUserUids) {
    if (uid < ownerUid) {
      ownerUid = uid;
    }
  }

  return ownerUid;
}

/** `safeSubscribe` 捕获 handler 异常后的回调配置。 */
export interface SafeSubscribeOptions {
  onError?: (err: unknown, msg: CastData) => void;
}

/**
 * 安全注册订阅回调，隔离业务 handler 异常。
 *
 * 协议没有 unsubscribe；重复调用 subscribe 会由 Bridge 使用后一个 handler 覆盖前一个。
 * 本函数不会向 console 输出消息，避免意外泄露广播 data。
 */
export function safeSubscribe(
  cast: Cast,
  handler: (msg: CastData) => void,
  options?: SafeSubscribeOptions,
): void {
  cast.subscribe((msg) => {
    try {
      handler(msg);
    } catch (err) {
      options?.onError?.(err, msg);
    }
  });
}
