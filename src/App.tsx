import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ChevronDown, CircleHelp, Crosshair, ExternalLink, Focus, Info, Maximize, Minus, MousePointer2, Orbit, Pause, Play, Plus, RotateCcw, X } from 'lucide-react';
import { FACTS, ORBIT_SOURCE, PLUTO_FACTS, TEXTURES, number, periodYears, planets, texturePath } from './data';
import type { Planet } from './data';
import { OrbitScene } from './scene';

function PlanetPortrait({ planet }: { planet: Planet }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [planet.id]);
  return <div className={`portrait ${planet.ring ? `portrait-${planet.ring}` : ''}`} style={{ '--planet-color': planet.color } as React.CSSProperties}>
    {failed ? <div className="portrait-fallback" /> : <img src={texturePath(planet.id)} alt={`${planet.name}の模様`} onError={() => setFailed(true)} />}
  </div>;
}

function PlanetInfo({ planet }: { planet: Planet }) {
  const [coefficient, exponent] = planet.mass.toExponential(2).split('e');
  return <div className="planet-details" key={planet.id}>
    <div className="planet-intro">
      <PlanetPortrait planet={planet} />
      <div><span className="eyebrow">{planet.english.toUpperCase()}</span><h3>{planet.name}</h3><span className="classification">{planet.id === 'pluto' ? '準惑星' : '惑星'}</span></div>
    </div>
    <p className="description">{planet.description}</p>
    <dl className="facts">
      <div><dt>直径 <small>赤道直径</small></dt><dd>{number(planet.diameter, 0)} <small>km</small></dd></div>
      <div><dt>質量</dt><dd>{coefficient} × 10<sup>{Number(exponent)}</sup> <small>kg</small></dd></div>
      <div><dt>自転時間 <small>恒星周期</small></dt><dd>{number(Math.abs(planet.rotationHours), 2)} <small>時間</small>{planet.rotationHours < 0 && <span className="retrograde">逆行自転</span>}</dd></div>
      <div><dt>公転周期</dt><dd>{number(periodYears(planet), 3)} <small>地球年</small><span className="secondary-value">{number(planet.periodDays, 3)} 地球日</span></dd></div>
      <div><dt>軌道長半径</dt><dd>{number(planet.axisAU, 3)} <small>AU</small></dd></div>
    </dl>
    <p className="source-line">数値：<a href={planet.id === 'pluto' ? PLUTO_FACTS : FACTS} target="_blank" rel="noreferrer">NASA Fact Sheet <ArrowUpRight size={12} /></a></p>
    <p className="source-line">軌道要素：<a href={planet.id === 'pluto' ? PLUTO_FACTS : ORBIT_SOURCE} target="_blank" rel="noreferrer">NASA{planet.id === 'pluto' ? '' : '/JPL'} · J2000 <ArrowUpRight size={12} /></a></p>
    <p className="source-line">画像：{planet.id === 'pluto' ? 'NASA / JHUAPL / SwRI' : <a href={TEXTURES} target="_blank" rel="noreferrer">Solar System Scope · CC BY 4.0 <ArrowUpRight size={12} /></a>}</p>
  </div>;
}

