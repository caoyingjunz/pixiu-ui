<template>
  <ElDrawer
    v-model="visible"
    :title="cluster?.clusterName"
    direction="rtl"
    size="65%"
    :destroy-on-close="true"
  >
    <ElTabs v-model="activeTab" class="monitor-tabs">
      <ElTabPane label="CPU" name="cpu">
        <div class="chart-grid">
          <div v-for="item in cpuMetrics" :key="item.title" class="chart-panel">
            <div class="panel-header">
              <span class="panel-title">{{ item.title }}</span>
            </div>
            <ArtLineChart
              :data="item.data"
              :xAxisData="timeLabels"
              :showAreaColor="true"
              :smooth="true"
              height="180px"
            />
          </div>
        </div>
      </ElTabPane>

      <ElTabPane label="内存" name="memory">
        <div class="chart-grid">
          <div v-for="item in memoryMetrics" :key="item.title" class="chart-panel">
            <div class="panel-header">
              <span class="panel-title">{{ item.title }}</span>
            </div>
            <ArtLineChart
              :data="item.data"
              :xAxisData="timeLabels"
              :showAreaColor="true"
              :smooth="true"
              height="180px"
            />
          </div>
        </div>
      </ElTabPane>

      <ElTabPane label="存储" name="storage">
        <div class="chart-grid">
          <div v-for="item in storageMetrics" :key="item.title" class="chart-panel">
            <div class="panel-header">
              <span class="panel-title">{{ item.title }}</span>
            </div>
            <ArtLineChart
              :data="item.data"
              :xAxisData="timeLabels"
              :showAreaColor="true"
              :smooth="true"
              height="180px"
            />
          </div>
        </div>
      </ElTabPane>

      <ElTabPane label="网络" name="network">
        <div class="chart-grid">
          <div v-for="item in networkMetrics" :key="item.title" class="chart-panel">
            <div class="panel-header">
              <span class="panel-title">{{ item.title }}</span>
            </div>
            <ArtLineChart
              :data="item.data"
              :xAxisData="timeLabels"
              :showAreaColor="true"
              :smooth="true"
              height="180px"
            />
          </div>
        </div>
      </ElTabPane>

      <ElTabPane label="事件" name="events">
        <ElTable :data="eventList" stripe style="width: 100%">
          <ElTableColumn prop="time" label="时间" width="180" />
          <ElTableColumn prop="level" label="级别" width="90">
            <template #default="{ row }">
              <ElTag :type="row.level === 'Warning' ? 'warning' : 'info'" size="small">
                {{ row.level }}
              </ElTag>
            </template>
          </ElTableColumn>
          <ElTableColumn prop="reason" label="原因" width="150" />
          <ElTableColumn prop="message" label="消息" />
        </ElTable>
      </ElTabPane>
    </ElTabs>
  </ElDrawer>
</template>

<script setup lang="ts">
  import ArtLineChart from '@/components/core/charts/art-line-chart/index.vue'

  interface ClusterItem {
    id: number
    clusterName: string
  }

  interface Props {
    modelValue: boolean
    cluster: ClusterItem | null
  }
  interface Emits {
    (e: 'update:modelValue', val: boolean): void
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  const visible = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
  })

  const activeTab = ref('cpu')

  // 生成过去1小时的时间轴（每6分钟一个点，共10个点）
  const timeLabels = computed(() => {
    const now = new Date()
    return Array.from({ length: 10 }, (_, i) => {
      const t = new Date(now.getTime() - (9 - i) * 6 * 60 * 1000)
      return `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`
    })
  })

  // 生成随机波动数据
  function mockSeries(base: number, range: number): number[] {
    return Array.from({ length: 10 }, () =>
      Math.max(0, +(base + (Math.random() - 0.5) * range * 2).toFixed(1))
    )
  }

  const cpuMetrics = computed(() => [
    { title: 'CPU 总配置（核）', data: mockSeries(64, 0) },
    { title: 'CPU 利用率（%）', data: mockSeries(42, 15) },
    { title: 'CPU 使用量（核）', data: mockSeries(27, 10) },
    { title: 'CPU 请求量（核）', data: mockSeries(18, 8) }
  ])

  const memoryMetrics = computed(() => [
    { title: '内存总量（GB）', data: mockSeries(128, 0) },
    { title: '内存使用率（%）', data: mockSeries(58, 12) },
    { title: '内存使用量（GB）', data: mockSeries(74, 10) },
    { title: '内存请求量（GB）', data: mockSeries(50, 8) }
  ])

  const storageMetrics = computed(() => [
    { title: '存储总量（GB）', data: mockSeries(500, 0) },
    { title: '存储使用率（%）', data: mockSeries(35, 8) },
    { title: '磁盘读速率（MB/s）', data: mockSeries(120, 40) },
    { title: '磁盘写速率（MB/s）', data: mockSeries(80, 30) }
  ])

  const networkMetrics = computed(() => [
    { title: '网络入流量（Mbps）', data: mockSeries(200, 80) },
    { title: '网络出流量（Mbps）', data: mockSeries(150, 60) },
    { title: '网络包接收（pps）', data: mockSeries(3000, 800) },
    { title: '网络包发送（pps）', data: mockSeries(2500, 700) }
  ])

  const eventList = [
    { time: '2024-04-18 10:23:01', level: 'Normal', reason: 'Scheduled', message: '成功将 pod 调度到节点 node-01' },
    { time: '2024-04-18 10:22:45', level: 'Normal', reason: 'Pulling', message: '正在拉取镜像 nginx:1.25' },
    { time: '2024-04-18 10:21:30', level: 'Warning', reason: 'BackOff', message: 'Back-off restarting failed container' },
    { time: '2024-04-18 10:20:10', level: 'Normal', reason: 'Started', message: '容器 nginx 启动成功' },
    { time: '2024-04-18 10:18:55', level: 'Warning', reason: 'OOMKilling', message: '内存不足，容器被终止' },
    { time: '2024-04-18 10:15:22', level: 'Normal', reason: 'NodeReady', message: '节点 node-02 已就绪' }
  ]

  // 切换集群时重置 tab
  watch(() => props.cluster, () => { activeTab.value = 'cpu' })
</script>

<style scoped>
  .monitor-tabs {
    height: 100%;
  }

  .chart-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .chart-panel {
    border: 1px solid var(--el-border-color-light);
    border-radius: 8px;
    padding: 16px;
    background: var(--el-bg-color);
  }

  .panel-header {
    margin-bottom: 8px;
  }

  .panel-title {
    font-size: 13px;
    font-weight: 500;
    color: var(--el-text-color-primary);
  }
</style>
