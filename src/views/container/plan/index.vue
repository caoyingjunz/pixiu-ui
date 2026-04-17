<template>
  <div class="plan-page art-full-height">
    <!-- 搜索栏 -->
    <ElCard class="art-search-card">
      <div class="search-bar">
        <span class="search-label">部署名称</span>
        <ElInput
          v-model="searchName"
          placeholder="请输入部署名称"
          clearable
          style="width: 240px"
          @keyup.enter="handleSearch"
        />
        <span class="search-label status-label">状态</span>
        <ElSelect
          v-model="searchStatus"
          placeholder="全部"
          clearable
          style="width: 200px"
          @change="handleSearch"
        >
          <ElOption label="未开始" value="未开始" />
          <ElOption label="运行中" value="运行中" />
          <ElOption label="已成功" value="已成功" />
          <ElOption label="已失败" value="已失败" />
        </ElSelect>
        <ElButton @click="handleReset">重置</ElButton>
        <ElButton type="primary" @click="handleSearch">查询</ElButton>
      </div>
    </ElCard>

    <ElCard class="art-table-card">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <ElButton v-ripple @click="goToCreate">新增部署</ElButton>
        </template>
      </ArtTableHeader>

      <ArtTable
        row-key="id"
        :loading="loading"
        :data="filteredData"
        :columns="columns"
        :pagination="pagination"
        :pagination-options="{ align: 'right' }"
        @selection-change="handleSelectionChange"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      />
    </ElCard>

    <!-- 任务进度抽屉 -->
    <ElDrawer
      v-model="taskDrawerVisible"
      title="部署进度"
      size="45%"
      :destroy-on-close="true"
      @open="loadTasks"
    >
      <div class="task-drawer">
        <div class="task-drawer-toolbar">
          <ElButton size="small" :loading="tasksLoading" @click="loadTasks">刷新</ElButton>
        </div>
        <ElTable :data="tasks" border size="small" style="margin-top: 12px">
          <ElTableColumn label="任务名称" prop="name" min-width="160" />
          <ElTableColumn label="状态" width="130">
            <template #default="{ row }">
              <div class="task-status">
                <ElIcon v-if="row.status === '运行中'" class="is-loading" color="var(--el-color-primary)">
                  <Loading />
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
          <ElTableColumn label="更新时间" prop="gmt_modified" min-width="160">
            <template #default="{ row }">{{ formatDate(row.gmt_modified) }}</template>
          </ElTableColumn>
        </ElTable>
        <div v-if="tasks.length === 0 && !tasksLoading" class="task-empty">暂无部署任务</div>
      </div>
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import { ElIcon, ElLink, ElMessage, ElMessageBox, ElOption, ElSelect, ElTag } from 'element-plus'
  import {
    SuccessFilled,
    CircleCloseFilled,
    Loading,
    RemoveFilled,
    CopyDocument
  } from '@element-plus/icons-vue'
  import ArtButtonMore, {
    type ButtonMoreItem
  } from '@/components/core/forms/art-button-more/index.vue'
  import { useTable } from '@/hooks/core/useTable'
  import { useRouter } from 'vue-router'
  import {
    fetchPlanList,
    fetchDeletePlan,
    fetchStartPlan,
    fetchPlanTasks
  } from '@/api/plan'
  import type { PlanItemFormatted, PlanTask } from '@/api/plan'

  defineOptions({ name: 'Plan' })

  const router = useRouter()

  function formatDate(iso: string): string {
    if (!iso) return '-'
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  }

  // 搜索
  const searchName = ref('')
  const searchStatus = ref('')
  const appliedSearch = ref('')
  const appliedStatus = ref('')
  const selectedRows = ref<PlanItemFormatted[]>([])

  // 任务进度抽屉
  const taskDrawerVisible = ref(false)
  const currentPlan = ref<PlanItemFormatted | null>(null)
  const tasks = ref<PlanTask[]>([])
  const tasksLoading = ref(false)

  const {
    columns,
    columnChecks,
    data,
    loading,
    pagination,
    getData,
    handleSizeChange,
    handleCurrentChange,
    refreshData
  } = useTable({
    core: {
      apiFn: async (params: { current: number; size: number }) => {
        const { list, total } = await fetchPlanList({
          page: params.current,
          limit: params.size,
          nameSelector: appliedSearch.value || undefined,
          step: appliedStatus.value || undefined
        })
        return {
          code: 200,
          data: { records: list, total, current: params.current, size: params.size }
        }
      },
      apiParams: { current: 1, size: 10 },
      columnsFactory: () => [
        { type: 'selection' },
        {
          prop: 'name',
          label: '名称',
          minWidth: 150,
          showOverflowTooltip: true,
          formatter: (row: PlanItemFormatted) =>
            h('div', { style: 'display:flex;align-items:center;gap:6px' }, [
              h(
                ElLink,
                {
                  type: 'primary',
                  underline: 'never',
                  style: 'font-size:14px',
                  onClick: () => goToDetail(row)
                },
                () => row.name
              ),
              h(
                'span',
                {
                  class: 'plan-icon-action',
                  style: 'cursor:pointer;color:var(--el-text-color-secondary);display:inline-flex;align-items:center',
                  title: '复制名称',
                  onClick: (e: MouseEvent) => {
                    e.stopPropagation()
                    navigator.clipboard.writeText(row.name)
                    ElMessage.success('已复制')
                  }
                },
                [h(CopyDocument, { style: 'width:12px;height:12px' })]
              )
            ])
        },
        {
          prop: 'step',
          label: '状态',
          width: 100,
          formatter: (row: PlanItemFormatted) => {
            const map: Record<string, { type: 'info' | 'primary' | 'success' | 'danger' }> = {
              '未开始': { type: 'info' },
              '运行中': { type: 'primary' },
              '已成功': { type: 'success' },
              '已失败': { type: 'danger' }
            }
            const cfg = map[row.step] ?? { type: 'info' as const }
            return h(ElTag, { type: cfg.type }, () => row.step)
          }
        },
        {
          prop: 'kubernetesVersion',
          label: 'Kubernetes 版本',
          width: 200,
          formatter: (row: PlanItemFormatted) =>
            h('span', { style: 'font-size:12px' }, row.kubernetesVersion || '-')
        },
        {
          prop: 'nodeCount',
          label: '节点数',
          width: 110,
          formatter: (row: PlanItemFormatted) =>
            h('span', { style: 'font-size:12px' }, String(row.nodeCount))
        },
        {
          prop: 'createTime',
          label: '创建时间',
          sortable: true,
          width: 176,
          showOverflowTooltip: true,
          formatter: (row: PlanItemFormatted) =>
            h('span', { style: 'font-size:12px' }, row.createTime)
        },
        {
          prop: 'description',
          label: '描述',
          minWidth: 200,
          showOverflowTooltip: true,
          formatter: (row: PlanItemFormatted) =>
            h('span', { style: 'font-size:12px;color:var(--el-text-color-secondary)' }, row.description || '-')
        },
        {
          prop: 'operation',
          label: '操作',
          width: 190,
          fixed: 'right',
          formatter: (row: PlanItemFormatted) =>
            h('div', { style: 'display:flex;align-items:center;gap:12px;flex-wrap:nowrap' }, [
              h(
                ElLink,
                {
                  type: 'primary',
                  underline: 'never',
                  style: 'font-size:12px',
                  onClick: () => startPlan(row)
                },
                () => '开始部署'
              ),
              h(
                ElLink,
                {
                  type: 'primary',
                  underline: 'never',
                  style: 'font-size:12px',
                  onClick: () => openTaskDrawer(row)
                },
                () => '进度'
              ),
              h(ArtButtonMore, {
                list: [{ key: 'delete', label: '删除', icon: 'ri:delete-bin-line' }],
                onClick: (item: ButtonMoreItem) => {
                  if (item.key === 'delete') deletePlan(row)
                }
              })
            ])
        }
      ]
    }
  })

  // 前端过滤
  const filteredData = computed(() => {
    return data.value.filter((item) => {
      const nameMatch = !appliedSearch.value || item.name.toLowerCase().includes(appliedSearch.value.toLowerCase())
      const statusMatch = !appliedStatus.value || item.step === appliedStatus.value
      return nameMatch && statusMatch
    })
  })

  function handleSearch() {
    appliedSearch.value = searchName.value
    appliedStatus.value = searchStatus.value
    refreshData()
  }

  function handleReset() {
    searchName.value = ''
    searchStatus.value = ''
    appliedSearch.value = ''
    appliedStatus.value = ''
    refreshData()
  }

  function goToCreate() {
    router.push('/container/cluster/deploy')
  }

  function goToDetail(row: PlanItemFormatted) {
    router.push({ path: '/container/cluster/deploy', query: { planId: String(row.id) } })
  }

  async function startPlan(row: PlanItemFormatted) {
    try {
      await ElMessageBox.confirm(`确定要启动计划 "${row.name}" 的部署任务吗？`, '启动部署', {
        confirmButtonText: '启动',
        cancelButtonText: '取消',
        type: 'warning'
      })
      await fetchStartPlan(row.id)
      ElMessage.success(`计划 "${row.name}" 启动成功`)
      refreshData()
    } catch {}
  }

  async function deletePlan(row: PlanItemFormatted) {
    try {
      await ElMessageBox.confirm(`确定要删除计划 "${row.name}" 吗？`, '删除计划', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
      await fetchDeletePlan(row.id)
      ElMessage.success('删除成功')
      refreshData()
    } catch {}
  }

  function openTaskDrawer(row: PlanItemFormatted) {
    currentPlan.value = row
    tasks.value = []
    taskDrawerVisible.value = true
  }

  async function loadTasks() {
    if (!currentPlan.value) return
    tasksLoading.value = true
    try {
      tasks.value = await fetchPlanTasks(currentPlan.value.id)
    } catch (e: any) {
      ElMessage.error(e.message || '获取任务列表失败')
    } finally {
      tasksLoading.value = false
    }
  }

  function handleSelectionChange(rows: PlanItemFormatted[]) {
    selectedRows.value = rows
  }
</script>

<style>
  .plan-page .plan-icon-action {
    opacity: 0;
    transition: opacity 0.15s;
  }
  .plan-page .el-table__row:hover .plan-icon-action {
    opacity: 1;
  }
  .plan-page .art-table .el-table {
    font-size: 13px;
  }
  .plan-page .art-table .el-table th.el-table__cell {
    font-size: 13px;
  }
</style>

<style scoped>
  .search-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .search-label {
    font-size: 14px;
    color: var(--el-text-color-regular);
    white-space: nowrap;
  }

  .status-label {
    margin-left: 30px;
  }

  .task-drawer {
    padding: 4px 0;
  }

  .task-drawer-toolbar {
    display: flex;
    justify-content: flex-end;
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
</style>
