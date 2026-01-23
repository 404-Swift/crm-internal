import type { EChartsOption } from 'echarts'
import type { Deal } from '@/types/deal'
import type { Contact } from '@/types/contact'

// Common dark theme text styles for ECharts
const darkTextStyle = {
  color: '#fafafa',
  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  fontSize: 12,
}

const darkAxisLabelStyle = {
  color: '#a3a3a3',
  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  fontSize: 11,
}

// Helper function to get pipeline data
const getPipelineData = (deals: Deal[]) => {
  const stageCounts = deals.reduce((acc, deal) => {
    acc[deal.stage] = (acc[deal.stage] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Color palette for charts
  const stageColors = [
    '#60a5fa', // blue - prospecting
    '#34d399', // green - qualification
    '#fbbf24', // yellow - proposal
    '#f472b6', // pink - negotiation
    '#10b981', // emerald - closed-won
    '#ef4444', // red - closed-lost
  ]

  const stages = ['prospecting', 'qualification', 'proposal', 'negotiation', 'closed-won', 'closed-lost']
  return stages.map((stage, index) => ({
    value: stageCounts[stage] || 0,
    name: stage.charAt(0).toUpperCase() + stage.slice(1).replace('-', ' '),
    itemStyle: {
      color: stageColors[index],
    },
  }))
}

export const getPipelineBarConfig = (deals: Deal[]): EChartsOption => {
  const data = getPipelineData(deals)

  return {
    backgroundColor: 'transparent',
    textStyle: darkTextStyle,
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      backgroundColor: 'rgba(20, 20, 20, 0.95)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
      textStyle: {
        color: '#fafafa',
        fontSize: 12,
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: data.map((d) => d.name),
      axisTick: {
        alignWithLabel: true,
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
      axisLabel: darkAxisLabelStyle,
      axisLine: {
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
    },
    yAxis: {
      type: 'value',
      axisLabel: darkAxisLabelStyle,
      axisLine: {
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
      },
    },
    series: [
      {
        name: 'Pipeline',
        type: 'bar',
        barWidth: '60%',
        data: data.map((d) => ({
          value: d.value,
          itemStyle: {
            color: d.itemStyle?.color,
            borderRadius: [4, 4, 0, 0],
          },
        })),
        label: {
          show: true,
          position: 'top',
          color: '#fafafa',
          fontSize: 11,
          fontWeight: 500,
        },
      },
    ],
  }
}

export const getPipelinePieConfig = (deals: Deal[]): EChartsOption => {
  const data = getPipelineData(deals)

  return {
    backgroundColor: 'transparent',
    textStyle: darkTextStyle,
    grid: {
      left: '5%',
      right: '5%',
      top: '10%',
      bottom: '25%',
      containLabel: false,
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
      backgroundColor: 'rgba(20, 20, 20, 0.95)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
      textStyle: {
        color: '#fafafa',
        fontSize: 12,
      },
    },
    legend: {
      orient: 'horizontal',
      bottom: 10,
      left: 'center',
      textStyle: {
        color: '#a3a3a3',
        fontSize: 11,
      },
      itemWidth: 14,
      itemHeight: 14,
      itemGap: 10,
    },
    series: [
      {
        name: 'Pipeline',
        type: 'pie',
        radius: ['30%', '60%'],
        center: ['50%', '40%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: 'rgba(20, 20, 20, 0.8)',
          borderWidth: 2,
        },
        label: {
          show: true,
          formatter: '{b}: {c}',
          color: '#fafafa',
          fontSize: 11,
          fontWeight: 500,
        },
        labelLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.3)',
          },
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 13,
            fontWeight: 600,
            color: '#fafafa',
          },
        },
        data,
      },
    ],
  }
}

export const getDealsByStageOverTimeConfig = (deals: Deal[]): EChartsOption => {
  const stages = ['prospecting', 'qualification', 'proposal', 'negotiation', 'closed-won']
  const months = Array.from({ length: 6 }, (_, i) => {
    const date = new Date()
    date.setMonth(date.getMonth() - (5 - i))
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  })

  // Color palette for dark mode
  const stageColors = [
    '#60a5fa', // blue
    '#34d399', // green
    '#fbbf24', // yellow
    '#f472b6', // pink
    '#a78bfa', // purple
  ]

  const series = stages.map((stage, index) => {
    const stageDeals = deals.filter((d) => d.stage === stage)
    const monthlyCounts = months.map((month) => {
      const monthDate = new Date(month)
      return stageDeals.filter((deal) => {
        const dealDate = new Date(deal.created_at)
        return (
          dealDate.getMonth() === monthDate.getMonth() &&
          dealDate.getFullYear() === monthDate.getFullYear()
        )
      }).length
    })

    return {
      name: stage.charAt(0).toUpperCase() + stage.slice(1).replace('-', ' '),
      type: 'line' as const,
      smooth: true,
      data: monthlyCounts,
      lineStyle: {
        color: stageColors[index % stageColors.length],
        width: 2,
      },
      itemStyle: {
        color: stageColors[index % stageColors.length],
      },
      areaStyle: {
        color: {
          type: 'linear' as const,
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            {
              offset: 0,
              color: stageColors[index % stageColors.length] + '40',
            },
            {
              offset: 1,
              color: stageColors[index % stageColors.length] + '05',
            },
          ],
        },
      },
    }
  })

  return {
    backgroundColor: 'transparent',
    textStyle: darkTextStyle,
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(20, 20, 20, 0.95)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
      textStyle: {
        color: '#fafafa',
        fontSize: 12,
      },
    },
    legend: {
      data: stages.map((s) => s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' ')),
      bottom: 0,
      textStyle: {
        color: '#a3a3a3',
        fontSize: 11,
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: months,
      axisLabel: darkAxisLabelStyle,
      axisLine: {
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
      splitLine: {
        show: false,
      },
    },
    yAxis: {
      type: 'value',
      axisLabel: darkAxisLabelStyle,
      axisLine: {
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
      },
    },
    series,
  }
}

