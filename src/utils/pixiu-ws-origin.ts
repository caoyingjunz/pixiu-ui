/**
 * 解析 Pixiu `/pixiu/*` WebSocket 应连接的来源（`ws(s)://host[:port]`）。
 *
 * - 当 `VITE_API_URL` 为完整 `http(s)://` 地址时，与其使用同一主机与端口（协议换为 ws/wss），便于生产直连正式后端。
 * - 否则使用当前页面的 `location.host`，开发环境走 Vite 代理到 `VITE_PIXIU_PROXY_URL`，避免硬编码 `8080`。
 */
export function resolvePixiuWsOrigin(): string {
  const apiUrl = String(import.meta.env.VITE_API_URL ?? '').trim()
  if (apiUrl && /^https?:\/\//i.test(apiUrl)) {
    try {
      const parsed = new URL(apiUrl)
      const wsProto = parsed.protocol === 'https:' ? 'wss:' : 'ws:'
      return `${wsProto}//${parsed.host}`
    } catch {
      // 解析失败则回退到当前页
    }
  }
  const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${wsProto}//${window.location.host}`
}
