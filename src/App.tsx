import React, { useRef, useState, useEffect, useCallback } from 'react';
import './App.css';

type Step = 1 | 2 | 3;

interface CrayonColor {
  name: string;
  hex: string;
}

const CRAYON_COLORS: CrayonColor[] = [
  { name: 'あか', hex: '#FF595E' },
  { name: 'だいだい', hex: '#FF924C' },
  { name: 'やまぶき', hex: '#FFCA3A' },
  { name: 'きいろ', hex: '#F9E952' },
  { name: 'きみどり', hex: '#8AC926' },
  { name: 'みどり', hex: '#38B000' },
  { name: 'エメラルド', hex: '#2EC4B6' },
  { name: 'みずいろ', hex: '#4CC9F0' },
  { name: 'あお', hex: '#1982C4' },
  { name: 'こんいろ', hex: '#3F37C9' },
  { name: 'むらさき', hex: '#6A4C93' },
  { name: 'ふじいろ', hex: '#B5179E' },
  { name: 'ピンク', hex: '#FF70A6' },
  { name: 'うすだいだい', hex: '#FFD6A5' },
  { name: 'ちゃいろ', hex: '#9C6644' },
  { name: 'おうどいろ', hex: '#DDA15E' },
];

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 540;

export function App() {
  const [step, setStep] = useState<Step>(1);
  const [selectedColor, setSelectedColor] = useState<string>(CRAYON_COLORS[0].hex);
  const [brushSize, setBrushSize] = useState<number>(28);
  const [scratchSize, setScratchSize] = useState<number>(4);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);

  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const topCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  // キャンバス初期化（真っ白な画用紙）
  const initCanvases = useCallback(() => {
    const baseCanvas = baseCanvasRef.current;
    const topCanvas = topCanvasRef.current;
    if (!baseCanvas || !topCanvas) return;

    const baseCtx = baseCanvas.getContext('2d');
    const topCtx = topCanvas.getContext('2d');
    if (!baseCtx || !topCtx) return;

    // 下地キャンバスを真っ白に初期化
    baseCtx.globalCompositeOperation = 'source-over';
    baseCtx.fillStyle = '#FFFFFF';
    baseCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 上層（黒塗り・削り用）キャンバスを透明にクリア
    topCtx.globalCompositeOperation = 'source-over';
    topCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }, []);

  useEffect(() => {
    initCanvases();
  }, [initCanvases]);

  // 座標変換（レスポンシブ縮小表示に対応）
  const getCoordinates = (
    e: React.PointerEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement
  ) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  // クレヨン風の質感を出す描画ヘルパー
  const drawCrayonStroke = (
    ctx: CanvasRenderingContext2D,
    from: { x: number; y: number },
    to: { x: number; y: number },
    color: string,
    size: number
  ) => {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    // クレヨンらしい粒状感（ランダムな細かい点）を追加
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    const steps = Math.max(1, Math.floor(dist / 2));
    ctx.fillStyle = color;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const cx = from.x + (to.x - from.x) * t;
      const cy = from.y + (to.y - from.y) * t;
      for (let j = 0; j < 4; j++) {
        const offsetX = (Math.random() - 0.5) * size * 0.9;
        const offsetY = (Math.random() - 0.5) * size * 0.9;
        ctx.fillRect(cx + offsetX, cy + offsetY, 1.5, 1.5);
      }
    }
    ctx.restore();
  };

  // ひっかき棒で削る処理
  const scratchStroke = (
    ctx: CanvasRenderingContext2D,
    from: { x: number; y: number },
    to: { x: number; y: number },
    size: number
  ) => {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = 'rgba(0,0,0,1)';
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.restore();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const canvas = step === 1 ? baseCanvasRef.current : topCanvasRef.current;
    if (!canvas) return;

    const pos = getCoordinates(e, canvas);
    setIsDrawing(true);
    lastPosRef.current = pos;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (step === 1) {
      drawCrayonStroke(ctx, pos, pos, selectedColor, brushSize);
    } else if (step === 2) {
      drawCrayonStroke(ctx, pos, pos, '#1C1C21', Math.max(brushSize, 36));
    } else if (step === 3) {
      scratchStroke(ctx, pos, pos, scratchSize);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPosRef.current) return;
    const canvas = step === 1 ? baseCanvasRef.current : topCanvasRef.current;
    if (!canvas) return;

    const pos = getCoordinates(e, canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (step === 1) {
      drawCrayonStroke(ctx, lastPosRef.current, pos, selectedColor, brushSize);
    } else if (step === 2) {
      drawCrayonStroke(ctx, lastPosRef.current, pos, '#1C1C21', Math.max(brushSize, 36));
    } else if (step === 3) {
      scratchStroke(ctx, lastPosRef.current, pos, scratchSize);
    }

    lastPosRef.current = pos;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDrawing) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setIsDrawing(false);
      lastPosRef.current = null;
    }
  };

  // STEP 1補助: 虹色おまかせ塗り
  const fillRainbowBase = () => {
    const baseCanvas = baseCanvasRef.current;
    if (!baseCanvas) return;
    const ctx = baseCanvas.getContext('2d');
    if (!ctx) return;

    const stripeColors = [
      '#FF595E',
      '#FF924C',
      '#FFCA3A',
      '#8AC926',
      '#2EC4B6',
      '#1982C4',
      '#6A4C93',
      '#FF70A6',
    ];
    const bandWidth = CANVAS_WIDTH / stripeColors.length;

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    stripeColors.forEach((color, idx) => {
      ctx.fillStyle = color;
      ctx.fillRect(idx * bandWidth - 4, 0, bandWidth + 8, CANVAS_HEIGHT);
    });
    ctx.restore();
  };

  // STEP 2補助: いっきに真っ黒に塗りつぶす
  const fillAllBlack = () => {
    const topCanvas = topCanvasRef.current;
    if (!topCanvas) return;
    const ctx = topCanvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#1C1C21';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.restore();
  };

  // 最初からやり直す
  const handleReset = () => {
    initCanvases();
    setStep(1);
  };

  // 画像として保存（2枚のキャンバスを合成してダウンロード）
  const handleDownload = () => {
    const baseCanvas = baseCanvasRef.current;
    const topCanvas = topCanvasRef.current;
    if (!baseCanvas || !topCanvas) return;

    const mergedCanvas = document.createElement('canvas');
    mergedCanvas.width = CANVAS_WIDTH;
    mergedCanvas.height = CANVAS_HEIGHT;
    const mergedCtx = mergedCanvas.getContext('2d');
    if (!mergedCtx) return;

    mergedCtx.drawImage(baseCanvas, 0, 0);
    mergedCtx.drawImage(topCanvas, 0, 0);

    const link = document.createElement('a');
    link.download = 'scratch-art.png';
    link.href = mergedCanvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="app-container">
      {/* ヘッダー＆3ステップ進行バー＆リセットボタン */}
      <header className="app-header">
        <div className="title-area">
          <span className="badge">おえかきスタジオ</span>
          <h1>にじいろ ひっかきえ</h1>
        </div>

        <div className="header-controls">
          <nav className="stepper" aria-label="制作ステップ">
            <button
              type="button"
              className={`step-pill ${step === 1 ? 'active' : ''} ${step > 1 ? 'done' : ''}`}
              onClick={() => setStep(1)}
            >
              <span className="step-num">1</span>
              <span className="step-label">いろをぬる</span>
            </button>
            <span className="step-arrow">▶</span>
            <button
              type="button"
              className={`step-pill ${step === 2 ? 'active' : ''} ${step > 2 ? 'done' : ''}`}
              onClick={() => setStep(2)}
            >
              <span className="step-num">2</span>
              <span className="step-label">くろくぬる</span>
            </button>
            <span className="step-arrow">▶</span>
            <button
              type="button"
              className={`step-pill ${step === 3 ? 'active' : ''}`}
              onClick={() => setStep(3)}
            >
              <span className="step-num">3</span>
              <span className="step-label">けずる</span>
            </button>
          </nav>

          <button
            type="button"
            className="btn btn-reset header-reset-btn"
            onClick={handleReset}
          >
            🔄やりなおし
          </button>
        </div>
      </header>

      {/* メインワークスペース */}
      <main className="workspace">
        {/* 画用紙エリア */}
        <section className="canvas-section">
          <div className="instruction-banner">
            {step === 1 && (
              <p>
                <strong>STEP 1：</strong> 16色のクレヨンで、まっしろな画用紙をカラフルにぬろう！
              </p>
            )}
            {step === 2 && (
              <p>
                <strong>STEP 2：</strong> ぬった色がかくれるまで、上からまっくろにぬりつぶそう！
              </p>
            )}
            {step === 3 && (
              <p>
                <strong>STEP 3：</strong> ひっかきぼうで黒をけずると、下のカラフルな色がうかびあがるよ！
              </p>
            )}
          </div>

          {/* ステップ案内バナー直下のアクションボタンバー（最大3ボタンで常に1段横並び） */}
          <div className="top-action-bar">
            {step === 1 && (
              <>
                <button
                  type="button"
                  className="btn btn-sub"
                  onClick={fillRainbowBase}
                >
                  にじいろにおまかせでぬる
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setStep(2)}
                >
                  つぎへ（くろくぬる） ▶
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setStep(1)}
                >
                  ◀ もどる
                </button>
                <button
                  type="button"
                  className="btn btn-sub"
                  onClick={fillAllBlack}
                >
                  いっきにまっくろにぬる
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setStep(3)}
                >
                  つぎへ（ひっかいてけずる） ▶
                </button>
              </>
            )}

            {step === 3 && (
              <>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setStep(2)}
                >
                  ◀ もどる
                </button>
                <button
                  type="button"
                  className="btn btn-save"
                  onClick={handleDownload}
                >
                  さくひんをほぞんする（PNG）
                </button>
              </>
            )}
          </div>

          <div className={`canvas-frame step-cursor-${step}`}>
            <canvas
              ref={baseCanvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="drawing-canvas base-layer"
            />
            <canvas
              ref={topCanvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="drawing-canvas top-layer"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            />
          </div>
        </section>

        {/* 道具箱パネル */}
        <aside className="tool-panel">
          {step === 1 && (
            <div className="panel-content">
              <h2>16しょく クレヨン</h2>
              <div className="crayon-grid">
                {CRAYON_COLORS.map((crayon) => {
                  const isSelected = selectedColor === crayon.hex;
                  return (
                    <button
                      key={crayon.hex}
                      type="button"
                      className={`crayon-btn ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedColor(crayon.hex)}
                      title={crayon.name}
                      aria-label={crayon.name}
                    >
                      <span
                        className="crayon-tip"
                        style={{ backgroundColor: crayon.hex }}
                      />
                      <span
                        className="crayon-body"
                        style={{ backgroundColor: crayon.hex }}
                      >
                        <span className="crayon-label">{crayon.name}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="slider-box">
                <label htmlFor="crayon-size">
                  クレヨンのふとさ：<strong>{brushSize}px</strong>
                </label>
                <input
                  id="crayon-size"
                  type="range"
                  min={12}
                  max={60}
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="panel-content">
              <h2>くろいクレヨン</h2>
              <div className="black-crayon-showcase">
                <div className="black-crayon-visual">
                  <span className="crayon-tip black" />
                  <span className="crayon-body black">
                    <span className="crayon-label">くろ</span>
                  </span>
                </div>
                <p className="helper-text">
                  すきまがなくなるまで黒くぬりつぶすと、けずったときにきれいになるよ。
                </p>
              </div>

              <div className="slider-box">
                <label htmlFor="black-size">
                  くろクレヨンのふとさ：<strong>{Math.max(brushSize, 36)}px</strong>
                </label>
                <input
                  id="black-size"
                  type="range"
                  min={24}
                  max={80}
                  value={Math.max(brushSize, 36)}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="panel-content">
              <h2>ひっかきぼう</h2>
              <div className="scratch-stick-showcase">
                <div className="scratch-stick-visual" />
                <p className="helper-text">
                  ほそい線のまま細かくけずったり、太さを変えてもようを描いたりしてみよう！
                </p>
              </div>

              <div className="slider-box">
                <label htmlFor="scratch-size">
                  けずるほそさ：<strong>{scratchSize}px</strong>
                </label>
                <input
                  id="scratch-size"
                  type="range"
                  min={2}
                  max={14}
                  step={1}
                  value={scratchSize}
                  onChange={(e) => setScratchSize(Number(e.target.value))}
                />
                <div className="preset-row">
                  <button
                    type="button"
                    className={`chip-btn ${scratchSize === 2 ? 'active' : ''}`}
                    onClick={() => setScratchSize(2)}
                  >
                    ごくぼそ (2px)
                  </button>
                  <button
                    type="button"
                    className={`chip-btn ${scratchSize === 4 ? 'active' : ''}`}
                    onClick={() => setScratchSize(4)}
                  >
                    ほそい (4px)
                  </button>
                  <button
                    type="button"
                    className={`chip-btn ${scratchSize === 9 ? 'active' : ''}`}
                    onClick={() => setScratchSize(9)}
                  >
                    ふつう (9px)
                  </button>
                </div>
              </div>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}

export default App;