import { useMemo, useState } from 'react'
import { CommonCastForm } from './components/CommonCastForm'
import { CommonCastGraph } from './components/CommonCastGraph'
import { findCommonCast } from './features/common-cast/commonCastService'
import { buildCommonCastGraph } from './features/common-cast/graphModel'
import type { CommonCastResult } from './features/common-cast/types'
import './App.css'

function App() {
  const [leftTitle, setLeftTitle] = useState('')
  const [rightTitle, setRightTitle] = useState('')
  const [nodeSpacing, setNodeSpacing] = useState(1.5)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [commonCastResult, setCommonCastResult] = useState<CommonCastResult | null>(null)

  const graphData = useMemo(
    () => (commonCastResult ? buildCommonCastGraph(commonCastResult) : { nodes: [], links: [] }),
    [commonCastResult],
  )

  const handleSubmit = async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const result = await findCommonCast(leftTitle, rightTitle)
      setCommonCastResult(result)
    } catch (error) {
      setCommonCastResult(null)
      const message = error instanceof Error ? error.message : 'Something went wrong while fetching TMDB data.'
      setErrorMessage(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="app-shell">
      <div className="ambient-glow ambient-left" />
      <div className="ambient-glow ambient-right" />
      <main className="app-main">
        <header className="hero">
          <p className="eyebrow">TMDB Cast Explorer</p>
          <h1>Find Actors Shared Between Any Two Titles</h1>
          <p className="hero-copy">
            Enter any movie or TV series titles and render an interactive node-link graph of actors who appear in both.
          </p>
        </header>

        <section className="panel">
          <CommonCastForm
            leftTitle={leftTitle}
            rightTitle={rightTitle}
            isLoading={isLoading}
            onLeftTitleChange={setLeftTitle}
            onRightTitleChange={setRightTitle}
            onSubmit={handleSubmit}
          />
        </section>

        {isLoading ? <p className="status status-loading">Resolving titles and matching casts...</p> : null}
        {errorMessage ? <p className="status status-error">{errorMessage}</p> : null}

        {commonCastResult ? (
          <section className="results">
            <div className="result-summary">
              <div className="title-pill left-pill">{commonCastResult.left.media.title}</div>
              <div className="summary-meta">
                <span>{commonCastResult.sharedActors.length} shared actor(s)</span>
              </div>
              <div className="title-pill right-pill">{commonCastResult.right.media.title}</div>
            </div>

            {commonCastResult.sharedActors.length > 0 ? (
              <>
                <div className="graph-controls">
                  <label className="graph-control-label" htmlFor="node-spacing">
                    Node spacing
                  </label>
                  <input
                    id="node-spacing"
                    className="graph-control-slider"
                    type="range"
                    min={0.8}
                    max={2.7}
                    step={0.1}
                    value={nodeSpacing}
                    onChange={(event) => setNodeSpacing(Number(event.target.value))}
                  />
                  <span className="graph-control-value">{nodeSpacing.toFixed(1)}x</span>
                </div>
                <div className="graph-legend" aria-label="Actor node color legend">
                  <span className="legend-item">
                    <span className="legend-dot legend-star-both" />
                    Star on both
                  </span>
                  <span className="legend-item">
                    <span className="legend-dot legend-mixed" />
                    Star on one only
                  </span>
                  <span className="legend-item">
                    <span className="legend-dot legend-extra-both" />
                    Extra/supporting on both
                  </span>
                </div>

                <CommonCastGraph graphData={graphData} nodeSpacing={nodeSpacing} />

                <div className="actor-list">
                  {commonCastResult.sharedActors.slice(0, 18).map((actor) => (
                    <span className="actor-chip" key={actor.id}>
                      {actor.name}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p className="status status-empty">No overlapping actors were found for this pair.</p>
            )}
          </section>
        ) : null}
      </main>
    </div>
  )
}

export default App
