<template>
  <div class="cluster-page art-full-height">
    <ClusterSearch v-model="searchForm" @search="handleSearch" @reset="handleReset" />

    <ElCard class="art-table-card">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <ElButton @click="addClusterVisible = true" v-ripple>新增集群</ElButton>
        </template>
      </ArtTableHeader>

      <ArtTable
        row-key="id"
        :loading="loading"
        :data="data"
        :columns="columns"
        :pagination="pagination"
        :pagination-options="{ align: 'right' }"
        @selection-change="handleSelectionChange"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      >
        <template #clusterType-header>
          <span class="cluster-type-header">
            <span>集群类型</span>
            <ElTooltip placement="top" :show-after="200" popper-class="cluster-type-header-tooltip">
              <template #content>
                <div class="cluster-type-header-tooltip-inner">
                  <div>标准集群：导入符合 kubernetes 接口的集群</div>
                  <div>自建集群：通过pixiucloud部署的 kubernetes 集群</div>
                </div>
              </template>
              <span class="cluster-type-header__icon" role="img" aria-label="说明">
                <ElIcon :size="15" class="cluster-type-header__icon-el">
                  <InfoFilled />
                </ElIcon>
              </span>
            </ElTooltip>
          </span>
        </template>
      </ArtTable>

      <ClusterAddDialog v-model:visible="addClusterVisible" @success="refreshData" />
    </ElCard>

    <ClusterMonitor v-model="monitorVisible" :cluster="monitorCluster" />

    <!-- 自建集群部署进度抽屉 -->
    <ElDrawer
      v-model="taskDrawerVisible"
      title="部署进度"
      size="52%"
      :destroy-on-close="true"
      class="plan-task-drawer"
      @open="handleTaskDrawerOpen"
      @close="handleTaskDrawerClose"
    >
      <div class="task-drawer">
        <ElAlert
          title="获取部署计划的部署情况"
          type="info"
          :closable="false"
          show-icon
          effect="light"
          class="task-alert"
        />
        <ElTable
          :data="tasks"
          :border="false"
          :stripe="false"
          size="small"
          style="margin-top: 12px"
          :header-cell-style="{ background: 'transparent' }"
        >
          <ElTableColumn label="名称" prop="name" min-width="160" />
          <ElTableColumn label="状态" width="130">
            <template #default="{ row }">
              <div class="task-status">
                <ElIcon v-if="row.status === '运行中'" class="is-loading" color="var(--el-color-primary)">
                  <LoadingIcon />
                </ElIcon>
                <ElIcon v-else-if="row.status === '已成功'" color="var(--el-color-success)">
                  <SuccessFilled />
                </ElIcon>
                <ElIcon v-else-if="row.status === '已失败'" color="var(--el-color-danger)">
                  <CircleCloseFilled />
                </ElIcon>
                <ElIcon v-else color="var(--el-text-color-placeholder)">
                  <RemoveFilled />
                </ElIcon>
                <span>{{ row.status }}</span>
              </div>
            </template>
          </ElTableColumn>
          <ElTableColumn label="开始时间" prop="gmt_create" min-width="160">
            <template #default="{ row }">{{ formatDate(row.gmt_create) }}</template>
          </ElTableColumn>
          <ElTableColumn label="结束时间" prop="gmt_modified" min-width="160">
            <template #default="{ row }">
              {{ row.status === '运行中' || row.status === '未开始' ? '-' : formatDate(row.gmt_modified) }}
            </template>
          </ElTableColumn>
          <ElTableColumn label="操作" width="88" fixed="right" align="center">
            <template #default="{ row }">
              <ElLink
                type="primary"
                underline="never"
                :style="taskLogLinkStyle(row)"
                @click="onTaskLogClick(row)"
              >
                日志
              </ElLink>
            </template>
          </ElTableColumn>
        </ElTable>
        <div v-if="tasks.length === 0 && !tasksLoading" class="task-empty">暂无部署任务</div>
      </div>
    </ElDrawer>

    <!-- 编辑集群名称对话框 -->
    <ElDialog
      v-model="renameVisible"
      title="编辑集群名称"
      width="420px"
      :close-on-click-modal="false"
    >
      <div class="rename-form">
        <div class="rename-row">
          <span class="rename-label">原名称</span>
          <span class="rename-value">{{ renameRow?.aliasName }}</span>
        </div>
        <div class="rename-row">
          <span class="rename-label">新名称</span>
          <div class="rename-input-wrap">
            <ElInput v-model="newAliasName" placeholder="请输入新名称" @input="renameError = ''" />
            <span v-if="renameError" class="rename-error">{{ renameError }}</span>
          </div>
        </div>
      </div>
      <template #footer>
        <ElButton type="primary" :loading="renameLoading" @click="submitRename">提交</ElButton>
        <ElButton @click="renameVisible = false">取消</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import {
    ElIcon,
    ElLink,
    ElMessage,
    ElMessageBox,
    ElSwitch,
    ElTag,
    ElTooltip
  } from 'element-plus'
  import {
    CopyDocument,
    Edit,
    InfoFilled,
    SuccessFilled,
    CircleCloseFilled,
    Loading as LoadingIcon,
    RemoveFilled
  } from '@element-plus/icons-vue'
  import ArtButtonMore, {
    type ButtonMoreItem
  } from '@/components/core/forms/art-button-more/index.vue'
  import { useTable } from '@/hooks/core/useTable'
  import { useRouter } from 'vue-router'
  import ClusterSearch from './modules/cluster-search.vue'
  import ClusterAddDialog from './modules/cluster-add-dialog.vue'
  import ClusterMonitor from './modules/cluster-monitor.vue'
  import {
    fetchClusterList,
    fetchDeleteCluster,
    fetchUpdateClusterAlias,
    fetchProtectCluster
  } from '@/api/container'
  import { fetchDestroyPlan, fetchPlanTasks } from '@/api/plan'
  import { confirmDestroyPlan } from '../utils/destroy-plan-dialog'
  import type { ClusterItem } from '@/api/container'
  import type { PlanTask } from '@/api/plan'

  defineOptions({ name: 'Cluster' })

  const router = useRouter()

  /** 集群详情 URL 仅保留 cluster=<internalName> */
  function clusterDetailQuery(row: ClusterItem) {
    return { cluster: row.name }
  }

  /** 集群详情 - 概览页「API Server」标签（与 overview 内 overviewTab=api 一致） */
  function goToClusterApiServer(row: ClusterItem) {
    if (isCustomClusterNotRunning(row)) return
    router.push({
      path: '/container/overview',
      query: { cluster: row.name, overviewTab: 'api' }
    })
  }

  const STATUS_CONFIG = {
    0: { type: 'success' as const, text: '运行中' },
    1: { type: 'primary' as const, text: '部署中' },
    2: { type: 'info' as const, text: '等待部署' },
    3: { type: 'danger' as const, text: '部署失败' },
    4: { type: 'warning' as const, text: '集群失联' }
  }

  const searchForm = ref({
    clusterName: undefined as string | undefined,
    status: undefined as string | undefined
  })
  const addClusterVisible = ref(false)
  const selectedRows = ref<ClusterItem[]>([])
  const monitorVisible = ref(false)
  const monitorCluster = ref<ClusterItem | null>(null)
  const protectingIds = ref(new Set<number>())

  // 重命名对话框
  const renameVisible = ref(false)
  const renameRow = ref<ClusterItem | null>(null)
  const newAliasName = ref('')
  const renameError = ref('')
  const renameLoading = ref(false)
  const taskDrawerVisible = ref(false)
  const currentTaskCluster = ref<ClusterItem | null>(null)
  const tasks = ref<PlanTask[]>([])
  const tasksLoading = ref(false)
  const taskPollingTimer = ref<ReturnType<typeof setInterval> | null>(null)

  function formatDate(iso: string): string {
    if (!iso) return '-'
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  }

  function isTaskLogDisabled(row: PlanTask): boolean {
    return row.status === '未开始'
  }

  function taskLogLinkStyle(row: PlanTask): string {
    const base = 'font-size:12px'
    if (isTaskLogDisabled(row)) {
      return `${base};cursor:not-allowed;color:var(--el-text-color-disabled)`
    }
    return base
  }

  function onTaskLogClick(row: PlanTask) {
    if (isTaskLogDisabled(row)) return
    const text = row.message?.trim() ? row.message : '暂无日志'
    ElMessageBox.alert(text, '任务日志', {
      confirmButtonText: '确定',
      customClass: 'task-log-dialog'
    })
  }

  function isCustomClusterNotRunning(row: ClusterItem): boolean {
    return Number(row.clusterType) === 1 && Number(row.status) !== 0
  }

  function shouldShowDeployProgress(row: ClusterItem): boolean {
    return isCustomClusterNotRunning(row)
  }

  const {
    columns,
    columnChecks,
    data,
    loading,
    pagination,
    getData,
    replaceSearchParams,
    resetSearchParams,
    handleSizeChange,
    handleCurrentChange,
    refreshData
  } = useTable({
    core: {
      apiFn: async (params: {
        current: number
        size: number
        clusterName?: string
        status?: string
      }) => {
        const { total, items } = await fetchClusterList({
          page: params.current,
          limit: params.size,
          nameSelector: params.clusterName,
          status: params.status
        })
        return {
          code: 200,
          data: { records: items, total, current: params.current, size: params.size }
        }
      },
      apiParams: { current: 1, size: 10 },
      columnsFactory: () => [
        { type: 'selection' },
        {
          prop: 'aliasName',
          label: '名称/ID',
          minWidth: 180,
          formatter: (row: ClusterItem) =>
            h('div', { style: 'line-height:1.8' }, [
              h('div', { style: 'display:flex;align-items:center;gap:4px' }, [
                isCustomClusterNotRunning(row)
                  ? h(
                      'span',
                      {
                        style:
                          'font-size:14px;color:var(--el-color-primary);cursor:not-allowed'
                      },
                      row.aliasName
                    )
                  : h(
                      ElLink,
                      {
                        type: 'primary',
                        underline: 'never',
                        style: 'font-size:14px',
                        onClick: () =>
                          router.push({ path: '/container/overview', query: clusterDetailQuery(row) })
                      },
                      () => row.aliasName
                    ),
                h(
                  'span',
                  {
                    class: 'icon-action',
                    style:
                      'cursor:pointer;color:var(--el-text-color-secondary);display:inline-flex;align-items:center',
                    title: '编辑名称',
                    onClick: (e: MouseEvent) => {
                      e.stopPropagation()
                      openRenameDialog(row)
                    }
                  },
                  [h(Edit, { style: 'width:12px;height:12px' })]
                )
              ]),
              h(
                'div',
                {
                  style:
                    'display:flex;align-items:center;gap:4px;color:var(--el-text-color-secondary);font-size:12px'
                },
                [
                  h('span', row.name),
                  h(
                    'span',
                    {
                      class: 'icon-action',
                      style: 'cursor:pointer;display:inline-flex;align-items:center',
                      title: '复制',
                      onClick: (e: MouseEvent) => {
                        e.stopPropagation()
                        navigator.clipboard.writeText(row.name)
                        ElMessage.success('已复制')
                      }
                    },
                    [h(CopyDocument, { style: 'width:12px;height:12px' })]
                  )
                ]
              )
            ])
        },
        {
          prop: 'monitor',
          label: '监控',
          width: 72,
          formatter: (row: ClusterItem) =>
            h(
              'span',
              {
                style: 'cursor:pointer;color:var(--el-color-primary)',
                title: '查看监控',
                onClick: () => openMonitor(row)
              },
              [
                h(
                  'svg',
                  {
                    xmlns: 'http://www.w3.org/2000/svg',
                    width: 16,
                    height: 16,
                    viewBox: '0 0 16 16',
                    fill: 'currentColor'
                  },
                  [
                    h('rect', { x: 1, y: 10, width: 1.5, height: 5, rx: 0.75 }),
                    h('rect', { x: 6.5, y: 3, width: 1.5, height: 12, rx: 0.75 }),
                    h('rect', { x: 12, y: 7, width: 1.5, height: 8, rx: 0.75 })
                  ]
                )
              ]
            )
        },
        {
          prop: 'status',
          label: '状态',
          width: 120,
          formatter: (row: ClusterItem) => {
            const cfg = STATUS_CONFIG[row.status] ?? { type: 'info' as const, text: '未知' }
            return h('div', { style: 'display:flex;flex-direction:column;align-items:flex-start;gap:4px' }, [
              h('div', { style: 'display:flex;align-items:center;gap:4px' }, [
                h(ElTag, { type: cfg.type }, () => cfg.text),
                ...(Number(row.status) === 1
                  ? [
                      h(
                        ElIcon,
                        { class: 'is-loading', color: 'var(--el-color-primary)' },
                        () => h(LoadingIcon)
                      )
                    ]
                  : [])
              ]),
              ...(shouldShowDeployProgress(row)
                ? [
                    h(
                      'span',
                      {
                        style:
                          'font-size:12px;color:var(--el-color-primary);cursor:pointer;white-space:nowrap;line-height:1;margin-left:10px',
                        onClick: () => openTaskDrawer(row)
                      },
                      '查看进度'
                    )
                  ]
                : [])
            ])
          }
        },
        {
          prop: 'clusterType',
          label: '集群类型',
          width: 130,
          useHeaderSlot: true,
          formatter: (row: ClusterItem) =>
            h('span', { style: 'font-size:12px' }, row.clusterType === 1 ? '自建集群' : '标准集群')
        },
        {
          prop: 'version',
          label: 'Kubernetes 版本',
          minWidth: 150,
          labelClassName: 'cluster-nowrap-col',
          formatter: (row: ClusterItem) => h('span', { style: 'font-size:12px' }, row.version)
        },
        {
          prop: 'nodeCount',
          label: '节点数',
          formatter: (row: ClusterItem) => {
            if (row.nodeNotReady === 0) {
              return h('span', { style: 'font-size:12px;white-space:nowrap' }, [
                `${row.nodeCount}台（`,
                h('span', { style: 'color:var(--el-color-success)' }, '全部正常'),
                '）'
              ])
            }
            return h('span', { style: 'font-size:12px;white-space:nowrap' }, [
              `${row.nodeReady}台正常，`,
              h('span', { style: 'color:var(--el-color-danger)' }, `${row.nodeNotReady}台异常`)
            ])
          }
        },
        {
          prop: 'isProtected',
          label: '保护状态',
          formatter: (row: ClusterItem) =>
            h(ElSwitch, {
              modelValue: row.isProtected,
              loading: protectingIds.value.has(row.id),
              onChange: async (val: boolean) => {
                protectingIds.value.add(row.id)
                try {
                  await fetchProtectCluster(row.id, row.resourceVersion, val)
                  ElMessage.success(val ? '已开启保护' : '已关闭保护')
                  refreshData()
                } catch (e: any) {
                  ElMessage.error(e.message || '操作失败')
                } finally {
                  protectingIds.value.delete(row.id)
                }
              }
            })
        },
        {
          prop: 'createTime',
          label: '创建时间',
          sortable: true,
          width: 160,
          showOverflowTooltip: true,
          formatter: (row: ClusterItem) => h('span', { style: 'font-size:12px' }, row.createTime)
        },
        {
          prop: 'operation',
          label: '操作',
          width: 200,
          fixed: 'right',
          formatter: (row: ClusterItem) =>
            h('div', { style: 'display:flex;align-items:center;gap:12px;flex-wrap:nowrap' }, [
              h(
                ElLink,
                {
                  type: 'primary',
                  underline: 'never',
                  style: `font-size:12px;${isCustomClusterNotRunning(row) ? 'cursor:not-allowed;color:var(--el-text-color-disabled)' : ''}`,
                  onClick: () => goToClusterApiServer(row)
                },
                () => '查看集群凭证'
              ),
              h(
                ElLink,
                {
                  type: 'primary',
                  underline: 'never',
                  style: 'font-size:12px',
                  onClick: () => deleteCluster(row)
                },
                () => '删除'
              ),
              h(ArtButtonMore, {
                list: [
                  {
                    key: 'alert',
                    label: '配置告警',
                    icon: 'ri:alarm-warning-line',
                    disabled: isCustomClusterNotRunning(row)
                  },
                  {
                    key: 'logs',
                    label: '采集日志',
                    icon: 'ri:file-list-3-line',
                    disabled: isCustomClusterNotRunning(row)
                  },
                  {
                    key: 'destroy',
                    label: '销毁',
                    icon: 'ri:delete-back-2-line',
                    disabled: Number(row.clusterType) !== 1 || !row.planId
                  }
                ],
                onClick: (item: ButtonMoreItem) => clusterMoreClick(item, row)
              })
            ])
        }
      ]
    }
  })

  function openMonitor(row: ClusterItem) {
    monitorCluster.value = row
    monitorVisible.value = true
  }

  function openClusterTab(row: ClusterItem, tab: 'alert' | 'logs') {
    router.push({ path: `/container/${tab}`, query: clusterDetailQuery(row) })
  }

  function clusterMoreClick(item: ButtonMoreItem, row: ClusterItem) {
    switch (item.key) {
      case 'alert':
        if (isCustomClusterNotRunning(row)) return
        openClusterTab(row, 'alert')
        break
      case 'logs':
        if (isCustomClusterNotRunning(row)) return
        openClusterTab(row, 'logs')
        break
      case 'destroy':
        if (Number(row.clusterType) !== 1) return
        if (!row.planId) {
          ElMessage.warning('当前集群缺少关联的部署计划')
          return
        }
        void destroyPlan(row.planId, row.aliasName || row.name)
        break
    }
  }

  async function destroyPlan(planId: number, planName: string) {
    const restart = await confirmDestroyPlan(planName, {
      title: '销毁集群',
      messageBuilder: (name: string) => `确定要销毁集群 "${name}" 吗？`
    })
    if (restart === null) return
    try {
      await fetchDestroyPlan(planId, restart)
      ElMessage.success('销毁任务已提交')
      refreshData()
    } catch {}
  }

  function openRenameDialog(row: ClusterItem) {
    renameRow.value = row
    newAliasName.value = ''
    renameError.value = ''
    renameVisible.value = true
  }

  async function submitRename() {
    if (!newAliasName.value.trim()) {
      renameError.value = '集群名称不能为空'
      return
    }
    if (!renameRow.value) return
    renameLoading.value = true
    try {
      await fetchUpdateClusterAlias(
        renameRow.value.id,
        renameRow.value.resourceVersion,
        newAliasName.value.trim()
      )
      ElMessage.success('修改成功')
      renameVisible.value = false
      refreshData()
    } catch (e: any) {
      ElMessage.error(e.message || '修改失败')
    } finally {
      renameLoading.value = false
    }
  }

  function handleSearch(params: typeof searchForm.value) {
    replaceSearchParams(params)
    getData()
  }

  function handleReset() {
    resetSearchParams()
  }

  function getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message) return error.message
    const maybe = error as {
      message?: string
      response?: { data?: { message?: string } | string }
    }
    const data = maybe?.response?.data
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data) as { message?: string }
        if (parsed?.message) return parsed.message
      } catch {
        // ignore JSON parse error
      }
      return data || fallback
    }
    if (data && typeof data === 'object' && 'message' in data) {
      const msg = (data as { message?: string }).message
      if (msg) return msg
    }
    if (maybe?.message) return maybe.message
    return fallback
  }

  async function deleteCluster(row: ClusterItem) {
    try {
      await ElMessageBox.confirm(`确定要删除集群 "${row.clusterName}" 吗？`, '删除集群', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
      await fetchDeleteCluster(row.id)
      ElMessage.success('删除成功')
      refreshData()
    } catch (e: unknown) {
      if (e === 'cancel') return
      ElMessage.error(getErrorMessage(e, '删除失败'))
    }
  }

  function handleSelectionChange(rows: ClusterItem[]) {
    selectedRows.value = rows
  }

  function openTaskDrawer(row: ClusterItem) {
    if (!row.planId) {
      ElMessage.warning('当前集群缺少关联的部署计划')
      return
    }
    currentTaskCluster.value = row
    tasks.value = []
    taskDrawerVisible.value = true
  }

  function startTaskPolling() {
    stopTaskPolling()
    taskPollingTimer.value = setInterval(() => {
      void loadTasks(true)
    }, 5000)
  }

  function stopTaskPolling() {
    if (!taskPollingTimer.value) return
    clearInterval(taskPollingTimer.value)
    taskPollingTimer.value = null
  }

  function handleTaskDrawerOpen() {
    void loadTasks(true)
    startTaskPolling()
  }

  function handleTaskDrawerClose() {
    stopTaskPolling()
  }

  async function loadTasks(silent: boolean = false) {
    if (!currentTaskCluster.value?.planId) return
    if (!silent) tasksLoading.value = true
    try {
      tasks.value = await fetchPlanTasks(currentTaskCluster.value.planId)
    } catch (e: any) {
      ElMessage.error(e.message || '获取任务列表失败')
    } finally {
      if (!silent) tasksLoading.value = false
    }
  }

  onMounted(() => {
    refreshData()
  })

  onActivated(() => {
    refreshData()
  })

  onBeforeUnmount(() => {
    stopTaskPolling()
  })
</script>

<!-- 非 scoped：icon-action hover 效果需穿透子组件渲染的 DOM -->
<style>
  .cluster-page .icon-action {
    opacity: 0;
    transition: opacity 0.15s;
  }
  .cluster-page .el-table__row:hover .icon-action {
    opacity: 1;
  }
  /* 与后台表单（如菜单管理弹窗）视觉统一：表格正文字号略小于标题，易扫读 */
  .cluster-page .art-table .el-table {
    font-size: 13px;
  }
  .cluster-page .art-table .el-table th.el-table__cell {
    font-size: 13px;
  }
  .cluster-nowrap-col .cell {
    white-space: nowrap;
  }

  .cluster-type-header-tooltip {
    max-width: 360px;
    box-sizing: border-box;
  }

  .cluster-type-header-tooltip-inner {
    line-height: 1.6;
    text-align: left;
  }

  .cluster-type-header-tooltip-inner > div + div {
    margin-top: 8px;
  }

  .task-drawer {
    padding: 4px 0;
    overflow: hidden;
  }

  .task-alert {
    margin-top: 0;
    margin-bottom: 12px;
  }

  .task-status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
  }

  .task-empty {
    text-align: center;
    padding: 40px 0;
    color: var(--el-text-color-placeholder);
    font-size: 13px;
  }

  .plan-task-drawer :deep(.el-drawer__body) {
    overflow: auto;
  }

  .plan-task-drawer :deep(.el-table__header-wrapper th.el-table__cell) {
    font-size: 13px;
  }

  .plan-task-drawer :deep(.el-drawer.rtl) {
    height: 82vh;
    margin-top: 9vh;
  }


  .destroy-plan-dialog .el-message-box__message {
    padding-top: 2px;
  }
  .task-log-dialog .el-message-box__message {
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 60vh;
    overflow: auto;
    text-align: left;
  }
</style>

<style scoped>
  .cluster-type-header {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    vertical-align: middle;
  }

  .cluster-type-header__icon {
    display: inline-flex;
    align-items: center;
    cursor: help;
    line-height: 1;
    color: var(--el-text-color-secondary);
  }

  .cluster-type-header__icon-el {
    vertical-align: middle;
  }

  .rename-form {
    padding: 8px 16px 0;
  }

  .rename-row {
    display: flex;
    align-items: flex-start;
    margin-bottom: 20px;
  }

  .rename-label {
    width: 56px;
    flex-shrink: 0;
    margin-right: 16px;
    padding-top: 8px;
    color: var(--el-text-color-regular);
  }

  .rename-value {
    padding-top: 8px;
    color: var(--el-text-color-primary);
  }

  .rename-input-wrap {
    flex: 1;
  }

  .rename-error {
    display: block;
    margin-top: 4px;
    font-size: 12px;
    color: var(--el-color-danger);
  }
</style>
