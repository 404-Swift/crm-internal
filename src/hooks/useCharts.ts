import { useEffect, useRef } from 'react'
import * as echarts from 'echarts/core'
import type { EChartsOption } from 'echarts'

export function useChart(
  option: EChartsOption | null,
  theme?: string
) {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstanceRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!chartRef.current || !option) return

    // Initialize chart
    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartRef.current, theme)
    }

    const chart = chartInstanceRef.current
    chart.setOption(option, true)

    // Handle resize
    const handleResize = () => {
      chart.resize()
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose()
        chartInstanceRef.current = null
      }
    }
  }, [option, theme])

  return chartRef
}
