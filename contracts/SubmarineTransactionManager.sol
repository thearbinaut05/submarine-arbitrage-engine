 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title SubmarineTransactionManager
 * @notice Enables gasless submarine transactions with commit-reveal scheme
 * @dev Supports MEV protection and gas sponsorship for contract deployments
 */
contract SubmarineTransactionManager {
    // State
    address public owner;
    mapping(bytes32 => uint256) public commitRevealTimers;
    mapping(bytes32 => bool) public executedTransactions;
    mapping(address => bool) public authorizedDeployers;
    mapping(bytes32 => bytes32) public commitments;
    
    // Events
    event TransactionCommitted(
        bytes32 indexed commitment,
        address indexed sender,
        uint256 revealDeadline
    );
    
    event TransactionRevealed(
        bytes32 indexed commitment,
        address indexed target,
        bytes data,
        bool success
    );
    
    event ContractDeployed(
        bytes32 indexed commitment,
        address indexed deployedAddress,
        bytes bytecode
    );
    
    event DeployerAuthorized(address indexed deployer, bool authorized);
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier onlyAuthorized() {
        require(
            authorizedDeployers[msg.sender] || msg.sender == owner,
            "Not authorized"
        );
        _;
    }
    
    // Constructor
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @notice Commit to a future transaction (hashed)
     * @param commitment The keccak256 hash of (target, data, salt)
     * @param revealDeadline Time by which the transaction must be revealed
     */
    function commit(
        bytes32 commitment,
        uint256 revealDeadline
    ) external payable {
        require(
            commitRevealTimers[commitment] == 0,
            "Commitment already exists"
        );
        require(
            revealDeadline > block.timestamp,
            "Invalid deadline"
        );
        
        commitRevealTimers[commitment] = revealDeadline;
        commitments[commitment] = commitment;
        
        emit TransactionCommitted(commitment, msg.sender, revealDeadline);
    }
    
    /**
     * @notice Commit with custom salt for CREATE2 deployments
     * @param commitmentHash The hash of transaction details
     * @param salt Additional salt for uniqueness
     * @param revealDeadline Time by which the transaction must be revealed
     */
    function commitWithSalt(
        bytes32 commitmentHash,
        bytes32 salt,
        uint256 revealDeadline
    ) external payable {
        bytes32 combinedCommitment = keccak256(
            abi.encodePacked(commitmentHash, salt)
        );
        
        require(
            commitRevealTimers[combinedCommitment] == 0,
            "Commitment already exists"
        );
        
        commitRevealTimers[combinedCommitment] = revealDeadline;
        commitments[combinedCommitment] = commitmentHash;
        
        emit TransactionCommitted(combinedCommitment, msg.sender, revealDeadline);
    }
    
    /**
     * @notice Reveal and execute a committed transaction
     * @param target The target contract address (address(0) for deployment)
     * @param data The calldata to execute
     * @param salt Salt used for CREATE2 (if deploying)
     * @param from Original committer address
     */
    function revealAndExecute(
        address target,
        bytes calldata data,
        bytes32 salt,
        address from
    ) external onlyAuthorized returns (bool success, bytes memory returnData) {
        // Reconstruct commitment
        bytes32 reconstructedCommitment = keccak256(
            abi.encodePacked(target, keccak256(data), salt)
        );
        
        // Verify commitment exists and not expired
        uint256 deadline = commitRevealTimers[reconstructedCommitment];
        require(deadline != 0, "Commitment not found");
        require(block.timestamp <= deadline, "Reveal deadline passed");
        
        // Mark as executed
        delete commitRevealTimers[reconstructedCommitment];
        executedTransactions[reconstructedCommitment] = true;
        
        // Execute the transaction
        if (target == address(0)) {
            // Contract deployment via CREATE2
            address deployedAddress = _deployCreate2(data, salt);
            
            emit ContractDeployed(reconstructedCommitment, deployedAddress, data);
            
            return (true, abi.encode(deployedAddress));
        } else {
            // Regular transaction
            (success, returnData) = target.call{value: msg.value}(data);
            
            emit TransactionRevealed(reconstructedCommitment, target, data, success);
        }
    }
    
    /**
     * @notice Direct gasless deployment for authorized deployers
     * @param bytecode The contract bytecode
     * @param salt Salt for CREATE2 address determination
     */
    function deployWithGasSponsorship(
        bytes calldata bytecode,
        bytes32 salt
    ) external onlyAuthorized returns (address deployedAddress) {
        require(
            bytecode.length > 0,
            "No bytecode provided"
        );
        
        // Use CREATE2 for deterministic addresses
        assembly {
            deployedAddress := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        
        require(
            deployedAddress != address(0),
            "Deployment failed"
        );
        
        emit ContractDeployed(
            keccak256(abi.encodePacked(bytecode, salt)),
            deployedAddress,
            bytecode
        );
    }
    
    /**
     * @notice Execute meta-transaction on behalf of user
     * @param from User's address
     * @param target Target contract
     * @param data Calldata
     * @param deadline Transaction deadline
     * @param v Signature v
     * @param r Signature r
     * @param s Signature s
     */
    function executeMetaTransaction(
        address from,
        address target,
        bytes calldata data,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external onlyAuthorized returns (bool success, bytes memory returnData) {
        require(
            block.timestamp <= deadline,
            "Transaction expired"
        );
        
        // Verify signature using EIP-712
        bytes32 domainSeparator = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,uint256 chainId,address verifyingContract)"),
                keccak256("SubmarineTransactionManager"),
                block.chainid,
                address(this)
            )
        );
        
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("MetaTransaction(address from,address target,bytes data,uint256 nonce,uint256 deadline)"),
                from,
                target,
                keccak256(data),
                0, // nonce tracked separately
                deadline
            )
        );
        
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", domainSeparator, structHash)
        );
        
        address signer = ecrecover(digest, v, r, s);
        require(signer == from, "Invalid signature");
        
        // Execute
        (success, returnData) = target.call{value: msg.value}(data);
    }
    
    /**
     * @notice Authorize a deployer for gasless deployments
     */
    function authorizeDeployer(address deployer, bool authorized) external onlyOwner {
        authorizedDeployers[deployer] = authorized;
        emit DeployerAuthorized(deployer, authorized);
    }
    
    /**
     * @notice Withdraw collected funds
     */
    function withdrawETH(uint256 amount) external onlyOwner {
        payable(owner).transfer(amount);
    }
    
    /**
     * @notice Withdraw ERC20 tokens
     */
    function withdrawToken(address token, uint256 amount) external onlyOwner {
        (bool success, ) = token.call(
            abi.encodeWithSignature("transfer(address,uint256)", owner, amount)
        );
        require(success, "Transfer failed");
    }
    
    /**
     * @notice Check if a commitment is valid and not expired
     */
    function isCommitmentValid(bytes32 commitment) external view returns (bool) {
        return commitRevealTimers[commitment] > block.timestamp;
    }
    
    /**
     * @notice Internal CREATE2 deployment
     */
    function _deployCreate2(
        bytes calldadata bytecode,
        bytes32 salt
    ) internal returns (address deployedAddress) {
        assembly {
            deployedAddress := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
    }
    
    receive() external payable {}
}

