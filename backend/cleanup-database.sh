#!/bin/bash

# Database Cleanup Bash Script
# Quick launcher for database cleanup operations

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLEANUP_SCRIPT="$SCRIPT_DIR/scripts/cleanup-all-dummy-data.js"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

show_help() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║        🧹 DATABASE CLEANUP UTILITY                    ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}Usage:${NC}"
    echo "  ./cleanup-database.sh preview    # Show what will be deleted (safe)"
    echo "  ./cleanup-database.sh execute    # Actually delete dummy data"
    echo "  ./cleanup-database.sh help       # Show this help"
    echo ""
    echo -e "${YELLOW}Examples:${NC}"
    echo "  ./cleanup-database.sh preview    # Preview mode (recommended first)"
    echo "  ./cleanup-database.sh execute    # Execute cleanup"
    echo ""
    echo -e "${YELLOW}Safety:${NC}"
    echo -e "  ${GREEN}✅ Admin users are NEVER deleted${NC}"
    echo -e "  ${GREEN}✅ Preview mode shows exactly what will be deleted${NC}"
    echo -e "  ${GREEN}✅ Backup recommended before execution${NC}"
    echo ""
    echo -e "${YELLOW}What Gets Deleted:${NC}"
    echo -e "  ${RED}❌ Users with test/dummy emails${NC}"
    echo -e "  ${RED}❌ Ads with test/dummy titles${NC}"
    echo -e "  ${RED}❌ Test orders (isTestOrder = true)${NC}"
    echo -e "  ${RED}❌ Dummy categories${NC}"
    echo -e "  ${RED}❌ Related data (favorites, notifications, chats)${NC}"
    echo ""
    echo -e "${YELLOW}What Gets Kept:${NC}"
    echo -e "  ${GREEN}✅ All admin users (role = ADMIN)${NC}"
    echo -e "  ${GREEN}✅ admin@sellit.com${NC}"
    echo -e "  ${GREEN}✅ All production data${NC}"
    echo ""
}

show_banner() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║        🧹 DATABASE CLEANUP UTILITY                    ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

run_preview() {
    show_banner
    echo -e "${YELLOW}🔍 Running in PREVIEW mode (no data will be deleted)${NC}"
    echo ""
    
    node "$CLEANUP_SCRIPT"
    
    echo ""
    echo -e "${GREEN}✅ Preview complete!${NC}"
    echo ""
    echo -e "${YELLOW}To execute cleanup, run:${NC}"
    echo "  ./cleanup-database.sh execute"
    echo ""
}

run_execute() {
    show_banner
    echo -e "${RED}⚠️  WARNING: This will PERMANENTLY delete dummy data!${NC}"
    echo ""
    
    # Confirmation
    read -p "Type 'DELETE' to confirm (or anything else to cancel): " confirm
    
    if [ "$confirm" != "DELETE" ]; then
        echo ""
        echo -e "${YELLOW}❌ Cancelled. No data was deleted.${NC}"
        echo ""
        exit 0
    fi
    
    echo ""
    echo -e "${RED}🔥 Executing cleanup...${NC}"
    echo ""
    
    node "$CLEANUP_SCRIPT" --confirm
    
    echo ""
    echo -e "${GREEN}✅ Cleanup complete!${NC}"
    echo ""
}

# Main logic
case "$1" in
    preview)
        run_preview
        ;;
    execute)
        run_execute
        ;;
    help)
        show_help
        ;;
    *)
        show_help
        echo -e "${CYAN}💡 Tip: Start with preview mode to see what will be deleted${NC}"
        echo "  ./cleanup-database.sh preview"
        echo ""
        ;;
esac
