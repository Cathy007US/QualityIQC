# quality 

**Bilingual IQC Standards Knowledge Base for PV Manufacturing**  
**面向光伏制造的中英文 IQC 检验标准知识库**

[EN](#english) | [中文](#chinese)

<a id="english"></a>
## English

### One-line introduction

**quality ** is a bilingual, controlled knowledge base for photovoltaic incoming inspection standards, helping PV module factories publish, find, maintain, and continuously improve their IQC documents in one place.

### Overview

quality  brings inspection specifications, work instructions, sampling plans, and inspection forms for solar cells, PV glass, encapsulation films, aluminum frames, junction boxes, and ribbon/auxiliary materials into a single, searchable library. It is designed for IQC engineers, quality managers, production teams, suppliers, and auditors who need to confirm the latest approved revision before inspection or supplier communication.

The public site is open for browsing, keyword search, category filtering, online preview, and original-file download. No account is required to read published standards. The admin area is protected by JWT and bcrypt authentication; only authorized quality staff can upload, edit, replace, withdraw, and maintain documents.

Every standard has a controlled lifecycle. Replacing a file creates a new revision while preserving the previous one; withdrawing a document removes it from public view without destroying its history. Uploads, replacements, updates, withdrawals, and category changes are recorded in an audit log. DOCX, XLSX, and PDF files are parsed into structured content, and images embedded in Word or Excel are extracted and restored in the online preview.

The platform is bilingual by design. Chinese and English documents can share the same document number while keeping independent files, revisions, image assets, and download counts. A language switch on a document detail page moves directly to its counterpart, making the same controlled standard accessible to local teams and international customers or auditors.

quality  is intentionally lightweight. It runs on a single 2GB server with PostgreSQL 16, Docker Compose, and Nginx, without Redis, Elasticsearch, a vector database, or a RAG pipeline. This keeps maintenance simple and operating costs low while still providing a reliable, auditable source of truth for day-to-day IQC work.

### Key capabilities

- Six PV material categories: solar cells, PV glass, encapsulation films, aluminum frames, junction boxes, and ribbon/auxiliary materials
- Public search across title, document number, summary, body, tags, supplier, and production line
- Category and document-type filters, with sorting by update time, downloads, or title
- DOCX / XLSX / PDF parsing, structured preview, and embedded-image restoration
- Authenticated upload, metadata editing, file replacement, revision history, withdrawal, and audit logs
- Chinese/English documents with independent files and revisions, linked by the same document number
- Original-file download and download statistics
- Responsive desktop and mobile layout for office, line-side, and supplier use

### Why it matters

quality  turns scattered Word files, spreadsheets, PDFs, and personal folders into one controlled standards library. It reduces the risk of inspecting against an outdated revision, shortens the time needed to find the right requirement, and gives quality teams a clear record of what changed, when, and by whom.

---

<a id="chinese"></a>
## 中文

### 一句话简介

**quality ** 是一个面向光伏来料检验（IQC）的中英文受控标准知识库，帮助光伏组件工厂在一个平台上发布、查找、维护和持续更新 IQC 检验标准。

### 项目简介

quality  将电池片、光伏玻璃、封装胶膜、铝边框、接线盒、焊带与辅材等物料的检验规范、作业指导书、抽样方案和检验表单集中到一个可检索的标准库中。它面向 IQC 工程师、质量管理人员、生产团队、供应商和审核人员，帮助大家在检验或供应商沟通前快速确认最新受控版本。

前台面向公开访问，支持关键词检索、分类筛选、在线预览和原文件下载，阅读已发布标准不需要登录。后台采用 JWT + bcrypt 鉴权，只有授权的质量人员才能上传、编辑、替换、下架和维护文档。

每份标准都有完整的受控生命周期。替换文件会生成新版本，同时保留历史版本；下架文档会从前台移除，但不会销毁历史记录。上传、替换、更新、下架和分类变更都会写入审计日志。系统支持 DOCX、XLSX、PDF 解析，Word / Excel 中的内嵌图片也会被抽取并在在线预览中还原。

平台原生支持中英文双语。同一标准编号可以同时拥有中文和英文两份受控文档，各自拥有独立文件、修订记录、图片资产和下载统计。详情页的语言切换可以直接跳转到对应版本，方便国内质量团队与海外客户、审核人员使用同一套标准。

quality  采用轻量设计，单台 2GB 内存服务器即可运行，使用 PostgreSQL 16、Docker Compose 和 Nginx，不依赖 Redis、Elasticsearch、向量数据库或 RAG 流程。它在保持运维简单、成本可控的同时，为日常 IQC 工作提供可靠、可追溯的标准来源。

### 核心功能

- 六大光伏物料分类：电池片、光伏玻璃、封装胶膜、铝边框、接线盒、焊带辅材
- 标题、编号、摘要、正文、标签、供应商、产线全文检索
- 分类和文档类型筛选，支持按更新时间、下载量、标题排序
- DOCX / XLSX / PDF 解析、结构化预览和内嵌图片还原
- 登录后上传、编辑元数据、替换文件、查看版本历史、下架和审计追溯
- 中英文文档独立文件、独立修订，通过同一标准编号关联
- 原文件下载与下载次数统计
- 适配桌面和手机，方便办公室、产线和供应商现场使用

### 价值

quality  把分散在 Word、Excel、PDF 和个人文件夹中的标准集中为一个受控标准库，降低误用旧版本的风险，缩短查找要求的时间，并让质量团队清楚知道标准在什么时候、由谁、做了哪些变更。
