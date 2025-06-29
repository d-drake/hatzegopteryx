#!/bin/bash

# CCDH Bastion Host Management Script

set -e

REGION="us-west-1"
PROJECT_NAME="ccdh"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get bastion instance ID from terraform
get_instance_id() {
    cd "$(dirname "$0")/../terraform"
    terraform output -raw bastion_instance_id 2>/dev/null || echo ""
}

# Check bastion status
check_status() {
    local instance_id=$1
    aws ec2 describe-instances \
        --instance-ids "$instance_id" \
        --query 'Reservations[0].Instances[0].State.Name' \
        --output text \
        --region "$REGION" 2>/dev/null || echo "error"
}

# Main functions
start_bastion() {
    local instance_id=$(get_instance_id)
    if [ -z "$instance_id" ]; then
        echo -e "${RED}Error: No bastion instance found. Run 'terraform apply' first.${NC}"
        exit 1
    fi
    
    echo "Starting bastion host..."
    aws ec2 start-instances --instance-ids "$instance_id" --region "$REGION"
    
    echo "Waiting for instance to be running..."
    aws ec2 wait instance-running --instance-ids "$instance_id" --region "$REGION"
    
    # Get new public IP
    local public_ip=$(aws ec2 describe-instances \
        --instance-ids "$instance_id" \
        --query 'Reservations[0].Instances[0].PublicIpAddress' \
        --output text \
        --region "$REGION")
    
    echo -e "${GREEN}Bastion started successfully!${NC}"
    echo -e "Public IP: ${YELLOW}$public_ip${NC}"
    echo -e "SSH Command: ${YELLOW}ssh -i ~/.ssh/${PROJECT_NAME}-bastion.pem ec2-user@$public_ip${NC}"
}

stop_bastion() {
    local instance_id=$(get_instance_id)
    if [ -z "$instance_id" ]; then
        echo -e "${RED}Error: No bastion instance found.${NC}"
        exit 1
    fi
    
    echo "Stopping bastion host..."
    aws ec2 stop-instances --instance-ids "$instance_id" --region "$REGION"
    
    echo "Waiting for instance to stop..."
    aws ec2 wait instance-stopped --instance-ids "$instance_id" --region "$REGION"
    
    echo -e "${GREEN}Bastion stopped successfully!${NC}"
    echo -e "${YELLOW}You're saving ~\$0.10/day while it's stopped.${NC}"
}

status_bastion() {
    local instance_id=$(get_instance_id)
    if [ -z "$instance_id" ]; then
        echo -e "${RED}Error: No bastion instance found.${NC}"
        exit 1
    fi
    
    local status=$(check_status "$instance_id")
    local public_ip=$(aws ec2 describe-instances \
        --instance-ids "$instance_id" \
        --query 'Reservations[0].Instances[0].PublicIpAddress' \
        --output text \
        --region "$REGION" 2>/dev/null)
    
    echo "Bastion Host Status:"
    echo "  Instance ID: $instance_id"
    echo -n "  Status: "
    
    case $status in
        running)
            echo -e "${GREEN}$status${NC}"
            echo "  Public IP: $public_ip"
            ;;
        stopped)
            echo -e "${YELLOW}$status${NC}"
            ;;
        *)
            echo -e "${RED}$status${NC}"
            ;;
    esac
}

connect_bastion() {
    local instance_id=$(get_instance_id)
    if [ -z "$instance_id" ]; then
        echo -e "${RED}Error: No bastion instance found.${NC}"
        exit 1
    fi
    
    local status=$(check_status "$instance_id")
    if [ "$status" != "running" ]; then
        echo -e "${YELLOW}Bastion is not running. Starting it...${NC}"
        start_bastion
    fi
    
    local public_ip=$(aws ec2 describe-instances \
        --instance-ids "$instance_id" \
        --query 'Reservations[0].Instances[0].PublicIpAddress' \
        --output text \
        --region "$REGION")
    
    echo -e "${GREEN}Connecting to bastion...${NC}"
    ssh -i ~/.ssh/${PROJECT_NAME}-bastion.pem ec2-user@"$public_ip"
}

tunnel_bastion() {
    local instance_id=$(get_instance_id)
    if [ -z "$instance_id" ]; then
        echo -e "${RED}Error: No bastion instance found.${NC}"
        exit 1
    fi
    
    local status=$(check_status "$instance_id")
    if [ "$status" != "running" ]; then
        echo -e "${YELLOW}Bastion is not running. Starting it...${NC}"
        start_bastion
    fi
    
    # Get RDS endpoint from terraform
    cd "$(dirname "$0")/../terraform"
    local rds_endpoint=$(terraform output -raw rds_endpoint 2>/dev/null)
    local public_ip=$(aws ec2 describe-instances \
        --instance-ids "$instance_id" \
        --query 'Reservations[0].Instances[0].PublicIpAddress' \
        --output text \
        --region "$REGION")
    
    echo -e "${GREEN}Creating SSH tunnel to RDS...${NC}"
    echo -e "${YELLOW}In another terminal, connect with: psql -h localhost -p 5432 -U appuser -d appdb${NC}"
    echo -e "${YELLOW}Press Ctrl+C to close the tunnel${NC}"
    
    ssh -i ~/.ssh/${PROJECT_NAME}-bastion.pem -L 5432:"$rds_endpoint":5432 -N ec2-user@"$public_ip"
}

# Usage information
usage() {
    echo "Usage: $0 {start|stop|status|connect|tunnel}"
    echo ""
    echo "Commands:"
    echo "  start    - Start the bastion host"
    echo "  stop     - Stop the bastion host (save money)"
    echo "  status   - Check bastion host status"
    echo "  connect  - SSH to the bastion host"
    echo "  tunnel   - Create SSH tunnel for database access"
    echo ""
    echo "Examples:"
    echo "  $0 start    # Start bastion"
    echo "  $0 tunnel   # Create tunnel for psql access"
    echo "  $0 stop     # Stop bastion when done"
}

# Main script
case "$1" in
    start)
        start_bastion
        ;;
    stop)
        stop_bastion
        ;;
    status)
        status_bastion
        ;;
    connect)
        connect_bastion
        ;;
    tunnel)
        tunnel_bastion
        ;;
    *)
        usage
        exit 1
        ;;
esac