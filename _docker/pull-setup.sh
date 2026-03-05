#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

ENV_FILE=".env"
COMPOSE_FILE="docker-compose.yml"
IMAGE="ghcr.io/chatgptuk/ldc-shop:latest"

echo ""
echo -e "${CYAN}${BOLD}╔══════════════════════════════════════╗${NC}"
echo -e "${CYAN}${BOLD}║   LDC Shop Docker 一键部署（拉取）   ║${NC}"
echo -e "${CYAN}${BOLD}╚══════════════════════════════════════╝${NC}"
echo ""

# Helper: prompt with default value
prompt() {
    local var_name="$1"
    local prompt_text="$2"
    local default_val="$3"
    local is_secret="$4"

    if [ -n "$default_val" ]; then
        prompt_text="${prompt_text} [${default_val}]"
    fi

    if [ "$is_secret" = "true" ]; then
        echo -en "${BOLD}${prompt_text}: ${NC}"
        value=""
        while IFS= read -rs -n1 char; do
            if [[ -z "$char" ]]; then
                break
            elif [[ "$char" == $'\x7f' || "$char" == $'\b' ]]; then
                if [ -n "$value" ]; then
                    value="${value%?}"
                    echo -en "\b \b"
                fi
            else
                value+="$char"
                echo -en "*"
            fi
        done
        echo ""
    else
        echo -en "${BOLD}${prompt_text}: ${NC}"
        read -r value
    fi

    if [ -z "$value" ]; then
        value="$default_val"
    fi

    eval "$var_name='$value'"
}

# Helper: prompt yes/no
prompt_yn() {
    local var_name="$1"
    local prompt_text="$2"
    local default_val="$3"

    echo -en "${BOLD}${prompt_text} (y/n) [${default_val}]: ${NC}"
    read -r value

    if [ -z "$value" ]; then
        value="$default_val"
    fi

    case "$value" in
        [Yy]*) eval "$var_name=true" ;;
        *) eval "$var_name=false" ;;
    esac
}

# Generate random secret
generate_secret() {
    if command -v openssl &> /dev/null; then
        openssl rand -base64 32
    else
        head -c 32 /dev/urandom | base64
    fi
}

echo -e "${GREEN}━━━ 基础配置（必填）━━━${NC}"
echo ""

prompt APP_URL "站点 URL（含 https://）" "http://localhost:3000"
prompt PORT "映射端口" "3000"

echo ""
echo -e "${GREEN}━━━ Linux DO Connect OAuth（必填）━━━${NC}"
echo -e "${YELLOW}在 https://connect.linux.do 创建应用获取${NC}"
echo ""

prompt OAUTH_CLIENT_ID "Client ID" ""
while [ -z "$OAUTH_CLIENT_ID" ]; do
    echo -e "${RED}Client ID 不能为空${NC}"
    prompt OAUTH_CLIENT_ID "Client ID" ""
done

prompt OAUTH_CLIENT_SECRET "Client Secret" "" true
while [ -z "$OAUTH_CLIENT_SECRET" ]; do
    echo -e "${RED}Client Secret 不能为空${NC}"
    prompt OAUTH_CLIENT_SECRET "Client Secret" "" true
done

echo ""
echo -e "${GREEN}━━━ EPay 支付配置（必填）━━━${NC}"
echo ""

prompt MERCHANT_ID "商户 ID" ""
while [ -z "$MERCHANT_ID" ]; do
    echo -e "${RED}商户 ID 不能为空${NC}"
    prompt MERCHANT_ID "商户 ID" ""
done

prompt MERCHANT_KEY "商户密钥" "" true
while [ -z "$MERCHANT_KEY" ]; do
    echo -e "${RED}商户密钥不能为空${NC}"
    prompt MERCHANT_KEY "商户密钥" "" true
done

echo ""
echo -e "${GREEN}━━━ 管理员配置 ━━━${NC}"
echo ""

prompt ADMIN_USERS "管理员用户名（多个用逗号分隔）" "admin"

PAY_URL="https://credit.linux.do/epay/pay/submit.php"

