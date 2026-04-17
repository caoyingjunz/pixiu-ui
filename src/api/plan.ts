import { pixiuAxios } from './container'

/** 节点认证信息 */
export interface PlanNodeAuth {
  type: 'password' | 'key'
  password?: { user: string; password: string }
  key?: { data: string }
}

/** 单节点配置（对应后端 CreatePlanNodeRequest） */
export interface PlanNodeParams {
  name: string
  role: string[]
  cri: string
  ip: string
  auth: PlanNodeAuth
}

/** 创建部署计划的完整参数（对应后端 CreatePlanRequest） */
export interface CreatePlanParams {
  name: string
  description?: string
  config: {
    os_image: string
    kubernetes: {
      kubernetes_version: string
      high_availability?: boolean
    }
    network: {
      network_interface: string
      cni: string
      pod_network: string
      service_network: string
      api_server_address?: string
      api_server_port?: number
      self_load_balance?: boolean
      kube_proxy_mode?: 'iptables' | 'ipvs'
    }
    runtime: {
      runtime: 'docker' | 'containerd'
    }
    component: {
      prometheus?: { enabled: boolean }
      logging?: { enabled: boolean }
    }
  }
  nodes: PlanNodeParams[]
}

/** 后端 Plan 列表项结构 */
export interface PlanItem {
  id: number
  resource_version: number
  name: string
  description: string
  step: string
  kubernetes_version: string
  node_count: number
  gmt_create: string
  gmt_modified: string
}

/** 后端 Task 结构 */
export interface PlanTask {
  id: number
  plan_id: number
  name: string
  status: string
  message: string
  gmt_create: string
  gmt_modified: string
}

/** 格式化 ISO 日期 */
function formatDate(iso: string): string {
  if (!iso) return '-'
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export interface PlanItemFormatted {
  id: number
  resourceVersion: number
  name: string
  description: string
  step: string
  kubernetesVersion: string
  nodeCount: number
  createTime: string
}

export interface PlanNodeDetail {
  id: number
  name: string
  role: string[]
  cri: string
  ip: string
  auth?: {
    type?: 'password' | 'key'
    password?: { user?: string; password?: string }
    key?: { data?: string }
  }
}

export interface PlanResourcesDetail {
  id: number
  name: string
  description: string
  config?: {
    os_image?: string
    kubernetes?: { kubernetes_version?: string }
    network?: {
      network_interface?: string
      cni?: string
      pod_network?: string
      service_network?: string
    }
    runtime?: { runtime?: 'docker' | 'containerd' }
    component?: {
      prometheus?: { enabled?: boolean }
      logging?: { enabled?: boolean }
    }
  }
  nodes?: PlanNodeDetail[]
}

function toPlanItem(p: PlanItem): PlanItemFormatted {
  return {
    id: p.id,
    resourceVersion: p.resource_version,
    name: p.name,
    description: p.description ?? '',
    step: p.step === '部署失败' ? '已失败' : (p.step ?? '未开始'),
    kubernetesVersion: p.kubernetes_version ?? '',
    nodeCount: p.node_count ?? 0,
    createTime: formatDate(p.gmt_create)
  }
}

/**
 * GET /pixiu/plans/distributions
 * 获取支持的操作系统分发版列表
 */
export async function fetchPlanDistributions(): Promise<Record<string, string[]>> {
  const res = await pixiuAxios.get('/pixiu/plans/distributions')
  const { code, result, message } = res.data
  if (code !== 200) throw new Error(message || '获取操作系统列表失败')
  return result as Record<string, string[]>
}

/** 后端分页响应结构 */
export interface PlanPageResponse {
  page: number
  limit: number
  total: number
  items: PlanItem[]
}

/**
 * GET /pixiu/plans
 * 获取部署计划列表（支持分页与过滤）
 */
export async function fetchPlanList(params?: {
  page?: number
  limit?: number
  nameSelector?: string
  step?: string
}): Promise<{ list: PlanItemFormatted[]; total: number }> {
  const res = await pixiuAxios.get('/pixiu/plans', { params })
  const { code, result, message } = res.data
  if (code !== 200) throw new Error(message || '获取部署计划列表失败')
  const pageResult = result as PlanPageResponse
  const list = (pageResult?.items ?? []).map(toPlanItem)
  return { list, total: pageResult?.total ?? 0 }
}

/**
 * DELETE /pixiu/plans/:id
 * 删除部署计划
 */
export async function fetchDeletePlan(id: number): Promise<void> {
  const res = await pixiuAxios.delete(`/pixiu/plans/${id}`)
  const { code, message } = res.data
  if (code !== 200) throw new Error(message || '删除失败')
}

/**
 * POST /pixiu/plans/:id/start
 * 启动部署任务
 */
export async function fetchStartPlan(id: number): Promise<void> {
  const res = await pixiuAxios.post(`/pixiu/plans/${id}/start`)
  const { code, message } = res.data
  if (code !== 200) throw new Error(message || '启动失败')
}

/**
 * GET /pixiu/plans/:id/tasks
 * 查询部署任务列表
 */
export async function fetchPlanTasks(id: number): Promise<PlanTask[]> {
  const res = await pixiuAxios.get(`/pixiu/plans/${id}/tasks`)
  const { code, result, message } = res.data
  if (code !== 200) throw new Error(message || '获取任务列表失败')
  return (result ?? []) as PlanTask[]
}

/**
 * GET /pixiu/plans/:id/resources
 * 获取部署计划详情（含 config + nodes）
 */
export async function fetchPlanWithResources(id: number): Promise<PlanResourcesDetail> {
  const res = await pixiuAxios.get(`/pixiu/plans/${id}/resources`)
  const { code, result, message } = res.data
  if (code !== 200) throw new Error(message || '获取部署计划详情失败')
  return (result ?? {}) as PlanResourcesDetail
}

/**
 * POST /pixiu/plans
 * 一次性创建完整部署计划（含 config + nodes）
 */
export async function fetchCreatePlan(params: CreatePlanParams): Promise<void> {
  const res = await pixiuAxios.post('/pixiu/plans', params)
  const { code, message } = res.data
  if (code !== 200) throw new Error(message || '创建部署计划失败')
}
