from fastapi import FastAPI

from app.api.routers.query_router import query_router

# 创建后端应用实例
app = FastAPI()

# 把 query_router.py 中定义的 /api/query 注册到应用上
# 如果没有这一行，/docs 页面里看不到该接口，客户端也访问不到它
app.include_router(query_router)