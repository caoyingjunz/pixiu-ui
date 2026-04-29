import { pixiuAxios } from '@/api/container'

export interface AgentItem {
  id: number
  resourceVersion: number
  name: string
  status: number // 0=未知 1=在线 2=离线 3=异常
  userId: number
  lastReportTime: string
  description: string
  gmtCreate: string
  gmtModified: string
}

interface BackendAgentItem {
  id: number
  resource_version: number
  name: string
  status: number
  user_id: number
  last_report_time: string
  description: string
  gmt_create: string
  gmt_modified: string
}

interface BackendAgentListResponse {
  page: number
  limit: number
  total: number
  items: BackendAgentItem[] | null
}

export interface AgentListParams {
  page: number
  limit: number
  nameSelector?: string
  userId?: number
  status?: number
}

function toAgentItem(b: BackendAgentItem): AgentItem {
  return {
    id: b.id,
    resourceVersion: b.resource_version,
    name: b.name || '',
    status: b.status ?? 0,
    userId: b.user_id ?? 0,
    lastReportTime: b.last_report_time || '',
    description: b.description || '',
    gmtCreate: b.gmt_create || '',
    gmtModified: b.gmt_modified || '',
  }
}

export async function fetchAgentList(
  params: AgentListParams
): Promise<{ total: number; items: AgentItem[] }> {
  const query: Record<string, unknown> = {
    page: params.page,
    limit: params.limit,
  }
  if (params.nameSelector) query.nameSelector = params.nameSelector
  if (params.userId !== undefined) query.userId = params.userId
  if (params.status !== undefined) query.status = params.status

  const res = await pixiuAxios.get('/pixiu/agents', { params: query })
  const { code, result, message } = res.data
  if (code !== 200) throw new Error(message || '获取 Agent 列表失败')
  const data = result as BackendAgentListResponse
  return {
    total: data.total ?? 0,
    items: (data.items ?? []).map(toAgentItem),
  }
}

export async function fetchCreateAgent(data: {
  name: string
  status?: number
  userId: number
  description?: string
}): Promise<void> {
  const res = await pixiuAxios.post('/pixiu/agents', {
    name: data.name,
    status: data.status ?? 0,
    user_id: data.userId,
    description: data.description ?? '',
  })
  const { code, message } = res.data
  if (code !== 200) throw new Error(message || '创建 Agent 失败')
}

export async function fetchUpdateAgent(
  id: number,
  data: {
    name?: string
    status?: number
    lastReportTime?: string
    description?: string
    resourceVersion: number
  }
): Promise<void> {
  const body: Record<string, unknown> = {
    resource_version: data.resourceVersion,
  }
  if (data.name !== undefined) body.name = data.name
  if (data.status !== undefined) body.status = data.status
  if (data.lastReportTime !== undefined) body.last_report_time = data.lastReportTime
  if (data.description !== undefined) body.description = data.description

  const res = await pixiuAxios.put(`/pixiu/agents/${id}`, body)
  const { code, message } = res.data
  if (code !== 200) throw new Error(message || '更新 Agent 失败')
}

export async function fetchDeleteAgent(id: number): Promise<void> {
  const res = await pixiuAxios.delete(`/pixiu/agents/${id}`)
  const { code, message } = res.data
  if (code !== 200) throw new Error(message || '删除 Agent 失败')
}
