'use client'

import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'

interface MermaidDiagramProps {
  chart: string
  id?: string
}

// Initialize mermaid with default config
mermaid.initialize({
  startOnLoad: true,
  theme: 'default',
  securityLevel: 'loose',
  themeVariables: {
    primaryColor: '#e0e7ff',
    primaryTextColor: '#1e3a8a',
    primaryBorderColor: '#4f46e5',
    lineColor: '#6b7280',
    secondaryColor: '#fef3c7',
    tertiaryColor: '#ddd6fe',
    background: 'white',
    mainBkg: '#e0e7ff',
    secondBkg: '#fef3c7',
    tertiaryBkg: '#ddd6fe',
    secondaryBorderColor: '#f59e0b',
    tertiaryBorderColor: '#8b5cf6',
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
    fontSize: '16px',
  },
  flowchart: {
    htmlLabels: true,
    curve: 'basis',
    rankSpacing: 50,
    nodeSpacing: 30,
    padding: 15,
  },
})

export default function MermaidDiagram({ chart, id }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [svg, setSvg] = useState<string>('')

  useEffect(() => {
    const renderDiagram = async () => {
      if (!containerRef.current || !chart) return

      try {
        // Clear any previous content
        containerRef.current.innerHTML = ''
        setError(null)

        // Generate unique ID for this diagram
        const diagramId = id || `mermaid-${Math.random().toString(36).substr(2, 9)}`
        
        // Render the diagram
        const { svg } = await mermaid.render(diagramId, chart)
        setSvg(svg)
        
        // Insert the SVG into the container
        if (containerRef.current) {
          containerRef.current.innerHTML = svg
        }
      } catch (err) {
        console.error('Mermaid rendering error:', err)
        setError('Failed to render diagram. Please check the syntax.')
      }
    }

    renderDiagram()
  }, [chart, id])

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 my-4">
        <p className="text-red-600 text-sm">{error}</p>
        <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-x-auto">
          <code>{chart}</code>
        </pre>
      </div>
    )
  }

  return (
    <div className="my-6 overflow-x-auto">
      <div 
        ref={containerRef}
        className="mermaid-diagram flex justify-center"
        style={{ minHeight: '200px' }}
      />
    </div>
  )
}