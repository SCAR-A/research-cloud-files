# 文件管理系统需求文档

## 系统概述
一个具有上传和下载功能的文件管理系统，包含：
- 前端 Web 界面
- 后端 REST API 服务
- PostgreSQL 数据库用于存储文件元数据

## 功能需求

### 1. 文件上传
- 用户可以通过 Web 界面上传文件
- 支持多种文件类型
- 单个文件大小限制：100MB
- 显示上传进度
- 生成唯一文件 ID
- 在数据库中存储文件元数据

### 2. 文件下载
- 用户可以通过 Web 界面下载文件
- 提供外部服务可用的直接下载链接
- 跟踪下载次数
- 支持大文件的断点续传

### 3. 文件管理
- 列出已上传文件
- 按名称/类型搜索文件
- 删除文件
- 查看文件元数据（大小、上传日期等）

### 4. API 集成
- 用于外部服务集成的 RESTful API 接口
- API 认证
- 访问频率限制
- API 文档

## 数据库设计

```sql
-- 文件表
CREATE TABLE files (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    original_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    project_type VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    hash_value VARCHAR(64) NOT NULL,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- API密钥表（用于外部服务认证）
CREATE TABLE api_keys (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    key_name VARCHAR(100) NOT NULL,
    api_key VARCHAR(64) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP WITH TIME ZONE
);

-- 文件访问日志表
CREATE TABLE file_access_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    file_id UUID REFERENCES files(id),
    api_key_id UUID REFERENCES api_keys(id),
    access_type VARCHAR(20) NOT NULL, -- 'UPLOAD', 'DOWNLOAD', 'DELETE'
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_files_original_name ON files(original_name);
CREATE INDEX idx_files_created_at ON files(created_at);
CREATE INDEX idx_file_access_logs_file_id ON file_access_logs(file_id);
```

## API 接口设计

### 基础 URL
```
/api/v1
```

### 认证
- 请求头：`X-API-Key: <api_key>`
- 除公共下载链接外，所有接口都需要认证

### 接口列表

#### 文件上传
```
POST /files
Content-Type: multipart/form-data

响应：{
    "id": "uuid",
    "originalName": "string",
    "size": number,
    "mimeType": "string",
    "downloadUrl": "string",
    "createdAt": "datetime"
}
```

#### 文件下载
```
GET /files/{fileId}/download

响应：文件流
响应头：
  Content-Type: application/octet-stream
  Content-Disposition: attachment; filename="original_name"
```

#### 文件列表
```
GET /files
查询参数：
  page: number
  limit: number
  search: string
  sortBy: string
  order: "asc" | "desc"

响应：{
    "total": number,
    "pages": number,
    "currentPage": number,
    "data": [
        {
            "id": "uuid",
            "originalName": "string",
            "size": number,
            "mimeType": "string",
            "downloadUrl": "string",
            "downloadCount": number,
            "createdAt": "datetime"
        }
    ]
}
```

#### 删除文件
```
DELETE /files/{fileId}

响应：{
    "success": true,
    "message": "文件删除成功"
}
```

#### 文件元数据
```
GET /files/{fileId}

响应：{
    "id": "uuid",
    "originalName": "string",
    "size": number,
    "mimeType": "string",
    "downloadUrl": "string",
    "downloadCount": number,
    "createdAt": "datetime",
    "hash": "string"
}
```