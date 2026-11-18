# データ・画像の出典

取得・確認日：2026年11月18日。

## 天体データ

[NASA / NSSDCA Planetary Fact Sheet – Metric](https://nssdc.gsfc.nasa.gov/planetary/factsheet/)の質量、赤道直径、自転周期、公転周期の概数を採用しています。

地球の恒星公転周期365.256日、自転周期23.9345時間、および冥王星の質量・自転周期は[NASA Pluto Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/plutofact.html)の比較表から採用しています。地球年の計算では、各天体の公転周期（日）を365.256日で割り、地球を厳密に1へ正規化します。数値は出典の概数精度に従います。

### 実軌道の形・向き・傾き

水星～海王星の軌道長半径・離心率・軌道傾斜角・近日点黄経・昇交点黄経は、[NASA/JPL Approximate Positions of the Planets](https://ssd.jpl.nasa.gov/planets/approx_pos.html)のTable 1のJ2000定数を使用しています。地球は表のEM Bary（地球・月重心）で近似しています。採用値は`src/data.ts`の`J2000_ELEMENTS`に記録しています。情報欄の軌道長半径も同じ値です。

冥王星の軌道要素には、Pluto Fact Sheetの「Pluto Mean Orbital Elements (J2000)」にある次の組を使用しています。上段の別時点のOrbital parametersと混在させていません。

- 軌道長半径：39.48168677 AU。
- 離心率：0.24880766。
- 軌道傾斜角：17.14175°。
- 近日点黄経：224.06676°。
- 昇交点黄経：110.30347°。
- 基準時点：J2000。

リアル半径ONでは、軌道面内のケプラー運動を黄道面上へ正射影します。軌道線・天体位置・全体表示の範囲は同じ投影から計算します。初期位置は現在日時の位相を使わず、投影後の向きが右側の0°となる平均近点角から開始します。OFFでも同じ公転の進行率を使いますが、円と楕円の見かけの角度は必ずしも一致しません。

軌道形状はJ2000の定数に固定した近似です。資料の経年変化率、摂動、歳差は適用せず、現在日時の天体位置は再現しません。JPL資料が示す実暦の位置計算の精度を、このシミュレーターの位置精度としては扱いません。

リアル半径OFFは8惑星を等間隔の円へ簡略化し、冥王星のみ長半径9・離心率1/6の横長楕円とします。実軌道要素そのものは変更しません。

自転周期の負符号は逆行自転を意味します。画面には時間の絶対値と「逆行自転」を併記します。惑星の説明文は本アプリ用に要約しています。

## 太陽・8惑星の画像

- 制作者・配布元：[Solar System Scope / INOVE](https://www.solarsystemscope.com/textures/)。NASA等の観測データに基づくテクスチャ。
- ライセンス：[Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/)。
- 加工：元の正距円筒図法のマップを1024×512へ縮小し、正射影で256×256の球面画像へ変換。固定陰影と透明な外周を追加し、WebP形式で保存。太陽は陰影付与を省略。
- 色調：元素材の調整済みの色調を使用。未観測領域には元素材の補完表現を含みます。
- 派生画像の再利用時にも、上記の作者・配布元、ライセンス、加工の明記を保持してください。

原素材URLの共通先頭部分：`https://www.solarsystemscope.com/textures/download/`

| 同梱ファイル | 原素材ファイル |
| --- | --- |
| `public/textures/mercury.webp` | `2k_mercury.jpg` |
| `public/textures/venus.webp` | `2k_venus_atmosphere.jpg` |
| `public/textures/earth.webp` | `2k_earth_daymap.jpg` |
| `public/textures/mars.webp` | `2k_mars.jpg` |
| `public/textures/jupiter.webp` | `2k_jupiter.jpg` |
| `public/textures/saturn.webp` | `2k_saturn.jpg` |
| `public/textures/uranus.webp` | `2k_uranus.jpg` |
| `public/textures/neptune.webp` | `2k_neptune.jpg` |
| `public/textures/sun.webp` | `2k_sun.jpg` |

## 冥王星の画像

- 提供元・クレジット：NASA / Johns Hopkins University Applied Physics Laboratory / Southwest Research Institute（NASA/JHUAPL/SwRI）。New Horizonsによる撮影。
- 掲載ページ：[NASA Pluto Facts](https://science.nasa.gov/dwarf-planets/pluto/facts/)。
- 原画像：[NASA Pluto portrait](https://assets.science.nasa.gov/content/dam/science/psd/solar/bosf/images/1-1-pluto-400x400-1.jpg)。
- 利用条件：[NASA Images and Media Guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/)。NASAのロゴ・推奨表現は使用しません。
- 加工：黒い外余白をトリミング、256×256へ縮小、円形マスク、WebP変換。
- 同梱ファイル：`public/textures/pluto.webp`。

## 輪・UIアイコン

土星・天王星の輪はアプリ内で生成した模式描画です。写真からの切り抜きではありません。UIアイコンは[Lucide](https://lucide.dev/)（ISCライセンス）を使用しています。