export default function App() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<OrbitScene | null>(null);
  const yearElement = useRef<HTMLSpanElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(10);
  const [speedInput, setSpeedInput] = useState('10');
  const [real, setReal] = useState(false);
  const [pluto, setPluto] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const [failures, setFailures] = useState<string[]>([]);
  const [sceneError, setSceneError] = useState('');
  const [credits, setCredits] = useState(false);
  const current = planets.find(p => p.id === selected);
  const visible = planets.filter(p => pluto || p.id !== 'pluto');
  const invalidSpeed = speedInput.trim() === '' || !Number.isInteger(Number(speedInput)) || Number(speedInput) < 1 || Number(speedInput) > 100;

  useEffect(() => {
    if (!canvas.current) return;
    try {
      const instance = new OrbitScene(canvas.current, {
        onSelect: setSelected,
        onTime: years => { if (yearElement.current) yearElement.current.textContent = years.toLocaleString('ja-JP', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); },
        onView: setZoom,
        onAssets: (busy, failed) => { setLoading(busy); setFailures(failed); },
      });
      scene.current = instance;
      return () => { instance.destroy(); scene.current = null; };
    } catch (error) { setSceneError(error instanceof Error ? error.message : '描画を開始できませんでした。'); }
  }, []);

  useEffect(() => { scene.current?.configure(real, pluto, selected); }, [real, pluto, selected]);
  useEffect(() => {
    if (credits && !dialog.current?.open) dialog.current?.showModal();
    if (!credits && dialog.current?.open) dialog.current.close();
  }, [credits]);

  function changeSpeed(value: string) {
    setSpeedInput(value);
    const n = Number(value);
    if (value.trim() && Number.isInteger(n) && n >= 1 && n <= 100) {
      scene.current?.setSpeed(n); setSeconds(n);
    }
  }
  function toggleRunning() { scene.current?.setRunning(!running); setRunning(!running); }
  function reset() { scene.current?.reset(); setRunning(false); setSelected(null); }

  return <div className="app-shell">
    <header className="app-header">
      <a className="brand" href="#" onClick={event => event.preventDefault()} aria-label="ORBIT 惑星公転シミュレーター">
        <span className="brand-mark"><Orbit size={25} strokeWidth={1.4} /></span><span>ORBIT<span className="brand-dot">.</span></span>
      </a>
      <div className="header-divider" />
      <h1>惑星公転シミュレーター</h1>
      <span className="header-caption"><span /> SOLAR SYSTEM EXPLORER</span>
    </header>

    <main className="workspace">
      <aside className="sidebar" aria-label="設定・情報パネル">
        <section className="control-section">
          <div className="section-heading"><h2>シミュレーション</h2><span>01 / CONTROL</span></div>
          <div className="time-card"><span className="eyebrow">ELAPSED TIME</span><div className="elapsed"><span ref={yearElement} data-testid="years">0.00</span><span className="year-unit">年</span></div><span className="time-note">経過年数 <span>地球年基準</span></span></div>
          <div className="playback-controls">
            <button className={`primary-button ${running ? 'is-running' : ''}`} onClick={toggleRunning} aria-pressed={running} disabled={!!sceneError}>{running ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}{running ? 'ストップ' : 'スタート'}</button>
            <button className="reset-button" onClick={reset}><RotateCcw size={16} />リセット</button>
          </div>
          <div className="speed-setting">
            <div className="setting-row"><label htmlFor="speed">公転速度</label><div className={`number-input ${invalidSpeed ? 'invalid' : ''}`}><input id="speed" type="number" min="1" max="100" step="1" value={speedInput} onChange={e => changeSpeed(e.target.value)} aria-invalid={invalidSpeed} aria-describedby="speed-help speed-error" /><span>秒 / 年</span></div></div>
            <p className="setting-description" id="speed-help">地球の1年にかかる秒数</p>
            <input className="speed-slider" type="range" aria-label="公転速度スライダー" min="1" max="100" step="1" value={seconds} onChange={e => changeSpeed(e.target.value)} style={{ '--progress': `${(seconds - 1) / 99 * 100}%` } as React.CSSProperties} />
            <div className="range-labels"><span>1秒 <span>速い</span></span><span><span>遅い</span> 100秒</span></div>
            <p className={invalidSpeed ? 'input-error' : 'sr-only'} id="speed-error" role={invalidSpeed ? 'alert' : undefined}>{invalidSpeed ? '1～100の整数を入力してください。最後の有効値で動作しています。' : '数値が小さいほど速く進みます。'}</p>
          </div>
        </section>

        <section className="control-section display-section">
          <div className="section-heading"><h2>表示設定</h2><span>02 / VIEW</span></div>
          <label className="toggle-row"><span><strong>リアル半径</strong><small>実際の軌道形状・距離比で表示</small></span><input type="checkbox" checked={real} onChange={e => setReal(e.target.checked)} /><span className="toggle" aria-hidden="true" /></label>
          <label className="toggle-row"><span><strong>冥王星</strong><small>準惑星と楕円軌道を表示</small></span><input type="checkbox" checked={pluto} onChange={e => { setPluto(e.target.checked); if (!e.target.checked && selected === 'pluto') setSelected(null); }} /><span className="toggle" aria-hidden="true" /></label>
          <div className="scale-note"><Info size={14} /><p>{real ? '軌道の形・傾き・向きを反映した2D投影です。内側の惑星は拡大してご覧ください。' : '軌道を等間隔に配置しています。公転周期は実際の比率に基づきます。'}</p></div>
        </section>

        <section className="control-section information-section">
          <div className="section-heading"><h2>惑星情報</h2><span>03 / DISCOVER</span></div>
          <div className="select-wrap"><select aria-label="情報を表示する天体" value={selected ?? ''} onChange={e => setSelected(e.target.value || null)}><option value="">惑星を選択</option>{visible.map(p => <option key={p.id} value={p.id}>{p.name} / {p.english}</option>)}</select><ChevronDown size={14} /></div>
          {current ? <PlanetInfo planet={current} /> : <div className="empty-info"><span className="empty-info-icon"><MousePointer2 size={24} strokeWidth={1.3} /></span><h3>気になる惑星を選んでみよう</h3><p>惑星をクリック／タップすると<br />情報を表示します</p><span className="empty-hint">背景のクリック／タップで選択解除</span></div>}
        </section>
        <footer className="sidebar-footer"><span>太陽系を、あなたのペースで。</span><button onClick={() => setCredits(true)}><ExternalLink size={12} />出典・クレジット</button></footer>
      </aside>

      <section className="simulation-panel" aria-label="シミュレーションパネル">
        <div className="scene-heading"><div className="scene-title"><span className="eyebrow">OUR SOLAR SYSTEM</span><h2>太陽系<span>2D</span></h2></div><div className={`play-state ${running ? 'active' : ''}`}><span />{running ? '公転中' : '停止中'}</div></div>
        <canvas ref={canvas} className="orbit-canvas" tabIndex={0} role="img" aria-label="太陽系の2D公転シミュレーション。ドラッグで移動、ホイール・ピンチで拡大縮小。惑星または名前をクリック・タップして選択、背景で解除。キーボードでは矢印で移動、プラス・マイナスでズーム、Homeで全体表示。天体は左パネルの選択欄からも選べます。" />
        {(loading || failures.length > 0 || sceneError) && <div className="asset-status" role="status">{sceneError || (loading ? '天体の模様を読み込んでいます…' : <><span>画像を読み込めませんでした：{failures.map(id => planets.find(p => p.id === id)?.name ?? '太陽').join('、')}</span><button onClick={() => void scene.current?.loadAssets()}>再読み込み</button></>)}</div>}
        <div className="scene-bottom">
          <div className="scene-legend" aria-label="表示中の惑星">{visible.map(p => <button key={p.id} className={selected === p.id ? 'selected' : ''} onClick={() => setSelected(p.id)} aria-pressed={selected === p.id}><span style={{ background: p.color }} />{p.name}</button>)}</div>
          <div className="canvas-toolbar"><span className="zoom-value" aria-label="ズーム倍率">{zoom.toFixed(1)}<small>×</small></span><button onClick={() => scene.current?.zoomBy(0.8)} aria-label="縮小" disabled={zoom <= 0.5}><Minus size={17} /></button><button onClick={() => scene.current?.zoomBy(1.25)} aria-label="拡大" disabled={zoom >= 100}><Plus size={17} /></button><span className="toolbar-divider" /><button className="fit-button" aria-label="全体表示" onClick={() => scene.current?.fit()}><Maximize size={16} /><span>全体表示</span></button></div>
        </div>
        <div className="scene-footnote"><span><Crosshair size={12} />固定視点 · 反時計回り</span><span>惑星の大きさは視認性を優先した縮尺です</span></div>
      </section>
    </main>

    <dialog ref={dialog} className="credits-dialog" onClose={() => setCredits(false)} onClick={e => { if (e.target === e.currentTarget) setCredits(false); }}>
      <div className="credits-content"><button className="dialog-close" aria-label="閉じる" onClick={() => setCredits(false)}><X size={20} /></button><span className="eyebrow">ABOUT THIS EXPLORER</span><h2>出典・クレジット</h2>
        <h3><Orbit size={17} />天体データ</h3><p><a href={FACTS} target="_blank" rel="noreferrer">NASA Planetary Fact Sheet</a>（2026年11月18日取得）の概数を使用。地球の恒星公転周期は365.256日へ正規化しています。</p><p>リアル半径ONの8惑星は<a href={ORBIT_SOURCE} target="_blank" rel="noreferrer">NASA/JPLの軌道要素（Table 1、J2000）</a>の長半径・離心率・軌道傾斜角・近日点黄経・昇交点黄経を使用。地球は地球・月重心の軌道で近似しています。地球の恒星周期・自転時間、冥王星の質量・自転時間・J2000軌道要素は<a href={PLUTO_FACTS} target="_blank" rel="noreferrer">Pluto Fact Sheet</a>によります。</p>
        <h3><Focus size={17} />天体の模様</h3><p>太陽・8惑星：<a href={TEXTURES} target="_blank" rel="noreferrer">Solar System Scope / INOVE</a>、<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>。NASA等の観測データに基づくテクスチャを、球面投影・陰影付与・サイズ変更・WebP変換して使用しています。色調は元素材の表現に基づきます。</p><p>冥王星：NASA / Johns Hopkins University Applied Physics Laboratory / Southwest Research Institute（New Horizons）。<a href="https://science.nasa.gov/dwarf-planets/pluto/facts/" target="_blank" rel="noreferrer">NASA Pluto Facts</a>の画像を縮小・WebP変換。輪は外観を参考にした模式描画です。</p>
        <h3><CircleHelp size={17} />このシミュレーションについて</h3><p>リアル半径ONではJ2000の楕円軌道を黄道面へ真上から投影し、近日点で速く、遠日点で遅く進みます。軌道要素を固定した近似で、摂動や歳差・現在日時の天体位置は再現しません。初期位置は全て画面右の0°です。画面上の軌道の交差は、実際の空間での衝突を意味しません。自転のアニメーションは行いません。</p><p>1 AUは149,597,870.7 km。リアル半径OFFでは8惑星を等間隔の円に置き、冥王星のみ長半径9・離心率1/6の横長の楕円を使用します。天王星の軌道より常に外側を通り、海王星の軌道とは交差します。</p>
        <button className="credits-done" onClick={() => setCredits(false)}>シミュレーションに戻る <ArrowUpRight size={15} /></button>
      </div>
    </dialog>
  </div>;
}
