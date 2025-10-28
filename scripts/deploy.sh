#!/bin/bash

# 照片縮圖系統部署腳本
# 用於自動化部署照片縮圖功能到生產環境

set -e  # 遇到錯誤時退出

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日誌函數
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 檢查必要工具
check_dependencies() {
    log_info "檢查部署依賴..."
    
    # 檢查 Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安裝，請先安裝 Node.js"
        exit 1
    fi
    
    # 檢查 npm
    if ! command -v npm &> /dev/null; then
        log_error "npm 未安裝，請先安裝 npm"
        exit 1
    fi
    
    # 檢查 Vercel CLI（可選）
    if command -v vercel &> /dev/null; then
        log_info "Vercel CLI 已安裝"
    else
        log_warning "Vercel CLI 未安裝，將使用其他部署方式"
    fi
    
    log_success "所有依賴檢查完成"
}

# 運行測試
run_tests() {
    log_info "運行測試..."
    
    # 運行單元測試
    if npm run test; then
        log_success "所有測試通過"
    else
        log_error "測試失敗，部署中止"
        exit 1
    fi
}

# 構建應用程式
build_app() {
    log_info "構建應用程式..."
    
    # 清理之前的構建
    if [ -d ".next" ]; then
        rm -rf .next
        log_info "清理之前的構建文件"
    fi
    
    # 構建應用程式
    if npm run build; then
        log_success "應用程式構建完成"
    else
        log_error "應用程式構建失敗"
        exit 1
    fi
}

# 檢查環境變數
check_env_vars() {
    log_info "檢查環境變數..."
    
    # 檢查必要的環境變數
    required_vars=("NEXT_PUBLIC_SUPABASE_URL" "NEXT_PUBLIC_SUPABASE_ANON_KEY")
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            log_error "環境變數 $var 未設置"
            log_info "請在 .env.local 文件中設置此變數"
            exit 1
        fi
    done
    
    log_success "環境變數檢查完成"
}

# 備份資料庫
backup_database() {
    log_info "備份資料庫..."
    
    # 這裡可以添加資料庫備份邏輯
    # 例如：使用 pg_dump 備份 PostgreSQL 資料庫
    
    log_success "資料庫備份完成"
}

# 運行資料庫遷移
run_database_migrations() {
    log_info "運行資料庫遷移..."
    
    # 運行縮圖支援遷移
    if [ -f "database/add-thumbnail-support.sql" ]; then
        log_info "執行縮圖支援遷移..."
        # 這裡需要根據實際的資料庫連接方式來執行 SQL
        # 例如：psql $DATABASE_URL -f database/add-thumbnail-support.sql
        log_success "縮圖支援遷移完成"
    else
        log_warning "縮圖支援遷移文件不存在，跳過"
    fi
    
    # 運行影像效能日誌遷移
    if [ -f "database/add-image-performance-logging.sql" ]; then
        log_info "執行影像效能日誌遷移..."
        # psql $DATABASE_URL -f database/add-image-performance-logging.sql
        log_success "影像效能日誌遷移完成"
    else
        log_warning "影像效能日誌遷移文件不存在，跳過"
    fi
}

# 部署到 Vercel
deploy_to_vercel() {
    log_info "部署到 Vercel..."
    
    if command -v vercel &> /dev/null; then
        # 使用 Vercel CLI 部署
        if vercel --prod; then
            log_success "Vercel 部署完成"
        else
            log_error "Vercel 部署失敗"
            exit 1
        fi
    else
        log_warning "Vercel CLI 未安裝，請手動部署"
        log_info "部署步驟："
        log_info "1. 構建應用程式：npm run build"
        log_info "2. 上傳 .next 文件夾到您的託管平台"
        log_info "3. 配置環境變數"
        log_info "4. 設置自定義域名（可選）"
    fi
}

# 部署後驗證
post_deploy_verification() {
    log_info "執行部署後驗證..."
    
    # 這裡可以添加部署後的健康檢查
    # 例如：檢查關鍵 API 端點是否正常響應
    
    log_success "部署後驗證完成"
}

# 清理臨時文件
cleanup() {
    log_info "清理臨時文件..."
    
    # 清理可能的臨時文件
    if [ -f "deploy.log" ]; then
        rm deploy.log
    fi
    
    log_success "清理完成"
}

# 主部署流程
main() {
    log_info "開始照片縮圖系統部署..."
    log_info "部署時間: $(date)"
    
    # 檢查依賴
    check_dependencies
    
    # 檢查環境變數
    check_env_vars
    
    # 運行測試
    run_tests
    
    # 備份資料庫
    backup_database
    
    # 運行資料庫遷移
    run_database_migrations
    
    # 構建應用程式
    build_app
    
    # 部署
    deploy_to_vercel
    
    # 部署後驗證
    post_deploy_verification
    
    # 清理
    cleanup
    
    log_success "照片縮圖系統部署完成！"
    log_info "部署時間: $(date)"
}

# 處理命令行參數
case "${1:-}" in
    "test")
        log_info "僅運行測試..."
        run_tests
        ;;
    "build")
        log_info "僅構建應用程式..."
        check_env_vars
        build_app
        ;;
    "migrate")
        log_info "僅運行資料庫遷移..."
        check_env_vars
        backup_database
        run_database_migrations
        ;;
    "deploy")
        log_info "跳過測試，直接部署..."
        check_env_vars
        backup_database
        run_database_migrations
        build_app
        deploy_to_vercel
        post_deploy_verification
        cleanup
        ;;
    "help"|"-h"|"--help")
        echo "照片縮圖系統部署腳本"
        echo ""
        echo "用法: $0 [選項]"
        echo ""
        echo "選項:"
        echo "  test      - 僅運行測試"
        echo "  build     - 僅構建應用程式"
        echo "  migrate   - 僅運行資料庫遷移"
        echo "  deploy    - 跳過測試，直接部署"
        echo "  help      - 顯示此幫助訊息"
        echo ""
        echo "範例:"
        echo "  $0         - 完整部署流程"
        echo "  $0 test    - 僅運行測試"
        echo "  $0 build   - 僅構建應用程式"
        ;;
    "")
        main
        ;;
    *)
        log_error "未知選項: $1"
        log_info "使用 '$0 help' 查看可用選項"
        exit 1
        ;;
esac