echo ""
echo -e "${GREEN}━━━ GitHub OAuth（可选，回车跳过）━━━${NC}"
echo -e "${YELLOW}在 https://github.com/settings/developers 创建 OAuth App${NC}"
echo ""

prompt GITHUB_ID "GitHub Client ID" ""
prompt GITHUB_SECRET "GitHub Client Secret" "" true

# Generate AUTH_SECRET
AUTH_SECRET=$(generate_secret)

echo ""
echo -e "${CYAN}━━━ 生成配置文件 ━━━${NC}"
echo ""

# Write .env file
cat > "$ENV_FILE" <<EOF
# === LDC Shop Docker 配置 ===
# 由 pull-setup.sh 自动生成于 $(date)

# 站点（外部访问地址，服务端运行时使用）
APP_URL=${APP_URL}
NEXT_PUBLIC_APP_URL=${APP_URL}
# NextAuth: AUTH_URL 由 entrypoint.sh 自动从 APP_URL 派生，无需手动设置
AUTH_TRUST_HOST=true
AUTH_SECRET=${AUTH_SECRET}

# Linux DO Connect OAuth
OAUTH_CLIENT_ID=${OAUTH_CLIENT_ID}
OAUTH_CLIENT_SECRET=${OAUTH_CLIENT_SECRET}

# EPay 支付
MERCHANT_ID=${MERCHANT_ID}
MERCHANT_KEY=${MERCHANT_KEY}
PAY_URL=${PAY_URL}

# 管理员
ADMIN_USERS=${ADMIN_USERS}

# SQLite 数据库
DATABASE_PATH=/app/data/ldc-shop.sqlite

# GitHub OAuth 登录（可选）
GITHUB_ID=${GITHUB_ID}
GITHUB_SECRET=${GITHUB_SECRET}

# Telegram / Bark / 邮件通知：登录后在管理后台配置，无需在此设置
EOF

echo -e "${GREEN}✓${NC} .env 文件已生成"

# Write docker-compose.yml
cat > "$COMPOSE_FILE" <<EOF
services:
  app:
    container_name: ldc-shop
    image: ${IMAGE}
    restart: always
    ports:
      - "${PORT}:3000"
    volumes:
      - ./data:/app/data
    env_file:
      - .env
EOF

echo -e "${GREEN}✓${NC} docker-compose.yml 已生成"

# Create data directory with open permissions for container
mkdir -p data && chmod 777 data
echo -e "${GREEN}✓${NC} data 目录已创建"

echo ""
echo -e "${CYAN}━━━ 配置摘要 ━━━${NC}"
echo ""
echo -e "  镜像:            ${BOLD}${IMAGE}${NC}"
echo -e "  站点地址:        ${BOLD}${APP_URL}${NC}"
echo -e "  映射端口:        ${BOLD}${PORT}${NC}"
echo -e "  管理员:          ${BOLD}${ADMIN_USERS}${NC}"
if [ -n "$GITHUB_ID" ]; then
echo -e "  GitHub 登录:     ${GREEN}已配置${NC}"
else
echo -e "  GitHub 登录:     ${YELLOW}未配置（可后续编辑 .env 添加）${NC}"
fi
echo ""
echo -e "  ${YELLOW}Telegram/Bark/邮件通知: 启动后在管理后台配置${NC}"
echo ""

prompt_yn DO_START "是否立即拉取镜像并启动？" "y"

if [ "$DO_START" = "true" ]; then
    echo ""
    echo -e "${CYAN}正在拉取镜像并启动容器...${NC}"
    echo ""
    docker compose pull
    docker compose up -d
    echo ""
    echo -e "${GREEN}${BOLD}✓ LDC Shop 已启动！${NC}"
    echo -e "  访问地址: ${BOLD}${APP_URL}${NC}"
    echo ""
else
    echo ""
    echo -e "${YELLOW}稍后可手动启动:${NC}"
    echo ""
    echo "  docker compose pull && docker compose up -d"
    echo ""
fi

echo -e "${CYAN}常用命令:${NC}"
echo "  查看日志:   docker compose logs -f"
echo "  停止服务:   docker compose down"
echo "  重启服务:   docker compose down && docker compose up -d"
echo "  更新镜像:   docker compose pull && docker compose up -d"
echo ""
