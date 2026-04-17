import { isAxiosError } from 'axios'
import yaml from 'js-yaml'
import { kubeProxyAxios } from '@/api/kubeProxy'

interface K8sAPIResource {
  name: string
  kind: string
  namespaced: boolean
}

interface APIResourceList {
  resources?: K8sAPIResource[]
}

function checkEmpty(_name: string, value: unknown): boolean {
  return value === undefined || value === '' || value === null
}

function k8sErrorMessage(err: unknown): string {
  if (!isAxiosError(err) || !err.response) return err instanceof Error ? err.message : '请求失败'
  const d = err.response.data as { message?: string; reason?: string; status?: string }
  return d?.message || d?.reason || d?.status || err.message || '请求失败'
}

function parseYamlObject(yamlText: string): Record<string, unknown> {
  const trimmed = yamlText.trim()
  if (!trimmed) {
    throw new Error('YAML 创建资源不能为空')
  }

  try {
    const loaded = yaml.load(trimmed)
    if (loaded === null || typeof loaded !== 'object' || Array.isArray(loaded)) {
      throw new Error('YAML 须为单个 Kubernetes 对象')
    }
    return loaded as Record<string, unknown>
  } catch (e) {
    if (e instanceof Error && (e.message.includes('YAML') || e.message.includes('对象'))) throw e
    throw new Error(e instanceof Error ? e.message : 'YAML 解析失败')
  }
}

async function resolveResourceUrl(
  cluster: string,
  yamlData: Record<string, unknown>
): Promise<{ url: string; kind: string; apiVersion: string; name: string }> {
  const kind = yamlData.kind as string | undefined
  const apiVersion = yamlData.apiVersion as string | undefined
  const metadata = yamlData.metadata as { name?: string; namespace?: string } | undefined

  if (checkEmpty('kind', kind)) throw new Error('kind 为必填项')
  if (checkEmpty('apiVersion', apiVersion)) throw new Error('apiVersion 为必填项')
  if (!metadata || checkEmpty('metadata', metadata) || checkEmpty('metadata.name', metadata.name)) {
    throw new Error('metadata.name 为必填项')
  }

  const name = metadata.name as string
  const base = `/pixiu/proxy/${encodeURIComponent(cluster)}`
  const APIPaths = ['/apis', '/api'] as const

  let found = false
  let wantedAPIPath = ''
  let wantedResource: K8sAPIResource | null = null

  for (const APIPath of APIPaths) {
    try {
      const { data } = await kubeProxyAxios.get<APIResourceList>(`${base}${APIPath}/${apiVersion}`, {
        params: { timeout: '30s' }
      })
      for (const resource of data.resources ?? []) {
        if (resource.kind === kind) {
          found = true
          wantedAPIPath = APIPath
          wantedResource = resource
          break
        }
      }
    } catch {
      continue
    }
    if (found) break
  }

  if (!found || !wantedResource) {
    throw new Error(`kind: ${kind} apiVersion: ${apiVersion} 暂不支持`)
  }

  let url = `${base}${wantedAPIPath}/${apiVersion}`
  if (wantedResource.namespaced) {
    const namespace = metadata.namespace
    if (checkEmpty('metadata.namespace', namespace)) {
      throw new Error('metadata.namespace 为必填项')
    }
    url = `${url}/namespaces/${encodeURIComponent(namespace as string)}`
  }
  url = `${url}/${wantedResource.name}`
  return { url, kind: kind as string, apiVersion: apiVersion as string, name }
}

/**
 * 与 dashboard `pixiuyaml/index.vue` 一致：解析 YAML → 查 API 资源列表 → 存在则报错 → 否则 POST 创建
 */
export async function createK8sResourceFromYaml(cluster: string, yamlText: string): Promise<void> {
  const yamlData = parseYamlObject(yamlText)
  const { url, kind, apiVersion, name } = await resolveResourceUrl(cluster, yamlData)

  try {
    await kubeProxyAxios.get(`${url}/${encodeURIComponent(name)}`)
    throw new Error(`${kind}: ${name}(${apiVersion}) 已存在`)
  } catch (error: unknown) {
    if (isAxiosError(error) && error.response?.status === 404) {
      try {
        await kubeProxyAxios.post(url, yamlData)
      } catch (postErr) {
        throw new Error(k8sErrorMessage(postErr))
      }
      return
    }
    if (error instanceof Error && error.message.includes('已存在')) {
      throw error
    }
    throw new Error(k8sErrorMessage(error))
  }
}

/**
 * 与 dashboard `viewOrEdit/index.vue` 一致：解析 YAML → 查 API 资源列表 → PUT 覆盖更新
 */
export async function updateK8sResourceFromYaml(cluster: string, yamlText: string): Promise<void> {
  const yamlData = parseYamlObject(yamlText)
  const { url, name } = await resolveResourceUrl(cluster, yamlData)
  try {
    await kubeProxyAxios.put(`${url}/${encodeURIComponent(name)}`, yamlData)
  } catch (e) {
    throw new Error(k8sErrorMessage(e))
  }
}