export const getContactsBySourceConfig = (contacts: Contact[]): EChartsOption => {
  const sourceCounts = contacts.reduce((acc, contact) => {
    const source = contact.source || 'unknown'
    acc[source] = (acc[source] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Color palette for pie chart
  const pieColors = [
    '#60a5fa', // blue
    '#34d399', // green
    '#fbbf24', // yellow
    '#f472b6', // pink
    '#a78bfa', // purple
    '#fb923c', // orange
    '#38bdf8', // cyan
  ]

  const data = Object.entries(sourceCounts).map(([name, value], index) => ({
    value,
    name: name.charAt(0).toUpperCase() + name.slice(1),
    itemStyle: {
      color: pieColors[index % pieColors.length],
    },
  }))

  return {
    backgroundColor: 'transparent',
    textStyle: darkTextStyle,
    grid: {
      left: '5%',
      right: '5%',
      top: '10%',
      bottom: '25%',
      containLabel: false,
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
      backgroundColor: 'rgba(20, 20, 20, 0.95)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
      textStyle: {
        color: '#fafafa',
        fontSize: 12,
      },
    },
    legend: {
      orient: 'horizontal',
      bottom: 10,
      left: 'center',
      textStyle: {
        color: '#a3a3a3',
        fontSize: 11,
      },
      itemWidth: 14,
      itemHeight: 14,
      itemGap: 10,
    },
    series: [
      {
        name: 'Contacts by Source',
        type: 'pie',
        radius: ['30%', '60%'],
        center: ['50%', '40%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: 'rgba(20, 20, 20, 0.8)',
          borderWidth: 2,
        },
        label: {
          show: true,
          formatter: '{b}: {c}',
          color: '#fafafa',
          fontSize: 11,
          fontWeight: 500,
        },
        labelLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.3)',
          },
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 13,
            fontWeight: 600,
            color: '#fafafa',
          },
        },
        data,
      },
    ],
  }
}

export const getActivityTimelineConfig = (activities: Array<{ type: string; created_at: string }>): EChartsOption => {
  const typeCounts = activities.reduce((acc, activity) => {
    acc[activity.type] = (acc[activity.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Color palette for bar chart
  const barColors = [
    '#60a5fa', // blue
    '#34d399', // green
    '#fbbf24', // yellow
    '#f472b6', // pink
  ]

  const data = Object.entries(typeCounts).map(([name, value], index) => ({
    value,
    name: name.charAt(0).toUpperCase() + name.slice(1),
    itemStyle: {
      color: barColors[index % barColors.length],
    },
  }))

  return {
    backgroundColor: 'transparent',
    textStyle: darkTextStyle,
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      backgroundColor: 'rgba(20, 20, 20, 0.95)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
      textStyle: {
        color: '#fafafa',
        fontSize: 12,
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: data.map((d) => d.name),
      axisTick: {
        alignWithLabel: true,
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
      axisLabel: darkAxisLabelStyle,
      axisLine: {
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
    },
    yAxis: {
      type: 'value',
      axisLabel: darkAxisLabelStyle,
      axisLine: {
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
      },
    },
    series: [
      {
        name: 'Activities',
        type: 'bar',
        barWidth: '60%',
        data: data.map((d) => ({
          value: d.value,
          itemStyle: {
            color: d.itemStyle?.color,
            borderRadius: [4, 4, 0, 0],
          },
        })),
        label: {
          show: true,
          position: 'top',
          color: '#fafafa',
          fontSize: 11,
          fontWeight: 500,
        },
      },
    ],
  }
}
