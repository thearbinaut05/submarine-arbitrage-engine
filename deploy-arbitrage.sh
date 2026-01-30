#!/bin/bash

# FlashArb Complete Deployment & Execution Script
# This script automates the entire deployment and execution process
#
# Usage:
#   chmod +x deploy-arbitrage.sh
#   ./deploy-arbitrage.sh           # Deploy to Sepolia testnet
#   ./deploy-arbitrage.sh mainnet   # Deploy to Ethereum mainnet

set -e

NETWORK=${1:-sepolia}
echo "🚀 Starting FlashArb deployment to $NETWORK"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

echo_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

echo_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

echo_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if .env exists
if [ ! -f ".env" ]; then
    echo_warning ".env file not found. Creating from template..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo_info "Created .env file. Please edit it with your values:"
        echo "  - DEPLOYER_PRIVATE_KEY"
        echo "  - RPC URL for $NETWORK"
        echo "  - ETHERSCAN_API_KEY"
        exit 1
    else
        echo_error ".env.example not found!"
        exit 1
    fi
fi

# Check if contracts directory exists
if [ ! -d "contracts" ]; then
    echo_error "contracts directory not found!"
    exit 1
fi

cd contracts

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo_info "Installing dependencies..."
    npm install
fi

# Compile contracts
echo_info "Compiling contracts..."
npx hardhat compile

# Deploy contracts
if [ "$NETWORK" = "mainnet" ]; then
    echo_warning "⚠️  Deploying to MAINNET! This will use real ETH!"
    echo_warning "Please ensure you have reviewed all security considerations."
    read -p "Continue? (yes/no): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        echo_error "Deployment cancelled."
        exit 1
    fi
fi

echo_info "Deploying contracts to $NETWORK..."
npx hardhat run scripts/deploy-and-execute.ts --network $NETWORK

# Check if deployment was successful
if [ $? -eq 0 ]; then
    echo_success "Deployment and execution completed successfully!"
    
    # Show deployment info
    if [ -f "deployments/$NETWORK.json" ]; then
        echo_info "Deployment addresses saved to: deployments/$NETWORK.json"
        echo ""
        echo "📋 Contract Addresses:"
        cat deployments/$NETWORK.json | jq -r '
            "FlashArbExecutor: " + .flashArbExecutor,
            "GaslessRelayer: " + .gaslessRelayer,
            "PositionRebalancer: " + .positionRebalancer
        '
    fi
    
    # Show next steps
    echo ""
    echo_info "Next Steps:"
    if [ "$NETWORK" = "mainnet" ]; then
        echo "1. Verify contracts: npx hardhat verify --network mainnet <ADDRESS>"
        echo "2. Fund GaslessRelayer for gas sponsorship"
        echo "3. Execute arbitrage via frontend or scripts"
        echo "4. Monitor opportunities and profits"
    else
        echo "1. Test the frontend: cd .. && npm run dev"
        echo "2. Verify contracts: npx hardhat verify --network sepolia <ADDRESS>"
        echo "3. If successful, deploy to mainnet"
    fi
else
    echo_error "Deployment failed! Check the error messages above."
    exit 1
fi

cd ..

