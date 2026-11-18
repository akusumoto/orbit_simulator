# Cloudflare Pages セットアップ・デプロイ・アクセス手順

対象：惑星公転シミュレーター（ORBIT）  
確認日：2026年11月19日

このアプリはReact・Viteで生成した静的ファイルをCloudflare Pagesへ配信します。基本の運用は、GitHubへのpushをきっかけに自動でビルド・公開する方式です。Cloudflareの画面名は変更される場合があります。

## 0. URLに`anmemory.workers.dev`が入った場合

`https://orbit-simulator.anmemory.workers.dev/`はWorkersのURL形式です。

| URLの部分 | 意味 |
| --- | --- |
| `orbit-simulator` | 個別のWorker名 |
| `anmemory` | Cloudflareアカウント共通の`workers.dev`サブドメイン |
| `workers.dev` | Workersの標準配信ドメイン |

`anmemory`は以前のアプリの中へ配置されたことを示すものではなく、同じアカウントのWorkerで共有するURLの名前です。Worker名だけを変更しても、この部分は変わりません。[WorkersのURL仕様](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/)

**このアプリだけを`anmemory`を含まないURLにする場合は、本資料の4章の手順でPagesプロジェクトを新規作成する方法を推奨します。** 同じGitHubリポジトリを接続し、`npm run build`・出力先`dist`・Node.js 24を設定します。公開先は`https://利用可能なプロジェクト名.pages.dev`になります。Workersの既存プロジェクト名を変更するだけではPagesへ移行しません。[Pagesの作成手順](https://developers.cloudflare.com/pages/get-started/git-integration/)

Pagesの新しいURLで表示・操作を確認してから、共有先を切り替えます。移行確認中は既存Workerを残しておけます。

Workersを継続する場合は、所有するドメインを**対象Worker → Settings → Domains & Routes → Add → Custom Domain**で追加する方法もあります。アクティブなCloudflareゾーンが必要です。[Workersの独自ドメイン](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)

アカウント共通の名前自体を変える場合は、**Workers & Pages → Your subdomain → Change**で変更できます。この設定は同じアカウントの他のWorkerの標準URLにも関係するため、今回のアプリだけを分ける目的では選びません。[サブドメイン設定](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/#configure-workersdev)

## 1. 全体の流れ

```text
PCで編集・動作確認
  → GitHubへpush
  → Cloudflare Pagesがビルド
  → https://プロジェクト名.pages.dev へ公開
  → PC・スマートフォンのブラウザーでアクセス
```

Git連携でpush時に自動公開される仕組みは、[Cloudflare公式のGit連携手順](https://developers.cloudflare.com/pages/get-started/git-integration/)に基づきます。

| 用意するもの | 用途 |
| --- | --- |
| Cloudflareアカウント | Pagesの作成・管理 |
| GitHubアカウント・リポジトリ | ソース管理と自動デプロイ。非公開リポジトリも利用可能 |
| Node.js 24系・npm | PCでのビルド・動作確認 |
| Git | GitHubへのpush |
| RTK | 本資料のPC用コマンドで使用。未導入の端末では先頭の`rtk`または`rtk proxy`を省いて実行 |

独自ドメインは任意です。まずはPages提供の`pages.dev`のURLで利用できます。サーバーやデータベース、アプリ用のAPIキーは不要です。

## 2. PCで公開前の確認

IDEなどでプロジェクトフォルダー`C:\Users\akusu\Documents\work\orbit_simulator`を開き、そのフォルダーを作業ディレクトリとするPowerShellターミナルで次を実行します。

```powershell
rtk npm ci
rtk npm test
rtk npm run build
rtk npm run preview
```

`preview`が表示したローカルURLをPCで開きます。確認後はターミナルで`Ctrl+C`を押して終了します。

公開に使うのはビルド後の`dist/`です。

```text
dist/
├─ index.html
├─ favicon.svg
├─ _headers
├─ assets/       JavaScript・CSS
└─ textures/     同梱した天体画像10点
```

`npm ci`は`package-lock.json`に固定された依存関係をインストールします。画像は同梱済みのため、公開のたびに`assets:prepare`を実行する必要はありません。ブラウザーテストも行う場合は、WindowsのEdgeを利用できるPCで`rtk npm run test:e2e`を実行します。

## 3. GitHubのセットアップ

### 3.1 リポジトリを作る

1. GitHubへログインし、**New repository**から空のリポジトリを作成します。名前の例は`orbit_simulator`です。
2. Public／Privateはソースを公開するかで選択します。
3. ローカルに既存のGit履歴があるため、GitHub側でREADME・`.gitignore`・LICENSEを新規生成せず、空の状態で作成します。

この作業フォルダーはGit初期化済みです。資料作成時点のブランチは`master`、リモートは未設定でした。作業時点の状態を次で確認します。

```powershell
rtk git status
rtk git branch --show-current
rtk git remote -v
```

### 3.2 GitHubへpushする

`YOUR_ACCOUNT`とリポジトリ名は自分のものに置き換えてください。`origin`が未設定の場合だけ登録します。

```powershell
rtk git remote add origin https://github.com/YOUR_ACCOUNT/orbit_simulator.git
```

変更がある場合は公開対象のファイルを確認してコミットします。変更がなければ`add`・`commit`は不要です。

```powershell
rtk git status --short
rtk git add .
rtk git commit -m "Prepare orbit simulator for deployment"
rtk git push -u origin master
```

すでにリモートが設定されている場合は、そのURLが公開用リポジトリを指しているか確認してからpushします。ブランチを`main`などへ変更済みの場合は、以降の`master`も実際の名前へ読み替えてください。

`node_modules/`、`dist/`、キャッシュ、テスト出力、`.env*`は`.gitignore`で除外しています。`public/textures/`、`package-lock.json`、`.nvmrc`は公開に必要なソースとして含めます。

## 4. Cloudflareのセットアップと初回デプロイ

### 4.1 アカウントとGitHubの接続

1. [Cloudflareダッシュボード](https://dash.cloudflare.com/)でアカウントを作成、またはログインします。
2. 対象アカウントの**Workers & Pages**を開きます。
3. **Create application → Pages → Connect to Git**を選択します。
4. GitHubの認証・連携を進め、対象のリポジトリへのアクセスを許可します。
5. `orbit_simulator`を選び、セットアップへ進みます。

本資料の配信先は**Pages**です。Git連携の画面・リポジトリ選択の詳細は[公式手順](https://developers.cloudflare.com/pages/get-started/git-integration/)を参照してください。

### 4.2 ビルド設定

| 設定項目 | 入力値 |
| --- | --- |
| Project name | `orbit-simulator`など、利用可能な名前 |
| Production branch | `master`（実際の本番用ブランチに合わせる） |
| Framework preset | `React (Vite)`。表示名が異なる場合はVite向けの設定を選ぶか、`None`で以下を手入力 |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | 空欄（リポジトリ直下に`package.json`があるため） |
| Environment variable | `NODE_VERSION` = `24` |

プロジェクト名はGitHubのリポジトリ名と同じでなくても構いません。実際の公開URLはデプロイ完了後に確認します。

ビルドコマンドと出力先の役割は[Build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/)を参照してください。Node.jsは`.nvmrc`でも指定できますが、環境変数を使う場合も同じ24系に揃え、Production・Previewの両環境へ適用します。[Build image](https://developers.cloudflare.com/pages/configuration/build-image/)

Cloudflareのビルド欄には**`npm run build`**と入力します。RTKはPC用のラッパーなので、この欄に`rtk`は付けません。依存関係のインストールはPages側に任せ、ビルド中の素材再生成やブラウザー起動は行いません。

### 4.3 初回デプロイ

1. 設定を確認して**Save and Deploy**を実行します。
2. 依存関係のインストール、TypeScriptの型チェック、Viteのビルド、公開が完了するまでログを確認します。
3. 成功したデプロイのURLと、対応するGitコミットを確認します。
4. プロジェクトの本番URLを控えます。

デプロイ成功後に閲覧用URLが発行されます。[公式の初回デプロイ手順](https://developers.cloudflare.com/pages/get-started/git-integration/#your-first-deploy)

## 5. 更新をデプロイする

### 5.1 本番を更新する

修正後、まずPCでテスト・ビルドします。

```powershell
rtk npm test
rtk npm run build
rtk git diff
rtk git add .
rtk git commit -m "Update orbit simulator"
rtk git push origin master
```

Cloudflareが自動ビルドを開始します。**Workers & Pages → 対象プロジェクト → Deployments**で、成功状態とコミットを確認してください。本番URLはそのままで、内容が更新されます。[Git integration](https://developers.cloudflare.com/pages/get-started/git-integration/)

### 5.2 本番へ出す前にプレビューする

1. 本番ブランチから作業用ブランチを作ります。例：`preview-orbit`。
2. 修正をコミットしてそのブランチをGitHubへpushします。
3. GitHubで本番ブランチ宛てのPull Requestを作成します。
4. Pagesが発行したプレビューURLで確認します。
5. 問題がなければ本番ブランチへマージします。本番デプロイが成功したことも確認します。

```powershell
rtk git switch -c preview-orbit
rtk git add .
rtk git commit -m "Preview orbit changes"
rtk git push -u origin preview-orbit
```

ブランチ・PRのプレビューと本番は別のURLです。プレビュー環境にも`NODE_VERSION=24`を設定します。[Preview deployments](https://developers.cloudflare.com/pages/configuration/preview-deployments/)

## 6. 公開後のアクセス方法

### 6.1 PC・スマートフォンから開く

Cloudflareのプロジェクト画面から本番URLをコピーし、ブラウザーのアドレス欄へ貼り付けます。

```text
https://orbit-simulator.pages.dev
```

上記は例です。実際に発行されたURLを使ってください。スマートフォンでも同じURLを開きます。公開後はPCの開発サーバーを起動しておく必要はなく、同じWi-Fiへ接続する必要もありません。

| URLの種類 | 用途 |
| --- | --- |
| `https://プロジェクト名.pages.dev` | 本番サイト。通常利用・共有用 |
| `https://識別子.プロジェクト名.pages.dev` | デプロイごとの確認用プレビュー |
| `https://ブランチ名.プロジェクト名.pages.dev` | ブランチのプレビュー用エイリアス |
| `http://localhost:…`・`http://127.0.0.1:…` | その端末のローカル確認用。公開URLではない |

プレビューのURL形式・ブランチエイリアスは[公式資料](https://developers.cloudflare.com/pages/configuration/preview-deployments/)を参照してください。標準設定では閲覧者のアプリログインを設けません。ソースリポジトリをPrivateにしても、閲覧サイトの認証設定とは別です。

### 6.2 初回公開時の確認

- PCとスマートフォンの両方でページが開く。
- 太陽・惑星の模様、土星・天王星の輪が表示される。
- スタート・ストップ・リセット・公転速度が動作する。
- リアル半径ONで実軌道の2D投影へ切り替わる。
- 冥王星の表示切り替え、天体選択、背景での選択解除が動作する。
- PCのドラッグ・ホイール、スマホのドラッグ・ピンチが動作する。
- 出典・クレジットを開ける。

### 6.3 独自ドメインを使う場合（任意）

1. **Workers & Pages → 対象プロジェクト → Custom domains → Set up a domain**を開きます。
2. 使用するドメイン、例：`orbit.example.com`を登録します。
3. 案内されたDNS設定を行い、ドメインが有効になってからHTTPSで開きます。

外部DNSで管理するサブドメインは、通常CNAMEで対象の`プロジェクト名.pages.dev`へ向けます。先にPagesのCustom domainsへ登録し、DNSだけを手動追加して終わりにしないでください。`example.com`のようなルートドメインを使う場合はCloudflareのゾーン・ネームサーバー設定が必要です。[Custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/)

## 7. 不具合が出た場合

| 状況 | 確認すること |
| --- | --- |
| GitHubのリポジトリが一覧にない | CloudflareとのGitHub連携で、そのリポジトリを許可したか |
| 本番ブランチを選べない | GitHubへ対象ブランチをpush済みか |
| Node.jsのバージョンで失敗 | `NODE_VERSION=24`と`.nvmrc`を確認。Production・Previewの設定差も確認 |
| 型チェック・ビルドで失敗 | 最初のエラーをログで確認し、PCで`rtk npm ci`・`rtk npm run build`を実行 |
| 公開先が404・画面が空白 | 出力先が`dist`か、その直下に`index.html`があるか |
| 惑星の画像が出ない | `public/textures/`がGitHubに含まれるか。ローカルビルドの`dist/textures/`に10点あるか |
| pushした変更が反映されない | push先ブランチ、Pagesの本番ブランチ、Deploymentsの成否・コミットを確認 |
| PCでは開けるがスマホでは開けない | `localhost`やPCのLANアドレスではなく、本番HTTPS URLを使っているか |
| 更新前の表示が残る | 本番デプロイの成功を確認してから再読み込み。必要ならプライベートウィンドウで比較 |
| 独自ドメインだけ開けない | Pagesへのドメイン登録、DNS、有効化状態を確認。まず`pages.dev`でも比較 |

前の本番へ戻す場合は、**Deployments → All deployments → 戻したい成功済み本番デプロイの「…」→ Rollback to this deployment**を選びます。プレビューはロールバック先にできません。戻した後はGit側も修正し、次のpushで不具合を再公開しないようにします。[Rollbacks](https://developers.cloudflare.com/pages/configuration/rollbacks/)

## 8. GitHubを使わず手動アップロードする場合

Git連携を使わない別の選択肢です。更新の自動化を使う予定なら、先に4章のGit連携で作成してください。Direct Uploadで作ったプロジェクトを後からGit連携へ変更する場合は、新しいプロジェクトの作成が必要です。[Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/)

1. PCで`rtk npm ci`・`rtk npm run build`を実行します。
2. Cloudflareの**Workers & Pages → Create application**から、Pagesのファイルアップロード（**Drag and drop your files**）を選びます。
3. プロジェクト名を入力し、ビルド済みの`dist`フォルダーをアップロードします。
4. アップロード内容のルートに`index.html`があることを確認して公開します。
5. 完了後の本番URLをPC・スマホで開きます。

更新時も新しいビルドを作り、対象プロジェクトの**Create a new deployment**からアップロードします。ソースフォルダー全体や`public/`だけをアップロードしないでください。Git連携で作成した既存プロジェクトではダッシュボードのドラッグ＆ドロップは使えません。[公式のアップロード手順](https://developers.cloudflare.com/pages/get-started/direct-upload/#drag-and-drop)

この方式はPCで作ったビルド結果を配信するため、Cloudflare側のビルド設定や`NODE_VERSION`の指定は使用しません。

## 9. この資料の作成時点の状態

手順書を作成した段階で、Cloudflareアカウントの操作、GitHubへのpush、公開デプロイは実施していません。実際のプロジェクト名・公開URLはセットアップ時に確定します。

アプリの操作は[README.md](../README.md)、検証済みの範囲は[VALIDATION.md](VALIDATION.md)を参照してください。
