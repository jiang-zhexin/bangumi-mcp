# Bangumi MCP

一个运行在 Cloudflare Workers 上的远程 [MCP](https://modelcontextprotocol.io) 服务器，让 Pi、Codex、Claude、Cursor 等 AI 助手能直接访问 [Bangumi 番组计划](https://bgm.tv)。

你可以用自然语言让 AI：

- 查询每日放送、搜索番剧 / 书籍 / 游戏 / 音乐条目
- 查看条目详情、章节、角色、声优与制作人员
- 管理自己的收藏：标记「想看 / 看过 / 在看」、打分、写短评、更新观看进度
- 收藏角色、人物和目录，创建并编辑自己的目录
- 浏览条目、角色、人物、章节的编辑历史

登录使用 Bangumi 官方 OAuth，安全便捷。

## 快速开始

在 MCP 配置文件中添加：

```json
{
  "mcpServers": {
    "bangumi": {
      "url": "https://bgm.zhexin.org/mcp"
    }
  }
}
```

适用于 **Cursor**、**VS Code (GitHub Copilot)**、**Pi** 等原生支持远程 MCP URL 与 OAuth 流程的客户端。

首次启用该 MCP 服务时，客户端会自动打开浏览器并跳转至 Bangumi 官方授权页：

1. 登录你的 Bangumi 账号。
2. 点击 **「授权」** 按钮。
3. 页面提示授权成功后即可返回 AI 客户端开始对话。

## 隐私与权限

- 授权通过 Bangumi 官方 OAuth 完成，服务器只保存 Bangumi 下发的访问令牌，不接触你的账号密码。
- 令牌加密存储在 Cloudflare KV 中，过期后自动刷新。
- 所有写操作（收藏、打分、改进度、编辑目录）都以你的身份执行，与你在 bgm.tv 上手动操作的效果相同。建议在客户端中开启工具调用确认。
- 如需撤销授权，可在 [Bangumi 的应用授权管理页面](https://next.bgm.tv/demo/access-token) 中移除。

## 自行部署（可选）

1. **申请 Bangumi 应用**：前往 [Bangumi 开发者平台](https://bgm.tv/dev/app) 创建一个应用，将回调地址（Redirect URI）设为 `https://<你的域名>/callback`，获取 `App ID` 和 `App Secret`。
2. **部署**：点击下方按钮，按提示将本项目部署到你的 Cloudflare 账号。

   [![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/jiang-zhexin/bangumi-mcp)
