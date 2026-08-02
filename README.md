# Portfolio-All

このプロジェクトは、大学の学生ポートフォリオ管理システム で、Kintone DB と統合されています。
本システムは、ポートフォリオの提出、承認、閲覧を効率化し、リクルーターに信頼性のあるデータを提供 します。

## 📌 プロジェクト概要

本システムは、学生がポートフォリオを作成・提出 し、大学スタッフが確認・承認、そして リクルーターが閲覧 できる仕組みになっています。

### 🔹 主な機能

学生ポートフォリオ管理 – 学生がポートフォリオを作成・提出・更新可能
承認ワークフロー – スタッフと管理者がポートフォリオを審査・承認
リクルーターアクセス – 承認済みのポートフォリオを閲覧し、スコアや資格情報を確認可能
信頼性のあるデータ – スコアや資格情報は大学スタッフのみが入力可能（データの信頼性を保証）
Kintone DBとの統合 – 学生データの管理と検索がスムーズ
ユーザーロールによる制御 – 管理者・スタッフ・学生・リクルーター によるアクセス権限の管理

### 🏗 システムアーキテクチャ

システムは ロールベースのワークフロー に基づいています：

- 1️⃣ 学生 がポートフォリオを作成・提出
- 2️⃣ スタッフ がポートフォリオをレビューし、承認済みに設定
- 3️⃣ 管理者 が最終確認し、ポートフォリオをリクルーターに公開
- 4️⃣ リクルーター がポートフォリオを閲覧し、スコアや資格情報を確認

## ライブデモ

[Portfolio-All ライブ](https://portfolio.jdu.uz)

## 技術スタック

- **クライアント:** JavaScript, React, CSS, HTML
- **サーバー:** Node.js, Express

## セットアップ

### 前提条件

- Node.js
- Git

### インストール

1. リポジトリをクローンします：
   ```bash
   git clone https://github.com/jdu9B0007/portfolio-all.git
   ```
2. プロジェクトディレクトリに移動します：
   ```bash
   cd portfolio-all
   ```
3. クライアントの依存関係をインストールします：
   ```bash
   cd portfolio-client
   npm install
   ```
4. サーバーの依存関係をインストールします：
   ```bash
   cd ../portfolio-server
   npm install
   ```

### アプリの実行

5. クライアントを実行するには：
   ```bash
   cd portfolio-client
   npm start
   ```
6. サーバーを実行するには：
   ```bash
   cd ../portfolio-server
   npm start
   ```

## 🔍 貢献 (Contributing)

プロジェクトへの貢献を歓迎します！
以下の方法でご協力いただけます：

- Issueの報告 🛠
- ForkしてPull Requestを作成 ✅
- 新機能の提案 🚀

詳細なガイドラインについては、[CONTRIBUTING.md](CONTRIBUTING.md)を参照してください。

### デプロイ

このプロジェクトは[こちら](https://portfolio.jdu.uz)にデプロイされています。ローカルまたは別のサービスにデプロイするには、各プラットフォームのドキュメントを参照してください。

### ライセンス

このプロジェクトはGNU一般公衆ライセンスバージョン3の下で提供されています。詳細については、[LICENSE](LICENSE)ファイルを参照してください。

## CI/CD (GitHub Actions)

- main ブランチへ push すると自動デプロイが走ります（フロント/バックエンドは変更有無で判定）。
- セットアップ（リポジトリ Secrets 推奨）
  - `EC2_SSH_KEY`: EC2 への SSH 秘密鍵（.pem の中身）
  - `EC2_HOST`: 例 `ec2-13-231-145-159.ap-northeast-1.compute.amazonaws.com`
  - 任意（未設定時は既定値使用）:
    - `EC2_USER` (既定: `ec2-user`)
    - `FRONTEND_EC2_PATH` (既定: `/home/ec2-user/jduportfolio/portfolio-client`)
    - `PM2_FRONTEND_SERVICE` (既定: `portfolio-client`)
    - `BACKEND_REPO_PATH` (既定: `/home/ec2-user/jduportfolio`)
    - `PM2_BACKEND_SERVICE` (既定: `portfolio-server`)
    - `VITE_API_URL`, `VITE_APP_API_BASE_URL`, `FRONTEND_URL`（必要に応じて）
- フロントは `portfolio-client/deploy.sh` をそのまま呼び出します。
- バックエンドは EC2 に SSH 接続し、`main` を pull → `pm2` で再起動します。

EC2 の状態を確認するには（ローカルから）:

```
ssh -i "/path-to-the/file.pem" ec2-user@ec2-13-231-145-159.ap-northeast-1.compute.amazonaws.com
```
